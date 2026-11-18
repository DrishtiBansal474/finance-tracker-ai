import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api, getApiError, normalizeBudget, normalizeGoal, normalizeTransaction } from "./api";

const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const dateInMonth = (day, offset = 0) => {
  const date = new Date();
  date.setMonth(date.getMonth() + offset, day);
  return date.toISOString().slice(0, 10);
};

const starterTransactions = [
  { id: "tx-1", title: "Monthly salary", amount: 92000, type: "income", category: "Salary", date: dateInMonth(1), notes: "November salary" },
  { id: "tx-2", title: "Apartment rent", amount: 24500, type: "expense", category: "Bills", date: dateInMonth(3), notes: "Monthly rent" },
  { id: "tx-3", title: "Grocery run", amount: 2840, type: "expense", category: "Food", date: dateInMonth(5), notes: "Weekly groceries" },
  { id: "tx-4", title: "Freelance project", amount: 14500, type: "income", category: "Freelancing", date: dateInMonth(7), notes: "Brand identity project" },
  { id: "tx-5", title: "Metro & cabs", amount: 1680, type: "expense", category: "Travel", date: dateInMonth(9), notes: "" },
  { id: "tx-6", title: "Dinner with friends", amount: 2250, type: "expense", category: "Food", date: dateInMonth(11), notes: "Saturday dinner" },
  { id: "tx-7", title: "Health insurance", amount: 3200, type: "expense", category: "Health", date: dateInMonth(13), notes: "Monthly premium" },
  { id: "tx-8", title: "Index fund dividend", amount: 1850, type: "income", category: "Investment", date: dateInMonth(15), notes: "" },
  { id: "tx-9", title: "New headphones", amount: 3990, type: "expense", category: "Shopping", date: dateInMonth(16), notes: "" },
];

const defaultCategories = {
  income: ["Salary", "Freelancing", "Investment", "Business"],
  expense: ["Food", "Travel", "Shopping", "Health", "Education", "Entertainment", "Bills"],
};

const demoData = () => ({
  transactions: starterTransactions,
  budgets: [
    { id: "b-1", category: "Food", limit: 12000 },
    { id: "b-2", category: "Travel", limit: 8000 },
    { id: "b-3", category: "Shopping", limit: 10000 },
    { id: "b-4", category: "Bills", limit: 28000 },
  ],
  goals: [
    { id: "g-1", name: "MacBook Air", target: 150000, saved: 86500, deadline: dateInMonth(31, 4), icon: "laptop" },
    { id: "g-2", name: "Weekend in Goa", target: 35000, saved: 22100, deadline: dateInMonth(15, 2), icon: "plane" },
    { id: "g-3", name: "Emergency fund", target: 200000, saved: 76000, deadline: dateInMonth(31, 10), icon: "shield" },
  ],
  categories: defaultCategories,
  currency: "INR",
  profile: { name: "", email: "" },
  theme: "light",
});

const isApiSession = () => useAuthStore.getState().mode === "api";

async function persistMutation(set, request, apply) {
  try {
    const { data } = await request();
    apply(data);
    set({ operationError: "" });
    return true;
  } catch (error) {
    set({ operationError: getApiError(error) });
    return false;
  }
}

