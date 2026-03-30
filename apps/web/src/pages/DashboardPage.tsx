import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
  XAxis,
  YAxis
} from "recharts";
import { useMemo } from "react";
import {
  calcDerivedCurrentValue,
  calcDerivedRealizedYield,
  calcNetInvestedCapital,
  financialTermMeta,
  formatCurrency,
  type Position,
  type Transaction
} from "@defi/shared";
import { usePortfolio } from "../contexts/PortfolioContext";
import { EmptyState } from "../components/EmptyState";
import { MetricHint } from "../components/MetricHint";

const chartColors = ["#29c18d", "#8bd6ff", "#f5ad56", "#e16a9f", "#6f7bf7", "#87d7c7"];

type HistoryEvent = {
  kind: "entry" | "close" | "transaction";
  title: string;
  amount?: number;
};

type HistoryPoint = {
  date: string;
  label: string;
  positions: number;
  portfolioValue: number;
  netPnl: number;
  realizedYield: number;
  deltaPortfolioValue: number;
  deltaNetPnl: number;
  deltaRealizedYield: number;
  eventCount: number;
  events: HistoryEvent[];
};

function buildBreakdown(items: Array<{ label: string; value: number }>) {
  const counts = items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.label] = (accumulator[item.label] ?? 0) + item.value;
    return accumulator;
  }, {});

  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function getPiePadding(dataLength: number): number {
  return dataLength > 1 ? 2 : 0;
}

function formatAxisDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit"
  }).format(parsed);
}

function formatEventAmount(amount?: number): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return null;
  }

  return formatCurrency(amount);
}

function buildHistoryEvents(
  effectiveAt: string,
  positions: Position[],
  transactions: Transaction[]
): HistoryEvent[] {
  const positionEvents = positions.flatMap((position) => {
    const protocolLabel = position.protocol || position.network;
    const entries: HistoryEvent[] = [];

    if (position.entry_date === effectiveAt) {
      entries.push({
        kind: "entry",
        title: `Opened ${protocolLabel} (${position.type})`,
        amount: position.deposited
      });
    }

    if (position.closed_at === effectiveAt) {
      entries.push({
        kind: "close",
        title: `Closed ${protocolLabel} (${position.type})`
      });
    }

    return entries;
  });

  const transactionEvents = transactions
    .filter((transaction) => transaction.tx_date === effectiveAt)
    .map<HistoryEvent>((transaction) => ({
      kind: "transaction",
      title: `${transaction.action.toUpperCase()} ${transaction.asset || "USD"}`,
      amount: transaction.amount_usd
    }));

  return [...positionEvents, ...transactionEvents];
}

