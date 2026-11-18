import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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

export const useFinanceStore = create(
  persist(
    (set, get) => ({
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
      categories: {
        income: ["Salary", "Freelancing", "Investment", "Business"],
        expense: ["Food", "Travel", "Shopping", "Health", "Education", "Entertainment", "Bills"],
      },
      currency: "INR",
      profile: { name: "Aarav Mehta", email: "aarav.mehta@example.com" },
      theme: "light",
      addTransaction: (transaction) => set((state) => ({
        transactions: [{ ...transaction, id: makeId() }, ...state.transactions],
      })),
      updateTransaction: (id, updates) => set((state) => ({
        transactions: state.transactions.map((transaction) => transaction.id === id ? { ...transaction, ...updates } : transaction),
      })),
      deleteTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter((transaction) => transaction.id !== id),
      })),
      addBudget: (budget) => set((state) => ({
        budgets: [...state.budgets.filter((item) => item.category !== budget.category), { ...budget, id: makeId() }],
      })),
      addGoal: (goal) => set((state) => ({ goals: [...state.goals, { ...goal, saved: 0, id: makeId() }] })),
      contributeToGoal: (id, amount) => set((state) => ({
        goals: state.goals.map((goal) => goal.id === id ? { ...goal, saved: Math.min(goal.target, goal.saved + amount) } : goal),
      })),
      addCategory: (type, category) => set((state) => {
        const cleaned = category.trim();
        if (!cleaned || state.categories[type].some((item) => item.toLowerCase() === cleaned.toLowerCase())) return state;
        return { categories: { ...state.categories, [type]: [...state.categories[type], cleaned] } };
      }),
      setCurrency: (currency) => set({ currency }),
      setProfile: (profile) => set((state) => ({ profile: { ...state.profile, ...profile } })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      clearLocalData: () => set({ transactions: starterTransactions, budgets: [], goals: [] }),
    }),
    {
      name: "fintrack-data",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ transactions, budgets, goals, categories, currency, profile, theme }) => ({
        transactions, budgets, goals, categories, currency, profile, theme,
      }),
    },
  ),
);

export const useAuthStore = create(
  persist(
    (set) => ({
      authenticated: false,
      mode: null,
      user: null,
      signInDemo: () => set({ authenticated: true, mode: "demo", user: { name: "Aarav Mehta", email: "aarav.mehta@example.com" } }),
      signIn: (user, token) => {
        localStorage.setItem("fintrack-token", token);
        set({ authenticated: true, mode: "api", user });
      },
      signOut: () => {
        localStorage.removeItem("fintrack-token");
        set({ authenticated: false, mode: null, user: null });
      },
    }),
    {
      name: "fintrack-session",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ authenticated, mode, user }) => ({ authenticated, mode, user }),
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
