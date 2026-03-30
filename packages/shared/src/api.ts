import { createSupabaseClient, supabase } from "./supabase";
import type { Position, PositionInput, Transaction, TransactionInput } from "./types";

type SharedSupabaseClient = NonNullable<ReturnType<typeof createSupabaseClient>>;

type SingleWriteResult<T> = {
  select: (columns: string) => {
    single: () => Promise<{ data: T; error: Error | null }>;
  };
};

type DeleteResult = {
  eq: (column: string, value: string) => Promise<{ error: Error | null }>;
};

function getClient(client?: SharedSupabaseClient): SharedSupabaseClient {
  const resolved = client ?? supabase;
  if (!resolved) {
    throw new Error("Supabase client is not configured.");
  }

  return resolved;
}

function toFiniteNumber(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;

  return Number.isFinite(parsed) ? parsed : 0;
}

function toReadableError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  if (error && typeof error === "object") {
    const maybeError = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
      error_description?: unknown;
    };
    const parts = [
      maybeError.message,
      maybeError.details,
      maybeError.hint,
      maybeError.error_description,
      maybeError.code
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    if (parts.length > 0) {
      return new Error(parts.join(" | "));
    }

    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error("Unknown Supabase error.");
    }
  }

  return new Error("Unknown Supabase error.");
}

const positionMetaPrefix = "__defi_position_meta__";
const transactionMetaPrefix = "__defi_meta__";

type PositionMeta = {
  closed_at?: string | null;
};

type TransactionMeta = {
  position_id?: string | null;
  network?: string;
  protocol?: string;
};

function encodePositionNotes(position: PositionInput): string | null {
  const metadata: PositionMeta = {
    closed_at: position.closed_at ?? null
  };
  const userNotes = typeof position.notes === "string" ? position.notes.trim() : "";
  const encodedMeta = `${positionMetaPrefix}${JSON.stringify(metadata)}`;
  return userNotes ? `${encodedMeta}\n${userNotes}` : encodedMeta;
}

function decodePositionNotes(raw: unknown): {
  notes: string | null;
  metadata: PositionMeta;
} {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { notes: null, metadata: {} };
  }

  if (!raw.startsWith(positionMetaPrefix)) {
    return { notes: raw, metadata: {} };
  }

  const [firstLine = "", ...rest] = raw.split("\n");
  try {
    const metadata = JSON.parse(
      firstLine.replace(positionMetaPrefix, "")
    ) as PositionMeta;
    const notes = rest.join("\n").trim();
    return {
      notes: notes.length > 0 ? notes : null,
      metadata
    };
  } catch {
    return { notes: raw, metadata: {} };
  }
}

function normalizePositionRow(row: Record<string, unknown>): Position {
  const decodedNotes = decodePositionNotes(row.notes);
  const closedAt =
    row.closed_at === null || row.closed_at === undefined
      ? decodedNotes.metadata.closed_at ?? null
      : String(row.closed_at);

  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    network: String(row.network ?? "Other"),
    protocol: String(row.protocol ?? ""),
    type: String(row.type ?? "LP"),
    assets: String(row.assets ?? ""),
    deposited: toFiniteNumber(row.deposited),
    current_value: toFiniteNumber(row.current_value),
    apy: toFiniteNumber(row.apy),
    realized_yield: toFiniteNumber(row.realized_yield),
    entry_date: String(row.entry_date ?? row.created_at ?? new Date().toISOString()),
    risk: String(row.risk ?? "medium") as Position["risk"],
    notes: decodedNotes.notes,
    is_closed: Boolean(closedAt),
    closed_at: closedAt,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString())
  };
}

function encodeTransactionNotes(transaction: TransactionInput): string | null {
  const metadata: TransactionMeta = {
    position_id: transaction.position_id ?? null,
    network: transaction.network,
    protocol: transaction.protocol
  };
  const userNotes = typeof transaction.notes === "string" ? transaction.notes.trim() : "";
  const encodedMeta = `${transactionMetaPrefix}${JSON.stringify(metadata)}`;
  return userNotes ? `${encodedMeta}\n${userNotes}` : encodedMeta;
}

function decodeTransactionNotes(raw: unknown): {
  notes: string | null;
  metadata: TransactionMeta;
} {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { notes: null, metadata: {} };
  }

  if (!raw.startsWith(transactionMetaPrefix)) {
    return { notes: raw, metadata: {} };
  }

  const [firstLine = "", ...rest] = raw.split("\n");
  try {
    const metadata = JSON.parse(
      firstLine.replace(transactionMetaPrefix, "")
    ) as TransactionMeta;
    const notes = rest.join("\n").trim();
    return {
      notes: notes.length > 0 ? notes : null,
      metadata
    };
  } catch {
    return { notes: raw, metadata: {} };
  }
}

