import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import {
  addTransaction,
  calcAutoApy,
  calcCashflowAwareApy,
  calcCashflowAwarePnl,
  calcDerivedCurrentValue,
  calcDerivedRealizedYield,
  calcNetInvestedCapital,
  calcMonthlyYield,
  toFiniteNumber,
  deletePosition,
  deleteTransaction,
  getPositions,
  getTransactions,
  upsertPosition,
  type Position,
  type PositionInput,
  type Transaction,
  type TransactionInput
} from "@defi/shared";
import { webSupabase } from "../supabase";
import { useAuth } from "./AuthContext";

type PendingAction =
  | { id: string; kind: "upsert-position"; payload: PositionInput }
  | { id: string; kind: "delete-position"; payload: { id: string } }
  | { id: string; kind: "add-transaction"; payload: TransactionInput }
  | { id: string; kind: "delete-transaction"; payload: { id: string } };

interface PortfolioContextValue {
  positions: Position[];
  storedPositions: Position[];
  closedPositions: Position[];
  storedClosedPositions: Position[];
  transactions: Transaction[];
  pendingCount: number;
  syncError: string;
  loading: boolean;
  refreshing: boolean;
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalMonthlyYield: number;
  refreshAll: () => Promise<void>;
  clearPendingActions: () => void;
  savePosition: (position: PositionInput) => Promise<void>;
  addYield: (positionId: string, amountUsd: number, txDate: string) => Promise<void>;
  closePosition: (positionId: string, txDate?: string) => Promise<void>;
  removePosition: (id: string) => Promise<void>;
  saveTransaction: (transaction: TransactionInput) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  exportData: () => string;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

const appPrefix = "defi-tracker:web";

function normalizePosition(position: Position): Position {
  return {
    ...position,
    protocol: position.protocol ?? "",
    assets: position.assets ?? "",
    deposited: toFiniteNumber(position.deposited),
    current_value: toFiniteNumber(position.current_value),
    apy: toFiniteNumber(position.apy),
    realized_yield: toFiniteNumber(position.realized_yield),
    notes: position.notes ?? null,
    is_closed: Boolean(position.is_closed ?? position.closed_at),
    closed_at: position.closed_at ?? null
  };
}

function normalizeTransaction(transaction: Transaction): Transaction {
  return {
    ...transaction,
    amount_usd: toFiniteNumber(transaction.amount_usd),
    quantity:
      transaction.quantity === null ? null : toFiniteNumber(transaction.quantity),
    notes: transaction.notes ?? null
  };
}

function parseStored<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getReadableErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeError = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
      error_description?: unknown;
      error?: unknown;
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
      return parts.join(" | ");
    }

    if (typeof maybeError.error === "string" && maybeError.error.trim().length > 0) {
      return maybeError.error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown sync error.";
    }
  }

  return "Unknown sync error.";
}

function isLikelyNetworkError(error: unknown): boolean {
  if (!navigator.onLine) {
    return true;
  }

  const message = getReadableErrorMessage(error).toLowerCase();
  return (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("network request failed") ||
    message.includes("network error") ||
    message.includes("load failed") ||
    message.includes("internet connection")
  );
}