function buildPortfolioHistorySeries(
  positions: Position[],
  transactions: Transaction[]
): HistoryPoint[] {
  if (positions.length === 0) {
    return [];
  }

  const timeline = new Set<string>();

  positions.forEach((position) => {
    timeline.add(position.entry_date);
    if (position.closed_at) {
      timeline.add(position.closed_at);
    }
  });

  transactions.forEach((transaction) => {
    timeline.add(transaction.tx_date);
  });

  timeline.add(new Date().toISOString());

  const sortedDates = [...timeline]
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  return sortedDates.map((date, index) => {
    const effectiveAt = date.toISOString();
    const activePositions = positions.filter((position) => {
      const entryDate = new Date(position.entry_date);
      if (Number.isNaN(entryDate.getTime()) || entryDate.getTime() > date.getTime()) {
        return false;
      }

      if (!position.closed_at) {
        return true;
      }

      const closedAt = new Date(position.closed_at);
      if (Number.isNaN(closedAt.getTime())) {
        return true;
      }

      return closedAt.getTime() > date.getTime();
    });

    const trackedPositions = positions.filter((position) => {
      const entryDate = new Date(position.entry_date);
      return !Number.isNaN(entryDate.getTime()) && entryDate.getTime() <= date.getTime();
    });

    const portfolioValue = activePositions.reduce(
      (sum, position) => sum + calcDerivedCurrentValue(position, transactions, effectiveAt),
      0
    );
    const realizedYield = trackedPositions.reduce(
      (sum, position) => sum + calcDerivedRealizedYield(position, transactions, effectiveAt),
      0
    );
    const netPnl = trackedPositions.reduce(
      (sum, position) =>
        sum +
        (calcDerivedCurrentValue(position, transactions, effectiveAt) -
          calcNetInvestedCapital(position, transactions, effectiveAt)),
      0
    );
    const previousPoint = index > 0 ? sortedDates[index - 1] : null;
    const previousEffectiveAt = previousPoint?.toISOString();
    const previousPortfolioValue = previousEffectiveAt
      ? positions
          .filter((position) => {
            const entryDate = new Date(position.entry_date);
            if (
              !previousPoint ||
              Number.isNaN(entryDate.getTime()) ||
              entryDate.getTime() > previousPoint.getTime()
            ) {
              return false;
            }

            if (!position.closed_at) {
              return true;
            }

            const closedAt = new Date(position.closed_at);
            if (Number.isNaN(closedAt.getTime())) {
              return true;
            }

            return !previousPoint || closedAt.getTime() > previousPoint.getTime();
          })
          .reduce(
            (sum, position) =>
              sum + calcDerivedCurrentValue(position, transactions, previousEffectiveAt),
            0
          )
      : 0;
    const previousRealizedYield = previousEffectiveAt
      ? trackedPositions.reduce(
          (sum, position) => sum + calcDerivedRealizedYield(position, transactions, previousEffectiveAt),
          0
        )
      : 0;
    const previousNetPnl = previousEffectiveAt
      ? trackedPositions.reduce(
          (sum, position) =>
            sum +
            (calcDerivedCurrentValue(position, transactions, previousEffectiveAt) -
              calcNetInvestedCapital(position, transactions, previousEffectiveAt)),
          0
        )
      : 0;
    const events = buildHistoryEvents(effectiveAt, positions, transactions);

    return {
      date: effectiveAt,
      label: formatAxisDate(effectiveAt),
      positions: trackedPositions.length,
      portfolioValue,
      netPnl,
      realizedYield,
      deltaPortfolioValue: portfolioValue - previousPortfolioValue,
      deltaNetPnl: netPnl - previousNetPnl,
      deltaRealizedYield: realizedYield - previousRealizedYield,
      eventCount: events.length,
      events
    };
  });
}

function HistoryTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ payload: HistoryPoint }>;
}) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <strong>{new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(point.date))}</strong>
      <div className="chart-tooltip-grid">
        <span>Portfolio Value</span>
        <span>{formatCurrency(point.portfolioValue)}</span>
        <span>Net P&amp;L</span>
        <span>{formatCurrency(point.netPnl)}</span>
        <span>Realized Yield</span>
        <span>{formatCurrency(point.realizedYield)}</span>
      </div>
      <div className="chart-tooltip-grid">
        <span>Value Change</span>
        <span>{formatCurrency(point.deltaPortfolioValue)}</span>
        <span>P&amp;L Change</span>
        <span>{formatCurrency(point.deltaNetPnl)}</span>
        <span>Yield Change</span>
        <span>{formatCurrency(point.deltaRealizedYield)}</span>
      </div>
      {point.events.length > 0 ? (
        <div className="chart-tooltip-events">
          {point.events.map((event, index) => (
            <div key={`${event.title}-${index}`} className="chart-tooltip-event">
              <span>{event.title}</span>
              <span>{formatEventAmount(event.amount) ?? "Event"}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardPage() {
  const {
    closedPositions,
    positions,
    storedClosedPositions,
    storedPositions,
    totalInvested,
    totalMonthlyYield,
    totalPnl,
    totalValue,
    transactions
  } = usePortfolio();

  const allStoredPositions = useMemo(
    () => [...storedPositions, ...storedClosedPositions],
    [storedClosedPositions, storedPositions]
  );
  const historySeries = useMemo(
    () => buildPortfolioHistorySeries(allStoredPositions, transactions),
    [allStoredPositions, transactions]
  );

  if (positions.length === 0 && closedPositions.length === 0) {
    return (
      <EmptyState
        title="No positions yet"
        description="Add your first DeFi position to see allocation charts, summary cards, and top holdings."
      />
    );
  }

  const networkData = buildBreakdown(
    positions.map((position) => ({
      label: position.network,
      value: position.current_value
    }))
  );
  const protocolData = buildBreakdown(
    positions.map((position) => ({
      label: position.protocol,
      value: position.current_value
    }))
  );
  const topPositions = [...positions]
    .sort((left, right) => right.current_value - left.current_value)
    .slice(0, 5);

  return (
    <div className="page-stack">
      <section className="stats-grid">
        <article className="stat-card">
          <p>
            <MetricHint
              label={financialTermMeta.currentValue.label}
              description={financialTermMeta.currentValue.description}
              formula={financialTermMeta.currentValue.formula}
            />
          </p>
          <strong>{formatCurrency(totalValue)}</strong>
        </article>
        <article className="stat-card">
          <p>
            <MetricHint
              label={financialTermMeta.totalInvested.label}
              description={financialTermMeta.totalInvested.description}
              formula={financialTermMeta.totalInvested.formula}
            />
          </p>
          <strong>{formatCurrency(totalInvested)}</strong>
        </article>
        <article className="stat-card">
          <p>
            <MetricHint
              label={financialTermMeta.netResult.label}
              description={financialTermMeta.netResult.description}
              formula={financialTermMeta.netResult.formula}
            />
          </p>
          <strong className={totalPnl >= 0 ? "positive" : "negative"}>
            {formatCurrency(totalPnl)}
          </strong>
        </article>
        <article className="stat-card">
          <p>
            <MetricHint
              label={financialTermMeta.projectedMonthlyIncome.label}
              description={financialTermMeta.projectedMonthlyIncome.description}
              formula={financialTermMeta.projectedMonthlyIncome.formula}
            />
          </p>
          <strong>{formatCurrency(totalMonthlyYield)}</strong>
        </article>
      </section>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>Portfolio History</h3>
            <p>All positions, realized income, and current portfolio result across the full timeline.</p>
          </div>
        </div>
        <div className="chart-wrap chart-tall">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={historySeries}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(244, 251, 248, 0.75)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => `$${Math.round(value)}`}
                tick={{ fill: "rgba(244, 251, 248, 0.75)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<HistoryTooltip />}
              />
              <Line
                type="monotone"
                dataKey="portfolioValue"
                name="portfolioValue"
                stroke="#8bd6ff"
                strokeWidth={3}
                dot={({ cx, cy, payload }) =>
                  payload.eventCount > 0 ? (
                    <circle cx={cx} cy={cy} r={4} fill="#8bd6ff" stroke="#07100d" strokeWidth={2} />
                  ) : (
                    <circle cx={cx} cy={cy} r={2} fill="#8bd6ff" />
                  )
                }
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="netPnl"
                name="netPnl"
                stroke="#29c18d"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="realizedYield"
                name="realizedYield"
                stroke="#f5ad56"
                strokeWidth={2}
                strokeDasharray="6 6"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <section className="two-column-grid">
        <article className="panel">
          <div className="panel-header">
            <h3>By Network</h3>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={networkData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={100}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={getPiePadding(networkData.length)}
                >
                  {networkData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel">
          <div className="panel-header">
            <h3>By Protocol</h3>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={protocolData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={100}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={getPiePadding(protocolData.length)}
                >
                  {protocolData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <article className="panel">
        <div className="panel-header">
          <h3>Top Positions</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Assets</th>
                <th>Network</th>
                <th>Current Value</th>
                <th>APY</th>
              </tr>
            </thead>
            <tbody>
              {topPositions.map((position) => (
                <tr key={position.id}>
                  <td>{position.protocol}</td>
                  <td>{position.assets}</td>
                  <td>{position.network}</td>
                  <td>{formatCurrency(position.current_value)}</td>
                  <td>{position.apy.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
