import { useEffect, useMemo, useState } from "react";
import {
  calcAutoApy,
  networkOptions,
  positionTypeOptions,
  riskOptions,
  type Position,
  type PositionInput
} from "@defi/shared";
import {
  formatDateTimeLocal,
  toDateTimeLocalValue,
  toStorageDateTime
} from "../utils/datetime";

interface PositionModalProps {
  open: boolean;
  initialValue?: Position | null;
  onClose: () => void;
  onSubmit: (value: PositionInput) => Promise<void>;
}

const CUSTOM_SELECT_VALUE = "__custom__";

type PositionFormState = Omit<
  PositionInput,
  "deposited" | "current_value" | "apy" | "realized_yield"
> & {
  deposited: string;
  current_value: string;
  apy: string;
  realized_yield: string;
};

const blankPosition: PositionFormState = {
  network: "Ethereum",
  protocol: "",
  type: "LP",
  assets: "",
  deposited: "",
  current_value: "",
  apy: "0",
  realized_yield: "",
  entry_date: formatDateTimeLocal(new Date()),
  risk: "medium",
  notes: ""
};

function parseMoneyInput(value: string): number {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return 0;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isListedValue(options: readonly string[], value: string): boolean {
  return options.includes(value);
}

export function PositionModal({
  open,
  initialValue,
  onClose,
  onSubmit
}: PositionModalProps) {
  const [form, setForm] = useState<PositionFormState>(blankPosition);
  const [submitting, setSubmitting] = useState(false);
  const [sameAsDeposited, setSameAsDeposited] = useState(true);
  const [customNetwork, setCustomNetwork] = useState(false);
  const [customType, setCustomType] = useState(false);

  useEffect(() => {
    if (initialValue) {
      const deposited = String(initialValue.deposited ?? "");
      const currentValue = String(initialValue.current_value ?? "");
      setForm({
        id: initialValue.id,
        network: initialValue.network,
        protocol: initialValue.protocol,
        type: initialValue.type,
        assets: initialValue.assets,
        deposited,
        current_value: currentValue,
        apy: String(initialValue.apy ?? 0),
        realized_yield: String(initialValue.realized_yield ?? ""),
        entry_date: toDateTimeLocalValue(initialValue.entry_date),
        risk: initialValue.risk,
        notes: initialValue.notes ?? ""
      });
      setSameAsDeposited(deposited === currentValue);
      setCustomNetwork(!isListedValue(networkOptions, initialValue.network));
      setCustomType(!isListedValue(positionTypeOptions, initialValue.type));
    } else {
      setForm(blankPosition);
      setSameAsDeposited(true);
      setCustomNetwork(false);
      setCustomType(false);
    }
  }, [initialValue, open]);

  useEffect(() => {
    if (sameAsDeposited && form.current_value !== form.deposited) {
      setForm((current) => ({
        ...current,
        current_value: current.deposited
      }));
    }
  }, [sameAsDeposited, form.current_value, form.deposited]);

  const payload = useMemo<PositionInput>(
    () => ({
      id: form.id,
      network: form.network,
      protocol: form.protocol,
      type: form.type,
      assets: form.assets,
      deposited: parseMoneyInput(form.deposited),
      current_value: parseMoneyInput(form.current_value),
      apy: parseMoneyInput(form.apy),
      realized_yield: parseMoneyInput(form.realized_yield),
      entry_date: toStorageDateTime(form.entry_date),
      risk: form.risk,
      notes: form.notes ?? ""
    }),
    [form]
  );

  const autoApy = useMemo(() => calcAutoApy(payload), [payload]);
  const networkSelectValue = customNetwork ? CUSTOM_SELECT_VALUE : form.network;
  const typeSelectValue = customType ? CUSTOM_SELECT_VALUE : form.type;

  if (!open) {
    return null;
  }

  const setValue = (field: keyof PositionFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialValue ? "Edit Position" : "Add Position"}</h2>
          <button className="button button-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="form-grid">
          <label>
            Network
            <select
              value={networkSelectValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (nextValue === CUSTOM_SELECT_VALUE) {
                  setCustomNetwork(true);
                  if (isListedValue(networkOptions, form.network)) {
                    setValue("network", "");
                  }
                  return;
                }

                setCustomNetwork(false);
                setValue("network", nextValue);
              }}
            >
              {networkOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value={CUSTOM_SELECT_VALUE}>Custom</option>
            </select>
          </label>
          {customNetwork ? (
            <label>
              Custom Network
              <input
                value={form.network}
                onChange={(event) => setValue("network", event.target.value)}
                placeholder="Enter network"
              />
            </label>
          ) : null}
          <label>
            Protocol
            <input
              value={form.protocol}
              onChange={(event) => setValue("protocol", event.target.value)}
            />
          </label>
          <label>
            Type
            <select
              value={typeSelectValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (nextValue === CUSTOM_SELECT_VALUE) {
                  setCustomType(true);
                  if (isListedValue(positionTypeOptions, form.type)) {
                    setValue("type", "");
                  }
                  return;
                }

                setCustomType(false);
                setValue("type", nextValue);
              }}
            >
              {positionTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value={CUSTOM_SELECT_VALUE}>Custom</option>
            </select>
          </label>
          {customType ? (
            <label>
              Custom Type
              <input
                value={form.type}
                onChange={(event) => setValue("type", event.target.value)}
                placeholder="Enter type"
              />
            </label>
          ) : null}
          <label>
            Assets (optional)
            <input
              value={form.assets}
              onChange={(event) => setValue("assets", event.target.value)}
              placeholder="Optional"
            />
          </label>
          <label>
            Deposited (USD)
            <input
              type="text"
              inputMode="decimal"
              value={form.deposited}
              placeholder="0"
              onChange={(event) => {
                const nextValue = event.target.value;
                setValue("deposited", nextValue);
              }}
            />
          </label>
          <label className="field-toggle">
            Current Value
            <span className="toggle-row">
              <input
                type="checkbox"
                checked={sameAsDeposited}
                onChange={(event) => setSameAsDeposited(event.target.checked)}
              />
              <span>Same as deposited</span>
            </span>
          </label>
          {!sameAsDeposited ? (
            <label>
              Current Value (USD)
              <input
                type="text"
                inputMode="decimal"
                value={form.current_value}
                placeholder="0"
                onChange={(event) => setValue("current_value", event.target.value)}
              />
            </label>
          ) : (
            <label>
              Current Value (USD)
              <input type="text" value={form.current_value} readOnly />
            </label>
          )}
          <label>
            APY (%) Auto
            <input
              type="text"
              value={String(autoApy)}
              readOnly
            />
          </label>
          <label>
            Realized Yield (USD)
            <input
              type="text"
              inputMode="decimal"
              value={form.realized_yield}
              placeholder="0"
              onChange={(event) => setValue("realized_yield", event.target.value)}
            />
          </label>
          <label>
            Entry Date & Time
            <input
              type="datetime-local"
              value={form.entry_date}
              onChange={(event) => setValue("entry_date", event.target.value)}
            />
          </label>
          <label>
            Risk
            <select
              value={form.risk}
              onChange={(event) => setValue("risk", event.target.value)}
            >
              {riskOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
                await onSubmit({
                  ...payload,
                  apy: autoApy
                });
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Saving..." : "Save Position"}
          </button>
        </div>
      </div>
    </div>
  );
}
