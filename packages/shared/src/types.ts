export const networkOptions = [
  "Ethereum",
  "Solana",
  "Arbitrum",
  "Base",
  "Optimism",
  "Polygon",
  "BSC",
  "Avalanche",
  "Monad",
  "Other"
] as const;

export const positionTypeOptions = [
  "LP",
  "Staking",
  "Lending",
  "Looping",
  "Yield Farming",
  "Wallet"
] as const;

export const riskOptions = ["low", "medium", "high"] as const;

export const transactionActionOptions = [
  "deposit",
  "withdraw",
  "claim",
  "rebalance",
  "buy",
  "sell"
] as const;

export type NetworkOption = (typeof networkOptions)[number] | (string & {});
export type PositionTypeOption = (typeof positionTypeOptions)[number] | (string & {});
export type RiskOption = (typeof riskOptions)[number];
export type TransactionAction = (typeof transactionActionOptions)[number];

export interface Position {
  id: string;
  user_id: string;
  network: NetworkOption;
  protocol: string;
  type: PositionTypeOption;
  assets: string;
  deposited: number;
  current_value: number;
  apy: number;
  realized_yield: number;
  entry_date: string;
  risk: RiskOption;
  notes: string | null;
  is_closed?: boolean;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PositionInput {
  id?: string;
  user_id?: string;
  network: NetworkOption;
  protocol: string;
  type: PositionTypeOption;
  assets: string;
  deposited: number;
  current_value: number;
  apy: number;
  realized_yield: number;
  entry_date: string;
  risk: RiskOption;
  notes?: string | null;
  is_closed?: boolean;
  closed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  position_id: string | null;
  network: NetworkOption;
  protocol: string;
  action: TransactionAction;
  asset: string;
  amount_usd: number;
  quantity: number | null;
  tx_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionInput {
  id?: string;
  user_id?: string;
  position_id?: string | null;
  network: NetworkOption;
  protocol: string;
  action: TransactionAction;
  asset: string;
  amount_usd: number;
  quantity?: number | null;
  tx_date: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type Database = {
  public: {
    Tables: {
      positions: {
        Row: Position;
        Insert: PositionInput;
        Update: Partial<PositionInput>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInput;
        Update: Partial<TransactionInput>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
