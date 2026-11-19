import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateBalance, calculateSavings, calculateSavingsRate, compareToPreviousMonth, formatMoney,
  formatPercent, getCategorySpend, getCategoryTotals, getMoneyFlow, getTrendData,
  selectMonthlyTransactions, summarizeTransactions, verifyBalanceConsistency,
} from "./finance.js";

test("summarizes transactions and filters the selected month", () => {
  const transactions = [
    { type: "income", amount: 5000, date: "2025-06-01", category: "Salary" },
    { type: "expense", amount: 1200, date: "2025-06-12", category: "Food" },
    { type: "income", amount: 3000, date: "2025-05-30", category: "Freelance" },
  ];

  const june = selectMonthlyTransactions(transactions, new Date(2025, 5, 15));
  assert.deepEqual(summarizeTransactions(june), { income: 5000, expenses: 1200 });
  assert.equal(calculateBalance(10000, transactions), 16800);
  assert.equal(calculateSavings(5000, 1200), 3800);
  assert.equal(calculateSavingsRate(5000, 1200), 76);
  assert.equal(calculateSavingsRate(0, 0), null);
  assert.deepEqual(getCategoryTotals(june, "income"), [{ name: "Salary", value: 5000 }]);
});

test("groups monthly cash flow and expenses by category without sample values", () => {
  const transactions = [
    { type: "income", amount: 5000, date: "2025-06-01", category: "Salary" },
    { type: "expense", amount: 700, date: "2025-06-12", category: "Food" },
    { type: "expense", amount: 300, date: "2025-06-15", category: "Food" },
  ];

  const trend = getTrendData(transactions, 6, new Date(2025, 5, 20));
  assert.deepEqual(trend.at(-1), { month: "Jun", income: 5000, expenses: 1000 });
  assert.equal(trend.slice(0, -1).every((month) => month.income === 0 && month.expenses === 0), true);
  assert.deepEqual(getCategorySpend(transactions), [{ name: "Food", value: 1000 }]);
  assert.equal(getCategorySpend(transactions).reduce((sum, item) => sum + item.value, 0), summarizeTransactions(transactions).expenses);
});

test("compares only when the previous month has a usable baseline", () => {
  assert.equal(compareToPreviousMonth(300, 200, 1), 50);
  assert.equal(compareToPreviousMonth(300, 0, 1), null);
  assert.equal(compareToPreviousMonth(300, 200, 0), null);
});

test("formats full INR values with Indian digit grouping", () => {
  assert.equal(formatMoney(125000), "₹1,25,000");
  assert.equal(formatMoney(1234.56), "₹1,234.56");
  assert.equal(formatPercent(12.345), "12.3%");
  assert.equal(formatPercent(null), "—");
});

test("calculates money flow and verifies balance consistency", () => {
  assert.deepEqual(getMoneyFlow(1000, 400), {
    remaining: 600,
    spentPercent: 40,
    remainingPercent: 60,
    spentWidth: 40,
    remainingWidth: 60,
  });
  assert.deepEqual(getMoneyFlow(100, 150), {
    remaining: 0,
    spentPercent: 150,
    remainingPercent: 0,
    spentWidth: 100,
    remainingWidth: 0,
  });
  assert.equal(verifyBalanceConsistency(5000, 1200, 13800, 10000), true);

  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try {
    assert.equal(verifyBalanceConsistency(5000, 1200, 13799, 10000), false);
  } finally {
    console.error = originalError;
  }
  assert.equal(errors.length, 1);
});
