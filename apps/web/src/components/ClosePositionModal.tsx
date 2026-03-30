import { useEffect, useMemo, useState } from "react";
import {
  calcDerivedCurrentValue,
  calcGrossInvestedCapital,
  calcProjectedClosePnl,
  formatCurrency,
  type Position,
  type Transaction
} from "@defi/shared";
import { formatDateTimeLocal, toStorageDateTime } from "../utils/datetime";

interface ClosePositionModalProps {
  open: boolean;
  position: Position | null;
  transactions: Transaction[];
  onClose: () => void;
  onSubmit: (txDate: string) => Promise<void>;
}

export function ClosePositionModal({
  open,
  position,
  transactions,
  onClose,
  onSubmit
}: ClosePositionModalProps) {
  const [txDate, setTxDate] = useState(formatDateTimeLocal(new Date()));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTxDate(formatDateTimeLocal(new Date()));
    }
  }, [open]);

  const preview = useMemo(() => {
    if (!position) {
      return {
        closeAmount: 0,
        invested: 0,
        realizedPnl: 0
      };
    }

    const effectiveAt = toStorageDateTime(txDate);

    return {
      closeAmount: calcDerivedCurrentValue(position, transactions, effectiveAt),
      invested: calcGrossInvestedCapital(position, transactions, effectiveAt),
      realizedPnl: calcProjectedClosePnl(position, transactions, effectiveAt)
    };
  }, [position, transactions, txDate]);

  if (!open || !position) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Close Position</h2>
          <button className="button button-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="panel close-preview-panel">
          <p className="eyebrow">Preview</p>
          <h3>{position.protocol || position.network}</h3>
          <div className="close-preview-grid">
            <article className="stat-card compact-stat">
              <p>Close Amount</p>
              <strong>{formatCurrency(preview.closeAmount)}</strong>
            </article>
            <article className="stat-card compact-stat">
              <p>Total Invested</p>
              <strong>{formatCurrency(preview.invested)}</strong>
            </article>
            <article className="stat-card compact-stat">
              <p>Realized P&amp;L</p>
              <strong className={preview.realizedPnl >= 0 ? "positive" : "negative"}>
                {formatCurrency(preview.realizedPnl)}
              </strong>
            </article>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Close Date & Time
            <input
              type="datetime-local"
              value={txDate}
              onChange={(event) => setTxDate(event.target.value)}
            />
          </label>
        </div>

        <p>
          This will create a withdrawal for the previewed close amount and move the
          strategy into closed reporting.
        </p>

        <div className="modal-actions">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onSubmit(toStorageDateTime(txDate));
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Closing..." : "Confirm Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
