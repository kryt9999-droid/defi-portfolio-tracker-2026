import { useEffect, useState } from "react";
import {
  networkOptions,
  transactionActionOptions,
  type Position,
  type Transaction,
  type TransactionInput
} from "@defi/shared";
import {
  formatDateTimeLocal,
  toDateTimeLocalValue,
  toStorageDateTime
} from "../utils/datetime";

interface TransactionModalProps {
  open: boolean;
  positions: Position[];
  initialValue?: Transaction | null;
  onClose: () => void;
  onSubmit: (value: TransactionInput) => Promise<void>;
}

type TransactionFormState = Omit<TransactionInput, "amount_usd" | "quantity"> & {
  amount_usd: string;
  quantity: string;
};

function parseNumberInput(value: string): number {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

const blankTransaction: TransactionFormState = {
  position_id: null,
  network: "Ethereum",
  protocol: "",
  action: "deposit",
  asset: "",
  amount_usd: "",
  quantity: "",
  tx_date: formatDateTimeLocal(new Date()),
  notes: ""
};

export function TransactionModal({
  open,
  positions,
  initialValue,
  onClose,
  onSubmit
}: TransactionModalProps) {
  const [form, setForm] = useState<TransactionFormState>(blankTransaction);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialValue) {
      setForm({
        id: initialValue.id,
        position_id: initialValue.position_id ?? null,
        network: initialValue.network,
        protocol: initialValue.protocol,
        action: initialValue.action,
        asset: initialValue.asset,
        amount_usd: String(initialValue.amount_usd ?? ""),
        quantity: initialValue.quantity === null ? "" : String(initialValue.quantity),
        tx_date: toDateTimeLocalValue(initialValue.tx_date),
        notes: initialValue.notes ?? ""
      });
    } else {
      setForm(blankTransaction);
    }
  }, [initialValue, open]);

  useEffect(() => {
    const selectedPosition = positions.find((position) => position.id === form.position_id);
    if (!selectedPosition) {
      return;
    }

    setForm((current) => {
      const nextAsset =
        current.action === "claim" && (!current.asset || current.asset === "USD")
          ? "USD"
          : current.asset;

      if (
        current.network === selectedPosition.network &&
        current.protocol === selectedPosition.protocol &&
        current.asset === nextAsset
      ) {
        return current;
      }

      return {
        ...current,
        network: selectedPosition.network,
        protocol: selectedPosition.protocol,
        asset: nextAsset
      };
    });
  }, [form.action, form.position_id, positions]);

  if (!open) {
    return null;
  }

  const setValue = (
    field: keyof TransactionFormState,
    value: string | number | null
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const selectedPosition = positions.find((position) => position.id === form.position_id) ?? null;
  const requiresLinkedPosition = form.action === "claim";
  const isSaveDisabled =
    submitting ||
    parseNumberInput(form.amount_usd) <= 0 ||
    (requiresLinkedPosition && !selectedPosition);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialValue ? "Edit Transaction" : "Add Transaction"}</h2>
          <button className="button button-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="form-grid">
          <label>
            Position
            <select
              value={form.position_id ?? ""}
              onChange={(event) => {
                setError("");
                setValue("position_id", event.target.value || null);
              }}
            >
              <option value="">None</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.protocol || "Unnamed"} · {position.assets || position.network}
                </option>
              ))}
            </select>
          </label>
          <label>
            Network
            <select
              value={form.network}
              disabled={Boolean(selectedPosition)}
              onChange={(event) => setValue("network", event.target.value)}
            >
              {networkOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Protocol
            <input
              value={form.protocol}
              readOnly={Boolean(selectedPosition)}
              onChange={(event) => setValue("protocol", event.target.value)}
            />
          </label>
          <label>
            Action
            <select
              value={form.action}
              onChange={(event) => {
                const nextAction = event.target.value;
                setError("");
                setValue("action", nextAction);
                if (nextAction === "claim") {
                  setValue("asset", "USD");
                }
              }}
            >
              {transactionActionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Asset
            <input
              value={form.asset}
              readOnly={form.action === "claim"}
              onChange={(event) => setValue("asset", event.target.value)}
              placeholder="ETH"
            />
          </label>
          <label>
            Amount (USD)
            <input
              type="text"
              inputMode="decimal"
              value={form.amount_usd}
              placeholder="0"
              onChange={(event) => setValue("amount_usd", event.target.value)}
            />
          </label>
          <label>
            Quantity
            <input
              type="text"
              inputMode="decimal"
              value={form.quantity}
              placeholder="0"
              onChange={(event) => setValue("quantity", event.target.value)}
            />
          </label>
          <label>
            Transaction Date & Time
            <input
              type="datetime-local"
              value={form.tx_date}
              onChange={(event) => setValue("tx_date", event.target.value)}
            />
          </label>
          <label className="form-span">
            Notes
            <textarea
              rows={4}
              value={form.notes ?? ""}
              onChange={(event) => setValue("notes", event.target.value)}
            />
          </label>
        </div>

        {requiresLinkedPosition ? (
          <p className="error-text">
            Yield (`claim`) can only be saved with a linked position.
          </p>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}

        <div className="modal-actions">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={isSaveDisabled}
            onClick={async () => {
              if (requiresLinkedPosition && !selectedPosition) {
                setError("Select a position before saving yield.");
                return;
              }

              setSubmitting(true);
              try {
                await onSubmit({
                  ...form,
                  network: selectedPosition?.network ?? form.network,
                  protocol: selectedPosition?.protocol ?? form.protocol,
                  asset: form.action === "claim" ? "USD" : form.asset,
                  amount_usd: parseNumberInput(form.amount_usd),
                  quantity: form.quantity.trim() ? parseNumberInput(form.quantity) : null,
                  tx_date: toStorageDateTime(form.tx_date)
                });
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Saving..." : initialValue ? "Save Changes" : "Save Transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}
