export function selectMonthlyTransactions(transactions, date = new Date()) {
  return transactions.filter((transaction) => {
    const itemDate = new Date(`${transaction.date}T00:00:00`);
    return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear();
  });
}

export function summarizeTransactions(transactions) {
  return transactions.reduce((summary, transaction) => {
    const amount = Number(transaction.amount) || 0;
    if (transaction.type === "income") summary.income += amount;
    else summary.expenses += amount;
    return summary;
  }, { income: 0, expenses: 0 });
}

export function calculateBalance(openingBalance, transactions) {
  const { income, expenses } = summarizeTransactions(transactions);
  return (Number(openingBalance) || 0) + income - expenses;
}

export function calculateSavings(income, expenses) {
  return income - expenses;
}

export function calculateSavingsRate(income, expenses) {
  return income === 0 ? null : ((income - expenses) / income) * 100;
}

export function getMoneyFlow(income, expenses) {
  const remaining = Math.max(income - expenses, 0);
  const spentPercent = income > 0 ? (expenses / income) * 100 : null;
  const remainingPercent = income > 0 ? (remaining / income) * 100 : null;
  return {
    remaining,
    spentPercent,
    remainingPercent,
    spentWidth: spentPercent === null ? 0 : Math.min(spentPercent, 100),
    remainingWidth: remainingPercent || 0,
  };
}

export function compareToPreviousMonth(current, previous, previousTransactionCount) {
  if (!previousTransactionCount || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function getCategoryTotals(transactions, type) {
  const totals = new Map();
  transactions.filter((transaction) => transaction.type === type).forEach((transaction) => {
    totals.set(transaction.category, (totals.get(transaction.category) || 0) + Number(transaction.amount));
  });
  return [...totals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function getCategorySpend(transactions) {
  return getCategoryTotals(transactions, "expense");
}

export function verifyBalanceConsistency(income, spent, balance, openingBalance) {
  const difference = (income - spent) - (balance - openingBalance);
  if (!Number.isFinite(difference) || Math.abs(difference) > 1e-8) {
    console.error("Finance totals are inconsistent.", { income, spent, balance, openingBalance });
    return false;
  }
  return true;
}

export function getTrendData(transactions, count = 6, referenceDate = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - count + index + 1, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const totals = summarizeTransactions(transactions.filter((transaction) => transaction.date.slice(0, 7) === monthKey));
    return {
      month: new Intl.DateTimeFormat("en", { month: "short" }).format(date),
      income: totals.income,
      expenses: totals.expenses,
    };
  });
}

export function formatPercent(value) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatMoney(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}
