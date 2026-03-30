import { useMemo, useState } from "react";
import {
  calcCashflowAwarePnl,
  calcClosedPositionPnl,
  calcDerivedRealizedYield,
  calcGrossInvestedCapital,
  calcWithdrawnCapital,
  formatCurrency,
  financialTermMeta,
  positionEventMeta,
  transactionActionMeta,
  type Position,
  type PositionInput,
  type Transaction
} from "@defi/shared";
import { usePortfolio } from "../contexts/PortfolioContext";
import { PositionModal } from "../components/PositionModal";
import { AddCapitalModal } from "../components/AddCapitalModal";
import { ClosePositionModal } from "../components/ClosePositionModal";
import { PositionActionsMenu } from "../components/PositionActionsMenu";
import { EmptyState } from "../components/EmptyState";
import { MetricHint } from "../components/MetricHint";

const coinGeckoMap: Record<string, string> = {
  ETH: "ethereum",
  WETH: "weth",
  BTC: "bitcoin",
  WBTC: "wrapped-bitcoin",
  SOL: "solana",
  AVAX: "avalanche-2",
  BNB: "binancecoin",
  MATIC: "matic-network",
  POL: "matic-network",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  OP: "optimism",
  ARB: "arbitrum",
  AERO: "aerodrome-finance",
  JUP: "jupiter-exchange-solana"
};

function parseAssets(assets: string) {
  return assets
    .split(",")
    .map((entry) => entry.trim())
    .map((entry) => {
      const match = entry.match(/([\d.]+)\s+([A-Za-z0-9_-]+)/);
      if (!match) {
        return null;
      }

      return {
        quantity: Number(match[1]),
        symbol: match[2].toUpperCase()
      };
    })
    .filter((entry): entry is { quantity: number; symbol: string } => Boolean(entry));
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

async function fetchCurrentValue(assets: string): Promise<number> {
  const holdings = parseAssets(assets);
  if (holdings.length === 0) {
    throw new Error("Enter assets like `1.2 ETH, 500 USDC` to use price refresh.");
  }

  const ids = holdings
    .map((holding) => coinGeckoMap[holding.symbol])
    .filter(Boolean)
    .join(",");

  if (!ids) {
    throw new Error("No CoinGecko mapping found for the listed assets.");
  }

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
  );
  if (!response.ok) {
    throw new Error("CoinGecko price refresh failed.");
  }

  const payload = (await response.json()) as Record<string, { usd: number }>;
  return holdings.reduce((sum, holding) => {
    const id = coinGeckoMap[holding.symbol];
    const price = id ? payload[id]?.usd ?? 0 : 0;
    return sum + price * holding.quantity;
  }, 0);
}

function getPositionTitle(position: Position): string {
  return position.protocol || `${position.network} ${position.type}`;
}

type EventLogItem = {
  id: string;
  kind: string;
  label: string;
  tone: string;
  date: string;
  amount: number | null;
};

function buildPositionEventLog(position: Position, transactions: Transaction[]): EventLogItem[] {
  const events: EventLogItem[] = [
    {
      id: `${position.id}:opened`,
      kind: "opened",
      label: positionEventMeta.opened.label,
      tone: positionEventMeta.opened.tone,
      date: position.entry_date,
      amount: position.deposited
    },
    ...transactions
      .filter((transaction) => transaction.position_id === position.id)
      .map((transaction) => ({
        id: transaction.id,
        kind: transaction.action,
        label: transactionActionMeta[transaction.action]?.label ?? transaction.action,
        tone: transactionActionMeta[transaction.action]?.tone ?? "neutral",
        date: transaction.tx_date,
        amount: transaction.amount_usd
      }))
  ];

  if (position.closed_at) {
    events.push({
      id: `${position.id}:closed`,
      kind: "closed",
      label: positionEventMeta.closed.label,
      tone: positionEventMeta.closed.tone,
      date: position.closed_at,
      amount: null
    });
  }

  return events.sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
  );
}