export function PortfolioProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [syncError, setSyncError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pendingRef = useRef<PendingAction[]>([]);

  const getKey = useCallback(
    (suffix: string) => `${appPrefix}:${userId ?? "guest"}:${suffix}`,
    [userId]
  );

  useEffect(() => {
    pendingRef.current = pendingActions;
  }, [pendingActions]);

  useEffect(() => {
    if (!userId) {
      setPositions([]);
      setTransactions([]);
      setPendingActions([]);
      setSyncError("");
      setLoading(false);
      return;
    }

    setPositions(
      parseStored<Position[]>(localStorage.getItem(getKey("positions")), []).map(
        normalizePosition
      )
    );
    setTransactions(
      parseStored<Transaction[]>(localStorage.getItem(getKey("transactions")), []).map(
        normalizeTransaction
      )
    );
    setPendingActions(
      parseStored<PendingAction[]>(localStorage.getItem(getKey("pending")), [])
    );
    setLoading(false);
  }, [getKey, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    localStorage.setItem(getKey("positions"), JSON.stringify(positions));
    localStorage.setItem(getKey("transactions"), JSON.stringify(transactions));
    localStorage.setItem(getKey("pending"), JSON.stringify(pendingActions));
  }, [getKey, pendingActions, positions, transactions, userId]);

  const flushQueue = useCallback(async () => {
    if (!userId || !navigator.onLine || pendingRef.current.length === 0) {
      return;
    }

    for (const action of [...pendingRef.current]) {
      try {
        if (action.kind === "upsert-position") {
          await upsertPosition(action.payload, webSupabase);
        }
        if (action.kind === "delete-position") {
          await deletePosition(action.payload.id, webSupabase);
        }
        if (action.kind === "add-transaction") {
          await addTransaction(action.payload, webSupabase);
        }
        if (action.kind === "delete-transaction") {
          await deleteTransaction(action.payload.id, webSupabase);
        }
        setPendingActions((current) => current.filter((item) => item.id !== action.id));
        setSyncError("");
      } catch (error) {
        setSyncError(getReadableErrorMessage(error));
        break;
      }
    }
  }, [userId]);

  const refreshAll = useCallback(async () => {
    if (!userId) {
      return;
    }

    if (!navigator.onLine) {
      return;
    }

    setRefreshing(true);
    try {
      await flushQueue();
      const [nextPositions, nextTransactions] = await Promise.all([
        getPositions(webSupabase),
        getTransactions(webSupabase)
      ]);
      setPositions(nextPositions.map(normalizePosition));
      setTransactions(nextTransactions.map(normalizeTransaction));
      setSyncError("");
    } finally {
      setRefreshing(false);
    }
  }, [flushQueue, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    refreshAll().finally(() => setLoading(false));

    const handleOnline = () => {
      refreshAll().catch(() => undefined);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [refreshAll, userId]);

  const queueAction = useCallback((action: Omit<PendingAction, "id">) => {
    setPendingActions((current) => [
      ...current,
      {
        ...action,
        id: crypto.randomUUID()
      } as PendingAction
    ]);
  }, []);

  const clearPendingActions = useCallback(() => {
    setPendingActions([]);
    setSyncError("");
  }, []);

  const savePosition = useCallback(
    async (position: PositionInput) => {
      const optimistic: Position = {
        id: position.id ?? crypto.randomUUID(),
        user_id: session?.user.id ?? "",
        created_at: position.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: position.notes ?? null,
        ...position,
        apy: calcAutoApy(position)
      };
      const normalizedOptimistic = normalizePosition(optimistic);

      setPositions((current) => {
        const exists = current.some((item) => item.id === normalizedOptimistic.id);
        return exists
          ? current.map((item) =>
              item.id === normalizedOptimistic.id ? normalizedOptimistic : item
            )
          : [normalizedOptimistic, ...current];
      });

      if (!navigator.onLine) {
        queueAction({ kind: "upsert-position", payload: normalizedOptimistic });
        setSyncError("Offline. Position queued for sync.");
        return;
      }

      try {
        const saved = normalizePosition(
          await upsertPosition(normalizedOptimistic, webSupabase)
        );
        setPositions((current) =>
          current.map((item) =>
            item.id === normalizedOptimistic.id ? saved : item
          )
        );
        setSyncError("");
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          queueAction({ kind: "upsert-position", payload: normalizedOptimistic });
          setSyncError("Network issue. Position queued for sync.");
          return;
        }

        setPositions((current) =>
          current.filter((item) => item.id !== normalizedOptimistic.id)
        );
        throw new Error(getReadableErrorMessage(error));
      }
    },
    [queueAction, session?.user.id]
  );

  const removePosition = useCallback(
    async (id: string) => {
      setPositions((current) => current.filter((item) => item.id !== id));

      if (!navigator.onLine) {
        queueAction({ kind: "delete-position", payload: { id } });
        setSyncError("Offline. Delete queued for sync.");
        return;
      }

      try {
        await deletePosition(id, webSupabase);
        setSyncError("");
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          queueAction({ kind: "delete-position", payload: { id } });
          setSyncError("Network issue. Delete queued for sync.");
          return;
        }

        throw new Error(getReadableErrorMessage(error));
      }
    },
    [queueAction]
  );

  const saveTransaction = useCallback(
    async (transaction: TransactionInput) => {
      const optimistic: Transaction = {
        id: transaction.id ?? crypto.randomUUID(),
        user_id: session?.user.id ?? "",
        created_at: transaction.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        position_id: transaction.position_id ?? null,
        quantity: transaction.quantity ?? null,
        notes: transaction.notes ?? null,
        ...transaction
      };

      setTransactions((current) => {
        const exists = current.some((item) => item.id === optimistic.id);
        return exists
          ? current.map((item) => (item.id === optimistic.id ? optimistic : item))
          : [optimistic, ...current];
      });

      if (!navigator.onLine) {
        queueAction({ kind: "add-transaction", payload: optimistic });
        setSyncError("Offline. Transaction queued for sync.");
        return;
      }

      try {
        const saved = normalizeTransaction(await addTransaction(optimistic, webSupabase));
        setTransactions((current) =>
          current.map((item) => (item.id === optimistic.id ? saved : item))
        );
        setSyncError("");
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          queueAction({ kind: "add-transaction", payload: optimistic });
          setSyncError("Network issue. Transaction queued for sync.");
          return;
        }

        setTransactions((current) =>
          current.filter((item) => item.id !== optimistic.id)
        );
        throw new Error(getReadableErrorMessage(error));
      }
    },
    [queueAction, session?.user.id]
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      setTransactions((current) => current.filter((item) => item.id !== id));

      if (!navigator.onLine) {
        queueAction({ kind: "delete-transaction", payload: { id } });
        setSyncError("Offline. Delete queued for sync.");
        return;
      }

      try {
        await deleteTransaction(id, webSupabase);
        setSyncError("");
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          queueAction({ kind: "delete-transaction", payload: { id } });
          setSyncError("Network issue. Delete queued for sync.");
          return;
        }

        throw new Error(getReadableErrorMessage(error));
      }
    },
    [queueAction]
  );

  const derivedPositions = useMemo(
    () =>
      positions.map((position) => ({
        ...position,
        deposited: calcNetInvestedCapital(position, transactions),
        current_value: calcDerivedCurrentValue(position, transactions),
        realized_yield: calcDerivedRealizedYield(position, transactions),
        apy: calcCashflowAwareApy(position, transactions)
      })),
    [positions, transactions]
  );

  const addYield = useCallback(
    async (positionId: string, amountUsd: number, txDate: string) => {
      const position = positions.find((item) => item.id === positionId);
      if (!position) {
        throw new Error("Position not found.");
      }

      const amount = toFiniteNumber(amountUsd);
      if (amount <= 0) {
        throw new Error("Yield amount must be greater than zero.");
      }

      await saveTransaction({
        position_id: position.id,
        network: position.network,
        protocol: position.protocol,
        action: "claim",
        asset: "USD",
        amount_usd: amount,
        quantity: amount,
        tx_date: txDate,
        notes: "Yield added"
      });
    },
    [positions, saveTransaction]
  );

  const closePosition = useCallback(
    async (positionId: string, txDate = new Date().toISOString()) => {
      const position = positions.find((item) => item.id === positionId);
      if (!position) {
        throw new Error("Position not found.");
      }

      if (position.is_closed) {
        throw new Error("Position is already closed.");
      }

      const currentValue = calcDerivedCurrentValue(position, transactions, txDate);
      if (currentValue > 0) {
        await saveTransaction({
          position_id: position.id,
          network: position.network,
          protocol: position.protocol,
          action: "withdraw",
          asset: "USD",
          amount_usd: currentValue,
          quantity: currentValue,
          tx_date: txDate,
          notes: "Position closed"
        });
      }

      await savePosition({
        ...position,
        is_closed: true,
        closed_at: txDate
      });
    },
    [positions, savePosition, saveTransaction, transactions]
  );

  const activePositions = useMemo(
    () => derivedPositions.filter((position) => !position.is_closed),
    [derivedPositions]
  );
  const closedPositions = useMemo(
    () => derivedPositions.filter((position) => position.is_closed),
    [derivedPositions]
  );
  const activeStoredPositions = useMemo(
    () => positions.filter((position) => !position.is_closed),
    [positions]
  );
  const storedClosedPositions = useMemo(
    () => positions.filter((position) => position.is_closed),
    [positions]
  );

  const value = useMemo<PortfolioContextValue>(
    () => ({
      positions: activePositions,
      storedPositions: activeStoredPositions,
      closedPositions,
      storedClosedPositions,
      transactions,
      pendingCount: pendingActions.length,
      syncError,
      loading,
      refreshing,
      totalValue: activePositions.reduce((sum, item) => sum + item.current_value, 0),
      totalInvested: activePositions.reduce((sum, item) => sum + item.deposited, 0),
      totalPnl: activeStoredPositions.reduce(
        (sum, item) => sum + calcCashflowAwarePnl(item, transactions),
        0
      ),
      totalMonthlyYield: activePositions.reduce(
        (sum, item) => sum + calcMonthlyYield(item),
        0
      ),
      refreshAll,
      clearPendingActions,
      savePosition,
      addYield,
      closePosition,
      removePosition,
      saveTransaction,
      removeTransaction,
      exportData() {
        return JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            positions: derivedPositions,
            transactions
          },
          null,
          2
        );
      }
    }),
    [
      activePositions,
      activeStoredPositions,
      loading,
      addYield,
      closePosition,
      closedPositions,
      clearPendingActions,
      derivedPositions,
      pendingActions.length,
      refreshAll,
      refreshing,
      removePosition,
      removeTransaction,
      savePosition,
      saveTransaction,
      positions,
      syncError,
      storedClosedPositions,
      transactions
    ]
  );

  return (
    <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used inside PortfolioProvider.");
  }

  return context;
}
