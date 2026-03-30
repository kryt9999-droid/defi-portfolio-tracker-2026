export const financialTermMeta = {
  totalInvested: {
    label: "Total Invested",
    description: "Initial position capital plus all later deposit events. Does not include claims or withdrawals.",
    formula: "initial deposit + deposit events"
  },
  currentValue: {
    label: "Current Value",
    description: "Current strategy value after deposits, yield claims, withdrawals, and manual price refreshes.",
    formula: "base current value + deposits + claimed yield - withdrawals"
  },
  realizedYield: {
    label: "Realized Yield",
    description: "Yield that has been explicitly recorded through claim events.",
    formula: "sum of claim events"
  },
  withdrawn: {
    label: "Withdrawn",
    description: "Capital withdrawn from the strategy, including full close withdrawals.",
    formula: "sum of withdraw events"
  },
  netResult: {
    label: "Net Result",
    description:
      "Performance after capital flows. Active positions compare current value to net invested capital. Closed positions compare withdrawn capital to total invested capital.",
    formula:
      "active: current value - net invested; closed: withdrawn - total invested"
  },
  apy: {
    label: "APY",
    description: "Cashflow-aware annualized return built from dated deposits, claims, withdrawals, and the current or projected terminal value.",
    formula: "annualized return from timestamped cashflows"
  },
  projectedDailyIncome: {
    label: "Projected Daily Income",
    description: "Expected daily income from the current portfolio mix based on the current APY values.",
    formula: "current value × annualized return / 365"
  },
  projectedMonthlyIncome: {
    label: "Projected Monthly Income",
    description: "Expected monthly income from the current portfolio mix based on the current APY values.",
    formula: "current value × annualized return / 12"
  },
  projectedYearlyIncome: {
    label: "Projected Yearly Income",
    description: "Expected yearly income from the current portfolio mix based on the current APY values.",
    formula: "current value × annualized return"
  }
} as const;

export type FinancialMetricKey = keyof typeof financialTermMeta;

export const transactionActionMeta = {
  deposit: { label: "Deposit Added", tone: "deposit" },
  withdraw: { label: "Withdraw Recorded", tone: "withdraw" },
  claim: { label: "Yield Claimed", tone: "claim" },
  rebalance: { label: "Rebalanced", tone: "neutral" },
  buy: { label: "Buy", tone: "neutral" },
  sell: { label: "Sell", tone: "neutral" }
} as const;

export const positionEventMeta = {
  opened: { label: "Opened", tone: "opened" },
  closed: { label: "Closed", tone: "closed" }
} as const;
