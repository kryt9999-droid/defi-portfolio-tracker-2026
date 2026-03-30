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
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  addTransaction,
  calcAutoApy,
  calcMonthlyYield,
  calcPnl,
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
import { mobileSupabase } from "./AuthContext";
import { useAuth } from "./AuthContext";

type PendingAction =
  | { id: string; kind: "upsert-position"; payload: PositionInput }
  | { id: string; kind: "delete-position"; payload: { id: string } }
  | { id: string; kind: "add-transaction"; payload: TransactionInput }
  | { id: string; kind: "delete-transaction"; payload: { id: string } };

interface PortfolioContextValue {
  positions: Position[];
  transactions: Transaction[];
  pendingCount: number;
  loading: boolean;
  refreshing: boolean;
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalMonthlyYield: number;
  refreshAll: () => Promise<void>;
  savePosition: (position: PositionInput) => Promise<void>;
  removePosition: (id: string) => Promise<void>;
  saveTransaction: (transaction: TransactionInput) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  exportData: () => string;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

const appPrefix = "defi-tracker:mobile";

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

export function PortfolioProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const pendingRef = useRef<PendingAction[]>([]);

  const getKey = useCallback(
    (suffix: string) => `${appPrefix}:${userId ?? "guest"}:${suffix}`,
    [userId]
  );

  useEffect(() => {
    pendingRef.current = pendingActions;
  }, [pendingActions]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setPositions([]);
      setTransactions([]);
      setPendingActions([]);
      setLoading(false);
      return;
    }

    Promise.all([
      AsyncStorage.getItem(getKey("positions")),
      AsyncStorage.getItem(getKey("transactions")),
      AsyncStorage.getItem(getKey("pending"))
    ]).then(([storedPositions, storedTransactions, storedPending]) => {
      setPositions(parseStored<Position[]>(storedPositions, []));
      setTransactions(parseStored<Transaction[]>(storedTransactions, []));
      setPendingActions(parseStored<PendingAction[]>(storedPending, []));
      setLoading(false);
    });
  }, [getKey, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    AsyncStorage.multiSet([
      [getKey("positions"), JSON.stringify(positions)],
      [getKey("transactions"), JSON.stringify(transactions)],
      [getKey("pending"), JSON.stringify(pendingActions)]
    ]).catch(() => undefined);
  }, [getKey, pendingActions, positions, transactions, userId]);

  const flushQueue = useCallback(async () => {
    if (!userId || !isOnline || pendingRef.current.length === 0) {
      return;
    }

    for (const action of [...pendingRef.current]) {
      try {
        if (action.kind === "upsert-position") {
          await upsertPosition(action.payload, mobileSupabase);
        }
        if (action.kind === "delete-position") {
          await deletePosition(action.payload.id, mobileSupabase);
        }
        if (action.kind === "add-transaction") {
          await addTransaction(action.payload, mobileSupabase);
        }
        if (action.kind === "delete-transaction") {
          await deleteTransaction(action.payload.id, mobileSupabase);
        }
        setPendingActions((current) => current.filter((item) => item.id !== action.id));
      } catch {
        break;
      }
    }
  }, [isOnline, userId]);

  const refreshAll = useCallback(async () => {
    if (!userId || !isOnline) {
      return;
    }

    setRefreshing(true);
    try {
      await flushQueue();
      const [nextPositions, nextTransactions] = await Promise.all([
        getPositions(mobileSupabase),
        getTransactions(mobileSupabase)
      ]);
      setPositions(nextPositions);
      setTransactions(nextTransactions);
    } finally {
      setRefreshing(false);
    }
  }, [flushQueue, isOnline, userId]);

  useEffect(() => {
    if (userId && isOnline) {
      refreshAll().finally(() => setLoading(false));
    }
  }, [isOnline, refreshAll, userId]);

  const queueAction = useCallback((action: Omit<PendingAction, "id">) => {
    setPendingActions((current) => [
      ...current,
      {
        ...action,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`
      } as PendingAction
    ]);
  }, []);

  const savePosition = useCallback(
    async (position: PositionInput) => {
      const optimistic: Position = {
        id: position.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        user_id: session?.user.id ?? "",
        created_at: position.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: position.notes ?? null,
        ...position,
        apy: calcAutoApy(position)
      };

      setPositions((current) => {
        const exists = current.some((item) => item.id === optimistic.id);
        return exists
          ? current.map((item) => (item.id === optimistic.id ? optimistic : item))
          : [optimistic, ...current];
      });

      if (!isOnline) {
        queueAction({ kind: "upsert-position", payload: optimistic });
        return;
      }

      try {
        const saved = await upsertPosition(optimistic, mobileSupabase);
        setPositions((current) =>
          current.map((item) => (item.id === optimistic.id ? saved : item))
        );
      } catch {
        queueAction({ kind: "upsert-position", payload: optimistic });
      }
    },
    [isOnline, queueAction, session?.user.id]
  );

  const removePosition = useCallback(
    async (id: string) => {
      setPositions((current) => current.filter((item) => item.id !== id));

      if (!isOnline) {
        queueAction({ kind: "delete-position", payload: { id } });
        return;
      }

      try {
        await deletePosition(id, mobileSupabase);
      } catch {
        queueAction({ kind: "delete-position", payload: { id } });
      }
    },
    [isOnline, queueAction]
  );

  const saveTransaction = useCallback(
    async (transaction: TransactionInput) => {
      const optimistic: Transaction = {
        id: transaction.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        user_id: session?.user.id ?? "",
        created_at: transaction.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        position_id: transaction.position_id ?? null,
        quantity: transaction.quantity ?? null,
        notes: transaction.notes ?? null,
        ...transaction
      };

      setTransactions((current) => [optimistic, ...current]);

      if (!isOnline) {
        queueAction({ kind: "add-transaction", payload: optimistic });
        return;
      }

      try {
        const saved = await addTransaction(optimistic, mobileSupabase);
        setTransactions((current) =>
          current.map((item) => (item.id === optimistic.id ? saved : item))
        );
      } catch {
        queueAction({ kind: "add-transaction", payload: optimistic });
      }
    },
    [isOnline, queueAction, session?.user.id]
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      setTransactions((current) => current.filter((item) => item.id !== id));

      if (!isOnline) {
        queueAction({ kind: "delete-transaction", payload: { id } });
        return;
      }

      try {
        await deleteTransaction(id, mobileSupabase);
      } catch {
        queueAction({ kind: "delete-transaction", payload: { id } });
      }
    },
    [isOnline, queueAction]
  );

  const value = useMemo<PortfolioContextValue>(
    () => ({
      positions,
      transactions,
      pendingCount: pendingActions.length,
      loading,
      refreshing,
      totalValue: positions.reduce((sum, item) => sum + item.current_value, 0),
      totalInvested: positions.reduce((sum, item) => sum + item.deposited, 0),
      totalPnl: positions.reduce((sum, item) => sum + calcPnl(item), 0),
      totalMonthlyYield: positions.reduce(
        (sum, item) => sum + calcMonthlyYield(item),
        0
      ),
      refreshAll,
      savePosition,
      removePosition,
      saveTransaction,
      removeTransaction,
      exportData() {
        return JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            positions,
            transactions
          },
          null,
          2
        );
      }
    }),
    [
      loading,
      pendingActions.length,
      positions,
      refreshAll,
      refreshing,
      removePosition,
      removeTransaction,
      savePosition,
      saveTransaction,
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
    throw new Error("usePortfolio must be used within PortfolioProvider.");
  }

  return context;
}