export const useFinanceStore = create(
  persist(
    (set, get) => ({
      ...demoData(),
      operationError: "",
      replaceAccountData: (data) => set({ ...data, operationError: "" }),
      resetForAccount: (user = {}) => set({
        transactions: [],
        budgets: [],
        goals: [],
        categories: user.categories || defaultCategories,
        currency: user.currency || "INR",
        profile: { name: user.name || "", email: user.email || "" },
        theme: user.theme || "light",
        operationError: "",
      }),
      resetDemoData: () => set({ ...demoData(), operationError: "" }),
      clearOperationError: () => set({ operationError: "" }),
      addTransaction: async (transaction) => {
        if (isApiSession()) {
          return persistMutation(set, () => api.post("/transactions", transaction), ({ item }) => {
            set((state) => ({ transactions: [normalizeTransaction(item), ...state.transactions] }));
          });
        }
        set((state) => ({ transactions: [{ ...transaction, id: makeId() }, ...state.transactions] }));
        return true;
      },
      updateTransaction: async (id, updates) => {
        if (isApiSession()) {
          return persistMutation(set, () => api.patch(`/transactions/${id}`, updates), ({ item }) => {
            const transaction = normalizeTransaction(item);
            set((state) => ({ transactions: state.transactions.map((row) => row.id === id ? transaction : row) }));
          });
        }
        set((state) => ({
          transactions: state.transactions.map((transaction) => transaction.id === id ? { ...transaction, ...updates } : transaction),
        }));
        return true;
      },
      deleteTransaction: async (id) => {
        if (isApiSession()) {
          return persistMutation(set, () => api.delete(`/transactions/${id}`), () => {
            set((state) => ({ transactions: state.transactions.filter((transaction) => transaction.id !== id) }));
          });
        }
        set((state) => ({ transactions: state.transactions.filter((transaction) => transaction.id !== id) }));
        return true;
      },
      addBudget: async (budget) => {
        if (isApiSession()) {
          const month = new Date().toISOString().slice(0, 7);
          return persistMutation(set, () => api.put("/budgets", { ...budget, month }), ({ item }) => {
            const saved = normalizeBudget(item);
            set((state) => ({ budgets: [...state.budgets.filter((row) => row.category !== saved.category), saved] }));
          });
        }
        set((state) => ({
          budgets: [...state.budgets.filter((item) => item.category !== budget.category), { ...budget, id: makeId() }],
        }));
        return true;
      },
      addGoal: async (goal) => {
        if (isApiSession()) {
          return persistMutation(set, () => api.post("/goals", goal), ({ item }) => {
            set((state) => ({ goals: [...state.goals, normalizeGoal(item)] }));
          });
        }
        set((state) => ({ goals: [...state.goals, { ...goal, saved: 0, id: makeId() }] }));
        return true;
      },
      contributeToGoal: async (id, amount) => {
        if (isApiSession()) {
          return persistMutation(set, () => api.post(`/goals/${id}/contributions`, { amount }), ({ item }) => {
            const goal = normalizeGoal(item);
            set((state) => ({ goals: state.goals.map((row) => row.id === id ? goal : row) }));
          });
        }
        set((state) => ({
          goals: state.goals.map((goal) => goal.id === id ? { ...goal, saved: Math.min(goal.target, goal.saved + amount) } : goal),
        }));
        return true;
      },
      addCategory: async (type, category) => {
        const cleaned = category.trim();
        if (!cleaned || !["income", "expense"].includes(type)) return false;
        if (get().categories[type].some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
          set({ operationError: "That category already exists." });
          return false;
        }
        const categories = { ...get().categories, [type]: [...get().categories[type], cleaned] };
        if (isApiSession()) {
          return persistMutation(set, () => api.patch("/auth/me", { categories }), ({ user }) => {
            set({ categories: user.categories });
          });
        }
        set({ categories });
        return true;
      },
      setCurrency: async (currency) => {
        if (isApiSession()) {
          return persistMutation(set, () => api.patch("/auth/me", { currency }), () => set({ currency }));
        }
        set({ currency });
        return true;
      },
      setProfile: async (profile) => {
        if (isApiSession()) {
          return persistMutation(set, () => api.patch("/auth/me", profile), ({ user }) => {
            set({ profile: { name: user.name, email: user.email } });
          });
        }
        set((state) => ({ profile: { ...state.profile, ...profile } }));
        return true;
      },
      setTheme: async (theme) => {
        if (isApiSession()) {
          return persistMutation(set, () => api.patch("/auth/me", { theme }), () => set({ theme }));
        }
        set({ theme });
        return true;
      },
      toggleTheme: () => get().setTheme(get().theme === "light" ? "dark" : "light"),
      clearLocalData: () => set({ transactions: starterTransactions, budgets: [], goals: [] }),
    }),
    {
      name: "fintrack-data",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => demoData(),
      partialize: ({ transactions, budgets, goals, categories, currency, profile, theme }) => (
        profile.name && profile.email
          ? {}
          : { transactions, budgets, goals, categories, currency, profile, theme }
      ),
    },
  ),
);

export const useAuthStore = create(
  persist(
    (set, get) => ({
      authenticated: false,
      mode: null,
      user: null,
      error: "",
      clearError: () => set({ error: "" }),
      signInDemo: () => {
        set({ authenticated: true, mode: "demo", user: null, error: "" });
        useFinanceStore.getState().resetDemoData();
      },
      signIn: (user) => {
        set({ authenticated: true, mode: "api", user, error: "" });
        useFinanceStore.getState().resetForAccount(user);
      },
      signOut: async () => {
        const shouldEndSession = get().mode === "api";
        set({ authenticated: false, mode: null, user: null, error: "" });
        useFinanceStore.getState().resetForAccount();
        if (!shouldEndSession) return true;
        try {
          await api.post("/auth/logout");
          return true;
        } catch (error) {
          set({ error: getApiError(error) });
          return false;
        }
      },
    }),
    {
      name: "fintrack-session",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: () => ({ authenticated: false, mode: null, user: null, error: "" }),
      partialize: ({ authenticated, mode }) => ({ authenticated, mode }),
    },
  ),
);

export const selectMonthlyTransactions = (transactions, date = new Date()) => transactions.filter((transaction) => {
  const itemDate = new Date(`${transaction.date}T00:00:00`);
  return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear();
});

export function summarizeTransactions(transactions) {
  return transactions.reduce((summary, transaction) => {
    if (transaction.type === "income") summary.income += Number(transaction.amount);
    else summary.expenses += Number(transaction.amount);
    return summary;
  }, { income: 0, expenses: 0 });
}

export function formatMoney(amount, currency = "INR", compact = false) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...(compact ? { notation: "compact", compactDisplay: "short" } : {}),
  }).format(Number(amount) || 0);
}
