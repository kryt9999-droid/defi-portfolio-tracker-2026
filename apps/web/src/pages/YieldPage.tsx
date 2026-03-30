import {
  calcDailyYield,
  calcMonthlyYield,
  calcYearlyYield,
  financialTermMeta,
  formatCurrency
} from "@defi/shared";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { usePortfolio } from "../contexts/PortfolioContext";
import { EmptyState } from "../components/EmptyState";
import { MetricHint } from "../components/MetricHint";

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAxisDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit"
  }).format(parsed);
}

function buildProjectionSeries(
  positions: Array<{ current_value: number; apy: number }>,
  endDate: string,
  mode: "simple" | "compound"
) {
  const startDate = new Date();
  const targetDate = new Date(endDate);
  if (Number.isNaN(targetDate.getTime()) || targetDate.getTime() <= startDate.getTime()) {
    return [];
  }

  const totalDays = Math.max(
    1,
    Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const maxPoints = 24;
  const stepDays = Math.max(1, Math.ceil(totalDays / maxPoints));
  const basePortfolioValue = positions.reduce((sum, position) => sum + position.current_value, 0);
  const points = [];

  for (let day = 0; day <= totalDays; day += stepDays) {
    const pointDate = new Date(startDate);
    pointDate.setDate(pointDate.getDate() + day);

    const projectedValue = positions.reduce((sum, position) => {
      const principal = position.current_value;
      const yearlyRate = position.apy / 100;
      const effectiveDays = Math.max(
        0,
        (pointDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const growth =
        principal > 0
          ? mode === "compound"
            ? principal * Math.pow(1 + yearlyRate / 365, effectiveDays)
            : principal * (1 + (yearlyRate * effectiveDays) / 365)
          : 0;
      return sum + growth;
    }, 0);
    const cumulativeIncome = projectedValue - basePortfolioValue;

    points.push({
      date: pointDate.toISOString(),
      label: formatAxisDate(pointDate.toISOString()),
      projectedIncome: cumulativeIncome,
      projectedValue
    });
  }

  const lastPointDate = points.at(-1)?.date;
  if (lastPointDate !== targetDate.toISOString()) {
    const projectedValue = positions.reduce((sum, position) => {
      const principal = position.current_value;
      const yearlyRate = position.apy / 100;
      const effectiveDays = Math.max(
        0,
        (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const growth =
        principal > 0
          ? mode === "compound"
            ? principal * Math.pow(1 + yearlyRate / 365, effectiveDays)
            : principal * (1 + (yearlyRate * effectiveDays) / 365)
          : 0;
      return sum + growth;
    }, 0);

    points.push({
      date: targetDate.toISOString(),
      label: formatAxisDate(targetDate.toISOString()),
      projectedIncome: projectedValue - basePortfolioValue,
      projectedValue
    });
  }

  return points;
}

export function YieldPage() {
  const { positions } = usePortfolio();
  const [targetDate, setTargetDate] = useState(() => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return formatDateInput(nextYear);
  });
  const [projectionMode, setProjectionMode] = useState<"simple" | "compound">("compound");

  if (positions.length === 0) {
    return (
      <EmptyState
        title="Yield projections need positions"
        description="Once you add positions with APY and current value, this page calculates projected daily, monthly, and yearly income."
      />
    );
  }

  const totals = positions.reduce(
    (accumulator, position) => ({
      daily: accumulator.daily + calcDailyYield(position),
      monthly: accumulator.monthly + calcMonthlyYield(position),
      yearly: accumulator.yearly + calcYearlyYield(position),
      currentValue: accumulator.currentValue + position.current_value
    }),
    { daily: 0, monthly: 0, yearly: 0, currentValue: 0 }
  );
  const projectionSeries = useMemo(
    () =>
      buildProjectionSeries(
        positions.map((position) => ({
          current_value: position.current_value,
          apy: position.apy
        })),
        targetDate,
        projectionMode
      ),
    [positions, projectionMode, targetDate]
  );
  const projectedEndValue = projectionSeries.at(-1)?.projectedValue ?? totals.currentValue;
  const projectedCompoundIncome = projectedEndValue - totals.currentValue;

  return (
    <div className="page-stack">
      <section className="stats-grid">
        <article className="stat-card">
          <p>
            <MetricHint
              label={financialTermMeta.projectedDailyIncome.label}
              description={financialTermMeta.projectedDailyIncome.description}
              formula={financialTermMeta.projectedDailyIncome.formula}
            />
          </p>
          <strong>{formatCurrency(totals.daily)}</strong>
        </article>
        <article className="stat-card">
          <p>
            <MetricHint
              label={financialTermMeta.projectedMonthlyIncome.label}
              description={financialTermMeta.projectedMonthlyIncome.description}
              formula={financialTermMeta.projectedMonthlyIncome.formula}
            />
          </p>
          <strong>{formatCurrency(totals.monthly)}</strong>
        </article>
        <article className="stat-card">
          <p>
            <MetricHint
              label={financialTermMeta.projectedYearlyIncome.label}
              description={financialTermMeta.projectedYearlyIncome.description}
              formula={financialTermMeta.projectedYearlyIncome.formula}
            />
          </p>
          <strong>{formatCurrency(totals.yearly)}</strong>
        </article>
      </section>

      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>{projectionMode === "compound" ? "Compounded Projection" : "Simple Projection"}</h3>
            <p>
              {projectionMode === "compound"
                ? "Uses daily compounding from the current portfolio mix up to the selected date."
                : "Uses simple interest from the current portfolio mix up to the selected date."}
            </p>
          </div>
          <div className="yield-controls">
            <label className="yield-date-picker">
              <span>Target Date</span>
              <input
                type="date"
                value={targetDate}
                min={formatDateInput(new Date())}
                onChange={(event) => setTargetDate(event.target.value)}
              />
            </label>
            <div className="yield-mode-toggle">
              <button
                type="button"
                className={`button ${projectionMode === "simple" ? "button-primary" : "button-secondary"}`}
                onClick={() => setProjectionMode("simple")}
              >
                Simple
              </button>
              <button
                type="button"
                className={`button ${projectionMode === "compound" ? "button-primary" : "button-secondary"}`}
                onClick={() => setProjectionMode("compound")}
              >
                Compound
              </button>
            </div>
          </div>
        </div>
        <div className="stats-grid compact-stats">
          <article className="stat-card">
            <p>{projectionMode === "compound" ? "Compounded Gain" : "Simple Gain"}</p>
            <strong>{formatCurrency(projectedCompoundIncome)}</strong>
          </article>
          <article className="stat-card">
            <p>Projected Value</p>
            <strong>{formatCurrency(projectedEndValue)}</strong>
          </article>
        </div>
        <div className="chart-wrap chart-tall">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={projectionSeries}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(244, 251, 248, 0.75)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => `$${Math.round(value)}`}
                tick={{ fill: "rgba(244, 251, 248, 0.75)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "projectedIncome" ? "Compounded Gain" : "Projected Value"
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="projectedIncome"
                name="projectedIncome"
                stroke="#29c18d"
                strokeWidth={3}
                dot={{ r: 3, fill: "#29c18d" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="projectedValue"
                name="projectedValue"
                stroke="#8bd6ff"
                strokeWidth={2}
                strokeDasharray="6 6"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Protocol</th>
              <th>Assets</th>
              <th>
                <MetricHint
                  label={financialTermMeta.apy.label}
                  description={financialTermMeta.apy.description}
                  formula={financialTermMeta.apy.formula}
                />
              </th>
              <th>
                <MetricHint
                  label="Daily Income"
                  description={financialTermMeta.projectedDailyIncome.description}
                  formula={financialTermMeta.projectedDailyIncome.formula}
                />
              </th>
              <th>
                <MetricHint
                  label="Monthly Income"
                  description={financialTermMeta.projectedMonthlyIncome.description}
                  formula={financialTermMeta.projectedMonthlyIncome.formula}
                />
              </th>
              <th>
                <MetricHint
                  label="Yearly Income"
                  description={financialTermMeta.projectedYearlyIncome.description}
                  formula={financialTermMeta.projectedYearlyIncome.formula}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr key={position.id}>
                <td>{position.protocol}</td>
                <td>{position.assets}</td>
                <td>{position.apy.toFixed(2)}%</td>
                <td>{formatCurrency(calcDailyYield(position))}</td>
                <td>{formatCurrency(calcMonthlyYield(position))}</td>
                <td>{formatCurrency(calcYearlyYield(position))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}