export function PositionsPage() {
  const {
    addYield,
    closePosition,
    closedPositions,
    positions,
    removePosition,
    savePosition,
    storedClosedPositions,
    storedPositions,
    transactions
  } = usePortfolio();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [yieldPosition, setYieldPosition] = useState<Position | null>(null);
  const [closingPosition, setClosingPosition] = useState<Position | null>(null);
  const [actionsMenuId, setActionsMenuId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const sortedPositions = useMemo(
    () => [...positions].sort((left, right) => right.current_value - left.current_value),
    [positions]
  );
  const sortedClosedPositions = useMemo(
    () =>
      [...closedPositions].sort(
        (left, right) =>
          new Date(right.closed_at ?? 0).getTime() - new Date(left.closed_at ?? 0).getTime()
      ),
    [closedPositions]
  );
  const storedPositionsById = useMemo(
    () => new Map(storedPositions.map((position) => [position.id, position])),
    [storedPositions]
  );
  const storedClosedPositionsById = useMemo(
    () => new Map(storedClosedPositions.map((position) => [position.id, position])),
    [storedClosedPositions]
  );
  const activeReports = useMemo(
    () =>
      sortedPositions.map((position) => {
        const sourcePosition = storedPositionsById.get(position.id) ?? position;
        return {
          position,
          sourcePosition,
          netResult: calcCashflowAwarePnl(sourcePosition, transactions)
        };
      }),
    [sortedPositions, storedPositionsById, transactions]
  );
  const closedReports = useMemo(
    () =>
      sortedClosedPositions.map((position) => {
        const sourcePosition = storedClosedPositionsById.get(position.id) ?? position;
        const effectiveAt = sourcePosition.closed_at ?? undefined;
        return {
          position,
          sourcePosition,
          totalInvested: calcGrossInvestedCapital(sourcePosition, transactions, effectiveAt),
          withdrawn: calcWithdrawnCapital(sourcePosition, transactions, effectiveAt),
          realizedYield: calcDerivedRealizedYield(sourcePosition, transactions, effectiveAt),
          netResult: calcClosedPositionPnl(sourcePosition, transactions)
        };
      }),
    [sortedClosedPositions, storedClosedPositionsById, transactions]
  );
  const positionEventGroups = useMemo(() => {
    const allPositions = [...storedPositions, ...storedClosedPositions].sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    );

    return allPositions.map((position) => ({
      position,
      title: getPositionTitle(position),
      events: buildPositionEventLog(position, transactions)
    }));
  }, [storedClosedPositions, storedPositions, transactions]);
  const closedRealizedPnl = useMemo(
    () =>
      storedClosedPositions.reduce(
        (sum, position) => sum + calcClosedPositionPnl(position, transactions),
        0
      ),
    [storedClosedPositions, transactions]
  );

  if (positions.length === 0 && closedPositions.length === 0) {
    return (
      <>
        <EmptyState
          title="No DeFi positions tracked"
          description="Store LPs, lending positions, staking vaults, and wallets here. You can work offline and sync later."
          actionLabel="Add Position"
          onAction={() => setModalOpen(true)}
        />
        <PositionModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={savePosition}
        />
      </>
    );
  }

  return (
    <>
      <div className="page-stack">
        <section className="stats-grid">
          <article className="stat-card">
            <p>Status: Active Positions</p>
            <strong>{positions.length}</strong>
          </article>
          <article className="stat-card">
            <p>Status: Closed Positions</p>
            <strong>{closedPositions.length}</strong>
          </article>
          <article className="stat-card">
            <p>
              <MetricHint
                label="Active Current Value"
                description={financialTermMeta.currentValue.description}
                formula={financialTermMeta.currentValue.formula}
              />
            </p>
            <strong>{formatCurrency(sortedPositions.reduce((sum, item) => sum + item.current_value, 0))}</strong>
          </article>
          <article className="stat-card">
            <p>
              <MetricHint
                label="Closed Net Result"
                description={financialTermMeta.netResult.description}
                formula={financialTermMeta.netResult.formula}
              />
            </p>
            <strong className={closedRealizedPnl >= 0 ? "positive" : "negative"}>
              {formatCurrency(closedRealizedPnl)}
            </strong>
          </article>
        </section>

        <div className="section-actions">
          <div>
            <h3>Active Positions</h3>
            <p>Track active capital, live value, APY, and risk in one place.</p>
          </div>
          <button
            className="button button-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add Position
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="panel table-wrap">
          <table className="positions-table">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Assets</th>
                <th>Network</th>
                <th>Type</th>
                <th>Status</th>
                <th>
                  <MetricHint
                    label={financialTermMeta.totalInvested.label}
                    description={financialTermMeta.totalInvested.description}
                    formula={financialTermMeta.totalInvested.formula}
                  />
                </th>
                <th>
                  <MetricHint
                    label={financialTermMeta.currentValue.label}
                    description={financialTermMeta.currentValue.description}
                    formula={financialTermMeta.currentValue.formula}
                  />
                </th>
                <th>
                  <MetricHint
                    label={financialTermMeta.netResult.label}
                    description={financialTermMeta.netResult.description}
                    formula={financialTermMeta.netResult.formula}
                  />
                </th>
                <th>
                  <MetricHint
                    label={financialTermMeta.apy.label}
                    description={financialTermMeta.apy.description}
                    formula={financialTermMeta.apy.formula}
                  />
                </th>
                <th>Risk</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {activeReports.map(({ position, sourcePosition, netResult }) => (
                <tr key={position.id}>
                  <td className="text-cell" title={position.protocol || "—"}>
                    {position.protocol || "—"}
                  </td>
                  <td className="text-cell" title={position.assets || "—"}>
                    {position.assets || "—"}
                  </td>
                  <td>{position.network}</td>
                  <td>{position.type}</td>
                  <td>
                    <span className="status-pill active">Active</span>
                  </td>
                  <td>{formatCurrency(position.deposited)}</td>
                  <td>{formatCurrency(position.current_value)}</td>
                  <td className={netResult >= 0 ? "positive" : "negative"}>
                    {formatCurrency(netResult)}
                  </td>
                  <td>{position.apy.toFixed(2)}%</td>
                  <td>
                    <span className={`risk-pill ${position.risk}`}>{position.risk}</span>
                  </td>
                  <td className="actions-cell">
                    <div className="row-actions">
                      <button
                        className="button button-secondary"
                        onClick={() => setYieldPosition(position)}
                      >
                        + Yield
                      </button>
                      <PositionActionsMenu
                        open={actionsMenuId === position.id}
                        onToggle={() =>
                          setActionsMenuId((current) =>
                            current === position.id ? null : position.id
                          )
                        }
                        onClose={() => setActionsMenuId(null)}
                      >
                        <div className="action-menu-list">
                          <button
                            className="button button-secondary"
                            onClick={() => {
                              setError("");
                              setEditing(sourcePosition);
                              setModalOpen(true);
                              setActionsMenuId(null);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="button button-secondary"
                            disabled={refreshingId === position.id}
                            onClick={async () => {
                              setError("");
                              setRefreshingId(position.id);
                              try {
                                const currentValue = await fetchCurrentValue(position.assets);
                                const editablePosition = sourcePosition;
                                await savePosition({
                                  ...editablePosition,
                                  current_value: Number(currentValue.toFixed(2))
                                } satisfies PositionInput);
                              } catch (nextError) {
                                setError(
                                  nextError instanceof Error
                                    ? nextError.message
                                    : "Price refresh failed."
                                );
                              } finally {
                                setRefreshingId(null);
                                setActionsMenuId(null);
                              }
                            }}
                          >
                            {refreshingId === position.id ? "Refreshing..." : "Refresh Price"}
                          </button>
                          <button
                            className="button button-secondary"
                            onClick={() => {
                              setError("");
                              setClosingPosition(sourcePosition);
                              setActionsMenuId(null);
                            }}
                          >
                            Close
                          </button>
                          <button
                            className="button button-danger"
                            onClick={() => {
                              removePosition(position.id);
                              setActionsMenuId(null);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </PositionActionsMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel table-wrap">
          <div className="panel-header">
            <h3>Closed Positions</h3>
            <p>Review closed strategies, close times, and realized outcome.</p>
          </div>
          {sortedClosedPositions.length === 0 ? (
            <p>No closed positions yet.</p>
          ) : (
            <table className="positions-table">
              <thead>
                <tr>
                  <th>Protocol</th>
                  <th>Network</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Closed At</th>
                  <th>
                    <MetricHint
                      label={financialTermMeta.withdrawn.label}
                      description={financialTermMeta.withdrawn.description}
                      formula={financialTermMeta.withdrawn.formula}
                    />
                  </th>
                  <th>
                    <MetricHint
                      label={financialTermMeta.realizedYield.label}
                      description={financialTermMeta.realizedYield.description}
                      formula={financialTermMeta.realizedYield.formula}
                    />
                  </th>
                  <th>
                    <MetricHint
                      label={financialTermMeta.totalInvested.label}
                      description={financialTermMeta.totalInvested.description}
                      formula={financialTermMeta.totalInvested.formula}
                    />
                  </th>
                  <th>
                    <MetricHint
                      label={financialTermMeta.netResult.label}
                      description={financialTermMeta.netResult.description}
                      formula={financialTermMeta.netResult.formula}
                    />
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {closedReports.map(
                  ({ position, withdrawn, realizedYield, totalInvested, netResult }) => {
                  return (
                    <tr key={position.id}>
                      <td className="text-cell" title={position.protocol || "—"}>
                        {position.protocol || "—"}
                      </td>
                      <td>{position.network}</td>
                      <td>{position.type}</td>
                      <td>
                        <span className="status-pill closed">Closed</span>
                      </td>
                      <td>{formatDateTime(position.closed_at)}</td>
                      <td>{formatCurrency(withdrawn)}</td>
                      <td>{formatCurrency(realizedYield)}</td>
                      <td>{formatCurrency(totalInvested)}</td>
                      <td className={netResult >= 0 ? "positive" : "negative"}>
                        {formatCurrency(netResult)}
                      </td>
                    <td className="actions-cell">
                      <div className="inline-actions">
                        <button
                          className="button button-danger"
                          onClick={() => removePosition(position.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Position Event Log</h3>
              <p>Audit every opened, claimed, deposit, withdraw, and closed event in one place.</p>
            </div>
          </div>
          <div className="event-log-grid">
            {positionEventGroups.map(({ position, title, events }) => (
              <article className="event-card" key={position.id}>
                <div className="event-card-header">
                  <div>
                    <h4>{title}</h4>
                    <p>{position.network} · {position.type}</p>
                  </div>
                  <span className={`status-pill ${position.is_closed ? "closed" : "active"}`}>
                    {position.is_closed ? "Closed" : "Active"}
                  </span>
                </div>
                <div className="event-list">
                  {events.map((event) => (
                    <div className="event-item" key={event.id}>
                      <div className="event-main">
                        <span className={`event-badge ${event.tone}`}>{event.label}</span>
                        <span className="event-date">{formatDateTime(event.date)}</span>
                      </div>
                      <div className="event-meta">
                        {event.amount !== null ? formatCurrency(event.amount) : "Event"}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <PositionModal
        open={modalOpen}
        initialValue={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={savePosition}
      />
      <AddCapitalModal
        open={Boolean(yieldPosition)}
        onClose={() => setYieldPosition(null)}
        onSubmit={async (amountUsd, txDate) => {
          setError("");
          try {
            if (!yieldPosition) {
              throw new Error("Position not selected.");
            }
            await addYield(yieldPosition.id, amountUsd, txDate);
          } catch (nextError) {
            setError(
              nextError instanceof Error
                ? nextError.message
                : "Failed to add yield."
            );
          }
        }}
      />
      <ClosePositionModal
        open={Boolean(closingPosition)}
        position={closingPosition}
        transactions={transactions}
        onClose={() => setClosingPosition(null)}
        onSubmit={async (txDate) => {
          setError("");
          try {
            if (!closingPosition) {
              throw new Error("Position not selected.");
            }
            await closePosition(closingPosition.id, txDate);
          } catch (nextError) {
            setError(
              nextError instanceof Error
                ? nextError.message
                : "Failed to close position."
            );
          }
        }}
      />
    </>
  );
}
