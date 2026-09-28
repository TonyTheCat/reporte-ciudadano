/** Alerta por correo si el gasto real o proyectado del mes supera el presupuesto. */
export function createBudget(limitUsd: number) {
  const email = process.env.ALERT_EMAIL;
  if (!email) return;
  new aws.budgets.Budget("MonthlyBudget", {
    budgetType: "COST",
    limitAmount: String(limitUsd),
    limitUnit: "USD",
    timeUnit: "MONTHLY",
    notifications: [
      { comparisonOperator: "GREATER_THAN", threshold: 80, thresholdType: "PERCENTAGE", notificationType: "ACTUAL", subscriberEmailAddresses: [email] },
      { comparisonOperator: "GREATER_THAN", threshold: 100, thresholdType: "PERCENTAGE", notificationType: "FORECASTED", subscriberEmailAddresses: [email] },
    ],
  });
}
