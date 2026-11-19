import axios from "axios";

if (typeof localStorage !== "undefined") localStorage.removeItem("fintrack-token");

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 12_000,
  withCredentials: true,
});

export function getApiError(error) {
  return error?.response?.data?.message || error?.message || "Something went wrong. Please try again.";
}

const dateOnly = (value) => value ? String(value).slice(0, 10) : "";

export function normalizeTransaction(item) {
  return { ...item, id: String(item._id || item.id), date: dateOnly(item.date) };
}

export function normalizeBudget(item) {
  return { ...item, id: String(item._id || item.id) };
}

export function normalizeGoal(item) {
  return { ...item, id: String(item._id || item.id), deadline: dateOnly(item.deadline) || null };
}

export async function loadAccountData() {
  const month = new Date().toISOString().slice(0, 7);
  const [userResponse, budgetResponse, goalResponse, transactionResponse] = await Promise.all([
    api.get("/auth/me"),
    api.get("/budgets", { params: { month } }),
    api.get("/goals"),
    api.get("/transactions", { params: { page: 1, limit: 100 } }),
  ]);
  const { pages = 0, items = [] } = transactionResponse.data;
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
      api.get("/transactions", { params: { page: index + 2, limit: 100 } }),
    ),
  );
  const transactions = [
    ...items,
    ...remainingPages.flatMap((response) => response.data.items || []),
  ].map(normalizeTransaction);
  const user = userResponse.data.user;

  return {
    transactions,
    budgets: (budgetResponse.data.items || []).map(normalizeBudget),
    goals: (goalResponse.data.items || []).map(normalizeGoal),
    categories: user.categories,
    currency: user.currency,
    openingBalance: user.openingBalance,
    profile: { name: user.name, email: user.email },
    theme: user.theme,
  };
}
