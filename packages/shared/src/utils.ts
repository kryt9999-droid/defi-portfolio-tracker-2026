import type { Position, Transaction } from "./types";

export function toFiniteNumber(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;

  return Number.isFinite(parsed) ? parsed : 0;
}

export function calcPnl(position: Pick<Position, "deposited" | "current_value" | "realized_yield">): number {
  return (
    toFiniteNumber(position.current_value) +
    toFiniteNumber(position.realized_yield) -
    toFiniteNumber(position.deposited)
  );
}

type PositionApySource = Pick<
  Position,
  "deposited" | "current_value" | "realized_yield" | "entry_date"
>;

type PositionCashflowSource = Pick<
  Position,
  "id" | "deposited" | "current_value" | "realized_yield" | "entry_date" | "closed_at"
>;

type TransactionCashflowSource = Pick<
  Transaction,
  "position_id" | "action" | "amount_usd" | "tx_date"
>;

function toDate(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getEvaluationDate(
  position: PositionCashflowSource,
  transactions: TransactionCashflowSource[],
  now = new Date()
): Date {
  const transactionDates = transactions
    .filter((transaction) => transaction.position_id === position.id)
    .map((transaction) => toDate(transaction.tx_date))
    .filter((date): date is Date => Boolean(date));

  return transactionDates.reduce((latest, date) => {
    return date.getTime() > latest.getTime() ? date : latest;
  }, now);
}

function toEffectiveDate(value?: Date | string): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  return toDate(value);
}

function isTransactionEffective(
  transaction: TransactionCashflowSource,
  effectiveAt?: Date | string
): boolean {
  const transactionDate = toDate(transaction.tx_date);
  if (!transactionDate) {
    return false;
  }

  const limit = toEffectiveDate(effectiveAt);
  if (limit && transactionDate.getTime() > limit.getTime()) {
    return false;
  }

  return true;
}

function getCapitalTransactions(
  position: PositionCashflowSource,
  transactions: TransactionCashflowSource[],
  effectiveAt?: Date | string
) {
  return transactions.filter(
    (transaction) =>
      transaction.position_id === position.id &&
      isTransactionEffective(transaction, effectiveAt) &&
      (transaction.action === "deposit" || transaction.action === "withdraw")
  );
}

function getClaimTransactions(
  position: PositionCashflowSource,
  transactions: TransactionCashflowSource[],
  effectiveAt?: Date | string
) {
  return transactions.filter(
    (transaction) =>
      transaction.position_id === position.id &&
      isTransactionEffective(transaction, effectiveAt) &&
      transaction.action === "claim"
  );
}

export function calcDerivedCurrentValue(
  position: Pick<Position, "id" | "current_value">,
  transactions: TransactionCashflowSource[],
  effectiveAt?: Date | string
): number {
  const baseCurrentValue = toFiniteNumber(position.current_value);
  const capitalTransactions = getCapitalTransactions(
    position as PositionCashflowSource,
    transactions,
    effectiveAt
  );
  const addedDeposits = capitalTransactions
    .filter((transaction) => transaction.action === "deposit")
    .reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount_usd), 0);
  const withdrawnCapital = capitalTransactions
    .filter((transaction) => transaction.action === "withdraw")
    .reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount_usd), 0);
  const claimedYield = getClaimTransactions(
    position as PositionCashflowSource,
    transactions,
    effectiveAt
  ).reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount_usd), 0);

  return baseCurrentValue + addedDeposits + claimedYield - withdrawnCapital;
}

export function calcDerivedRealizedYield(
  position: Pick<Position, "id" | "realized_yield">,
  transactions: TransactionCashflowSource[],
  effectiveAt?: Date | string
): number {
  const baseRealizedYield = toFiniteNumber(position.realized_yield);
  const claimedYield = getClaimTransactions(
    position as PositionCashflowSource,
    transactions,
    effectiveAt
  ).reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount_usd), 0);

  return baseRealizedYield + claimedYield;
}

export function calcNetInvestedCapital(
  position: PositionCashflowSource,
  transactions: TransactionCashflowSource[],
  effectiveAt?: Date | string
): number {
  const baseCapital = toFiniteNumber(position.deposited);
  const positionTransactions = getCapitalTransactions(position, transactions, effectiveAt);

  const addedDeposits = positionTransactions
    .filter((transaction) => transaction.action === "deposit")
    .reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount_usd), 0);

  const withdrawnCapital = positionTransactions
    .filter((transaction) => transaction.action === "withdraw")
    .reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount_usd), 0);

  return baseCapital + addedDeposits - withdrawnCapital;
}

export function calcGrossInvestedCapital(
  position: PositionCashflowSource,
  transactions: TransactionCashflowSource[],
  effectiveAt?: Date | string
): number {
  const baseCapital = toFiniteNumber(position.deposited);
  const positionTransactions = getCapitalTransactions(position, transactions, effectiveAt);

  const addedDeposits = positionTransactions
    .filter((transaction) => transaction.action === "deposit")
    .reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount_usd), 0);

  return baseCapital + addedDeposits;
}

export function calcWithdrawnCapital(
  position: PositionCashflowSource,
  transactions: TransactionCashflowSource[],
  effectiveAt?: Date | string
): number {
  const positionTransactions = getCapitalTransactions(position, transactions, effectiveAt);

  return positionTransactions
    .filter((transaction) => transaction.action === "withdraw")
    .reduce((sum, transaction) => sum + toFiniteNumber(transaction.amount_usd), 0);
}

