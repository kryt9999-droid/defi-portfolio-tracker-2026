import { useEffect, useState } from "react";
import { formatDateTimeLocal, toStorageDateTime } from "../utils/datetime";

interface AddCapitalModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (amountUsd: number, txDate: string) => Promise<void>;
}

export function AddCapitalModal({
  open,
  onClose,
  onSubmit
}: AddCapitalModalProps) {
  const [amountUsd, setAmountUsd] = useState("");
  const [txDate, setTxDate] = useState(formatDateTimeLocal(new Date()));
  const [submitting, setSubmitting] = useState(false);

  const parsedAmountUsd = Number(amountUsd.replace(",", ".").trim() || "0");

  useEffect(() => {
    if (open) {
      setAmountUsd("");
      setTxDate(formatDateTimeLocal(new Date()));
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Yield</h2>
          <button className="button button-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="form-grid">
          <label>
            Amount (USD)
            <input
              type="text"
              inputMode="decimal"
              value={amountUsd}
              placeholder="0"
              onChange={(event) => setAmountUsd(event.target.value)}
            />
          </label>
          <label>
            Date & Time
            <input
              type="datetime-local"
              value={txDate}
              onChange={(event) => setTxDate(event.target.value)}
            />
          </label>
        </div>
        <p>
          This adds realized USD yield to the position, recalculates APY, and does
          not change invested capital.
        </p>
        <div className="modal-actions">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={submitting || !Number.isFinite(parsedAmountUsd) || parsedAmountUsd <= 0}
            onClick={async () => {
              setSubmitting(true);
              try {
                await onSubmit(parsedAmountUsd, toStorageDateTime(txDate));
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Adding..." : "Add Yield"}
          </button>
        </div>
      </div>
    </div>
  );
}