function normalizeTransactionRow(row: Record<string, unknown>): Transaction {
  const decodedNotes = decodeTransactionNotes(row.notes);
  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    position_id:
      row.position_id === null || row.position_id === undefined
        ? decodedNotes.metadata.position_id ?? null
        : String(row.position_id),
    network: String(row.network ?? decodedNotes.metadata.network ?? "Other"),
    protocol: String(row.protocol ?? decodedNotes.metadata.protocol ?? ""),
    action: String(row.action ?? "deposit") as Transaction["action"],
    asset: String(row.asset ?? ""),
    amount_usd: toFiniteNumber(row.amount_usd ?? row.amount),
    quantity:
      row.quantity === null || row.quantity === undefined
        ? null
        : toFiniteNumber(row.quantity),
    tx_date: String(row.tx_date ?? row.date ?? row.created_at ?? new Date().toISOString()),
    notes: decodedNotes.notes,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString())
  };
}

function usesMissingColumn(error: Error, column: string): boolean {
  return (
    error.message.includes(`'${column}'`) &&
    error.message.toLowerCase().includes("column")
  );
}

function extractMissingColumn(error: Error): string | null {
  const match = error.message.match(/'([^']+)' column/i);
  return match?.[1] ?? null;
}

function buildTransactionPayload(
  transaction: TransactionInput,
  amountField: "amount_usd" | "amount"
): Record<string, unknown> {
  const { amount_usd, ...rest } = transaction;
  return {
    ...rest,
    [amountField]: amount_usd,
    position_id: transaction.position_id ?? null,
    quantity: transaction.quantity ?? null,
    notes: encodeTransactionNotes(transaction)
  };
}

function remapMissingTransactionColumn(
  payload: Record<string, unknown>,
  missingColumn: string
): Record<string, unknown> {
  const nextPayload = { ...payload };

  if (missingColumn === "amount_usd" && "amount_usd" in nextPayload) {
    nextPayload.amount = nextPayload.amount_usd;
  }

  if (missingColumn === "tx_date" && "tx_date" in nextPayload) {
    nextPayload.date = nextPayload.tx_date;
  }

  delete nextPayload[missingColumn];
  return nextPayload;
}

export async function getPositions(client?: SharedSupabaseClient): Promise<Position[]> {
  const { data, error } = await getClient(client)
    .from("positions")
    .select("*")
    .order("current_value", { ascending: false });

  if (error) {
    throw toReadableError(error);
  }

  return (data ?? []).map((row) => normalizePositionRow(row as Record<string, unknown>));
}

export async function upsertPosition(
  position: PositionInput,
  client?: SharedSupabaseClient
): Promise<Position> {
  const { is_closed, closed_at, ...rest } = position;
  const payload = {
    ...rest,
    notes: encodePositionNotes({ ...position, is_closed, closed_at })
  };
  const positionsTable = getClient(client).from("positions") as unknown as {
    upsert: (values: Record<string, unknown>) => SingleWriteResult<Record<string, unknown>>;
  };
  const { data, error } = await positionsTable
    .upsert(payload)
    .select("*")
    .single();

  if (error) {
    throw toReadableError(error);
  }

  return normalizePositionRow((data ?? {}) as Record<string, unknown>);
}

export async function deletePosition(id: string, client?: SharedSupabaseClient): Promise<void> {
  const positionsTable = getClient(client).from("positions") as unknown as {
    delete: () => DeleteResult;
  };
  const { error } = await positionsTable.delete().eq("id", id);

  if (error) {
    throw toReadableError(error);
  }
}

export async function getTransactions(
  client?: SharedSupabaseClient
): Promise<Transaction[]> {
  const { data, error } = await getClient(client)
    .from("transactions")
    .select("*")
    .order("tx_date", { ascending: false });

  if (error) {
    throw toReadableError(error);
  }

  return (data ?? []).map((row) => normalizeTransactionRow(row as Record<string, unknown>));
}

export async function addTransaction(
  transaction: TransactionInput,
  client?: SharedSupabaseClient
): Promise<Transaction> {
  const transactionsTable = getClient(client).from("transactions") as unknown as {
    upsert: (values: Record<string, unknown>) => SingleWriteResult<Record<string, unknown>>;
  };
  let payload = buildTransactionPayload(transaction, "amount_usd");
  let data: Record<string, unknown> | undefined;
  let error: Error | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await transactionsTable.upsert(payload).select("*").single();
    data = response.data;
    error = response.error;

    if (!error) {
      break;
    }

    const readableError = toReadableError(error);
    const missingColumn = extractMissingColumn(readableError);

    if (!missingColumn) {
      error = readableError;
      break;
    }

    payload = remapMissingTransactionColumn(payload, missingColumn);
    error = readableError;
  }

  if (error) {
    throw toReadableError(error);
  }

  return normalizeTransactionRow(data ?? {});
}

export async function deleteTransaction(
  id: string,
  client?: SharedSupabaseClient
): Promise<void> {
  const transactionsTable = getClient(client).from("transactions") as unknown as {
    delete: () => DeleteResult;
  };
  const { error } = await transactionsTable.delete().eq("id", id);

  if (error) {
    throw toReadableError(error);
  }
}