export function calcCashflowAwarePnl(
  position: PositionCashflowSource,
  transactions: TransactionCashflowSource[]
): number {
  return calcDerivedCurrentValue(position, transactions) -
    calcNetInvestedCapital(position, transactions);
}

export function calcClosedPositionPnl(
  position: PositionCashflowSource,
  transactions: TransactionCashflowSource[]
): number {
  const effectiveAt = position.closed_at ?? undefined;
  const grossInvested = calcGrossInvestedCapital(position, transactions, effectiveAt);
  const withdrawnCapital = calcWithdrawnCapital(position, transactions, effectiveAt);

  return withdrawnCapital - grossInvested;
}

export function calcProjectedClosePnl(
  position: PositionCashflowSource,
  transactions: TransactionCashflowSource[],
  effectiveAt?: Date | string
): number {
  const grossInvested = calcGrossInvestedCapital(position, transactions, effectiveAt);
  const closeAmount = calcDerivedCurrentValue(position, transactions, effectiveAt);

  return closeAmount - grossInvested;
}

export function calcAutoApy(position: PositionApySource, now = new Date()): number {
  const deposited = toFiniteNumber(position.deposited);
  const currentValue = toFiniteNumber(position.current_value);
  const realizedYield = toFiniteNumber(position.realized_yield);

  if (deposited <= 0) {
    return 0;
  }

  const entryDate = new Date(position.entry_date);
  if (Number.isNaN(entryDate.getTime())) {
    return 0;
  }

  const elapsedMs = now.getTime() - entryDate.getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  if (elapsedDays <= 0) {
    return 0;
  }

  const totalReturn =
    (currentValue + realizedYield - deposited) / deposited;

  // Avoid invalid powers for losses worse than -100%.
  if (totalReturn <= -1) {
    return -100;
  }

  const annualizedReturn = (Math.pow(1 + totalReturn, 365 / elapsedDays) - 1) * 100;
  if (!Number.isFinite(annualizedReturn)) {
    return 0;
  }

  return Number(annualizedReturn.toFixed(2));
}

export function calcCashflowAwareApy(
  position: PositionCashflowSource,
  transactions: TransactionCashflowSource[],
  now = new Date()
): number {
  const baseCapital = toFiniteNumber(position.deposited);
  if (baseCapital <= 0) {
    return 0;
  }

  const entryDate = new Date(position.entry_date);
  if (Number.isNaN(entryDate.getTime())) {
    return calcAutoApy(position, now);
  }

  const evaluationDate = getEvaluationDate(position, transactions, now);
  const elapsedMs = evaluationDate.getTime() - entryDate.getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  if (elapsedDays <= 0) {
    return 0;
  }

  const cashflows = [
    { amount: -baseCapital, date: entryDate },
    ...transactions
      .filter(
        (transaction) =>
          transaction.position_id === position.id &&
          isTransactionEffective(transaction)
      )
      .map((transaction) => {
        const transactionDate = toDate(transaction.tx_date);
        const amount = toFiniteNumber(transaction.amount_usd);
        if (!transactionDate) {
          return null;
        }

        if (transaction.action === "deposit") {
          return { amount: -amount, date: transactionDate };
        }

        if (transaction.action === "withdraw" || transaction.action === "claim") {
          return { amount, date: transactionDate };
        }

        return null;
      })
      .filter((flow): flow is { amount: number; date: Date } => {
        if (!flow) {
          return false;
        }

        return flow.amount !== 0;
      }),
    { amount: calcDerivedCurrentValue(position, transactions), date: evaluationDate }
  ];

  const hasPositiveFlow = cashflows.some((flow) => flow.amount > 0);
  const hasNegativeFlow = cashflows.some((flow) => flow.amount < 0);
  if (!hasPositiveFlow || !hasNegativeFlow) {
    return calcAutoApy(position, now);
  }

  const baseDate = cashflows[0].date;
  const npv = (rate: number) =>
    cashflows.reduce((sum, flow) => {
      const days =
        (flow.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24);
      return sum + flow.amount / Math.pow(1 + rate, days / 365);
    }, 0);

  let lower = -0.9999;
  let upper = 1;
  let lowerValue = npv(lower);
  let upperValue = npv(upper);

  let expansions = 0;
  while (
    lowerValue * upperValue > 0 &&
    expansions < 18 &&
    Number.isFinite(upperValue)
  ) {
    upper *= 10;
    upperValue = npv(upper);
    expansions += 1;
  }

  if (lowerValue * upperValue > 0) {
    return calcAutoApy(
      {
        ...position,
        current_value: calcDerivedCurrentValue(position, transactions),
        realized_yield: 0
      },
      evaluationDate
    );
  }

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (lower + upper) / 2;
    const middleValue = npv(middle);

    if (Math.abs(middleValue) < 1e-7) {
      return Number((middle * 100).toFixed(2));
    }

    if (lowerValue * middleValue <= 0) {
      upper = middle;
      upperValue = middleValue;
    } else {
      lower = middle;
      lowerValue = middleValue;
    }
  }

  return Number((((lower + upper) / 2) * 100).toFixed(2));
}

export function calcMonthlyYield(position: Pick<Position, "current_value" | "apy">): number {
  return (toFiniteNumber(position.current_value) * (toFiniteNumber(position.apy) / 100)) / 12;
}

export function calcYearlyYield(position: Pick<Position, "current_value" | "apy">): number {
  return toFiniteNumber(position.current_value) * (toFiniteNumber(position.apy) / 100);
}

export function calcDailyYield(position: Pick<Position, "current_value" | "apy">): number {
  return calcYearlyYield(position) / 365;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}
