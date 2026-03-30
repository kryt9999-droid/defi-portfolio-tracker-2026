import { formatCurrency, transactionActionMeta } from "@defi/shared";
import { useState } from "react";
import { usePortfolio } from "../contexts/PortfolioContext";
import { TransactionModal } from "../components/TransactionModal";
import { EmptyState } from "../components/EmptyState";
import type { Transaction } from "@defi/shared";

function formatDateTime(value: string): string {
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

export function TransactionsPage() {
  const { positions, removeTransaction, saveTransaction, transactions } = usePortfolio();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  if (transactions.length === 0) {
    return (
      <>
        <EmptyState
          title="No transactions logged"
          description="Keep a ledger of deposits, withdrawals, claims, and rebalances to understand cash flow across strategies."
          actionLabel="Add Transaction"
          onAction={() => setModalOpen(true)}
        />
        <TransactionModal
          open={modalOpen}
          positions={positions}
          initialValue={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={saveTransaction}
        />
      </>
    );
  }

  return (
    <>
      <div className="page-stack">
        <div className="section-actions">
          <div>
            <h3>Transaction Log</h3>
            <p>Record deposits, claims, and exits, then export the history as JSON anytime.</p>
          </div>
          <button
            className="button button-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Add Transaction
          </button>
        </div>

        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Position</th>
                <th>Action</th>
                <th>Asset</th>
                <th>Protocol</th>
                <th>Network</th>
                <th>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{formatDateTime(transaction.tx_date)}</td>
                  <td>{transaction.protocol || transaction.network}</td>
                  <td>
                    <span className={`event-badge ${transactionActionMeta[transaction.action]?.tone ?? "neutral"}`}>
                      {transactionActionMeta[transaction.action]?.label ?? transaction.action}
                    </span>
                  </td>
                  <td>{transaction.asset}</td>
                  <td>{transaction.protocol}</td>
                  <td>{transaction.network}</td>
                  <td>{formatCurrency(transaction.amount_usd)}</td>
                  <td>
                    <div className="inline-actions">
                      <button
                        className="button button-secondary"
                        onClick={() => {
                          setEditing(transaction);
                          setModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="button button-danger"
                        onClick={() => removeTransaction(transaction.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionModal
        open={modalOpen}
        positions={positions}
        initialValue={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={saveTransaction}
      />
    </>
  );
}
