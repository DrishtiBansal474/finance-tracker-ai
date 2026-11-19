import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api, getApiError, normalizeBudget, normalizeGoal, normalizeTransaction } from "./api";
import { emptyCategories, migrateLegacyCategories, normalizeCategories } from "../shared/categories.js";
export { formatMoney, selectMonthlyTransactions, summarizeTransactions } from "./utils/finance";

const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const demoData = () => ({
  transactions: [],
  budgets: [],
  goals: [],
  categories: emptyCategories(),
  currency: "INR",
  openingBalance: 0,
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
      replaceAccountData: (data) => set({
        ...data,
        categories: normalizeCategories(data.categories),
        openingBalance: Number(data.openingBalance) || 0,
        operationError: "",
      }),
      resetForAccount: (user = {}) => set({
        transactions: [],
        budgets: [],
        goals: [],
        categories: normalizeCategories(user.categories),
        currency: user.currency || "INR",
        openingBalance: Number(user.openingBalance) || 0,
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
      updateGoal: async (id, updates) => {
        if (isApiSession()) {
          return persistMutation(set, () => api.patch(`/goals/${id}`, updates), ({ item }) => {
            const goal = normalizeGoal(item);
            set((state) => ({ goals: state.goals.map((row) => row.id === id ? goal : row) }));
          });
        }
        set((state) => ({ goals: state.goals.map((goal) => goal.id === id ? { ...goal, ...updates } : goal) }));
        return true;
      },
      deleteGoal: async (id) => {
        if (isApiSession()) {
          return persistMutation(set, () => api.delete(`/goals/${id}`), () => {
            set((state) => ({ goals: state.goals.filter((goal) => goal.id !== id) }));
          });
        }
        set((state) => ({ goals: state.goals.filter((goal) => goal.id !== id) }));
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
      removeCategory: async (type, category) => {
        if (!['income', 'expense'].includes(type) || !get().categories[type].includes(category)) return false;
        const categories = { ...get().categories, [type]: get().categories[type].filter((item) => item !== category) };
        if (isApiSession()) {
          return persistMutation(set, () => api.patch('/auth/me', { categories }), ({ user }) => {
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
      setOpeningBalance: async (openingBalance) => {
        if (isApiSession()) {
          return persistMutation(set, () => api.patch("/auth/me", { openingBalance }), ({ user }) => {
            set({ openingBalance: Number(user.openingBalance) || 0 });
          });
        }
        set({ openingBalance });
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
      clearLocalData: () => set({ transactions: [], budgets: [], goals: [] }),
    }),
    {
      name: "fintrack-data",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persistedState) => {
        const saved = persistedState && typeof persistedState === "object" ? persistedState : {};
        return {
          ...demoData(),
          ...saved,
          transactions: Array.isArray(saved.transactions)
            ? saved.transactions.filter((transaction) => transaction && !/^tx-[1-9]$/.test(String(transaction.id)))
            : [],
          budgets: Array.isArray(saved.budgets)
            ? saved.budgets.filter((budget) => budget && !/^b-[1-4]$/.test(String(budget.id)))
            : [],
          goals: Array.isArray(saved.goals)
            ? saved.goals.filter((goal) => goal && !/^g-[1-3]$/.test(String(goal.id)))
            : [],
          openingBalance: Number(saved.openingBalance) || 0,
          categories: migrateLegacyCategories(saved.categories),
        };
      },
      partialize: ({ transactions, budgets, goals, categories, currency, openingBalance, profile, theme }) => ({
        transactions,
        openingBalance,
        ...(profile.name && profile.email ? {} : { budgets, goals, categories, currency, profile, theme }),
      }),
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
