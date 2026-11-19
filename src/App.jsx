import { useEffect, useRef, useState } from "react";
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowDownLeft, ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness,
  CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Coffee, CreditCard,
  Download, FileDown, Filter, Flag, Gauge, Gift, GraduationCap, HeartPulse, House,
  Lightbulb, LogOut, Menu, Moon, MoreHorizontal, Package, Pencil, Plane, Plus, Search, Settings,
  ShieldCheck, ShoppingBag, Sparkles, Sun, Target, Trash2, TrendingDown, TrendingUp, Wallet,
  X, Laptop, Utensils, ChartNoAxesCombined, CircleDollarSign, LayoutDashboard,
} from "lucide-react";
import { api, getApiError, loadAccountData } from "./api";
import { getPasswordRequirements, isStrongPassword } from "../shared/password.js";
import { useAuthStore, useFinanceStore } from "./store";
import {
  calculateBalance, calculateSavings, calculateSavingsRate, compareToPreviousMonth, formatMoney,
  formatPercent, getCategorySpend, getCategoryTotals, getMoneyFlow, getTrendData,
  selectMonthlyTransactions, summarizeTransactions, verifyBalanceConsistency,
} from "./utils/finance";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/budgets", label: "Budgets", icon: Gauge },
  { to: "/goals", label: "Savings goals", icon: Target },
  { to: "/insights", label: "AI insights", icon: Sparkles, badge: "NEW" },
  { to: "/reports", label: "Reports", icon: ChartNoAxesCombined },
];

const expenseColors = ["#6e75e8", "#f4aa62", "#55b99b", "#ec7f8e", "#69a9d8", "#a68bd2", "#9aa5b2"];
const iconByCategory = {
  Food: Utensils, Travel: Plane, Rent: House, Shopping: ShoppingBag, Health: HeartPulse, Education: GraduationCap,
  Entertainment: Gift, Gift, Bills: House, Salary: BriefcaseBusiness, Freelance: Laptop, Freelancing: Laptop,
  Investment: TrendingUp, Other: CircleDollarSign,
  Business: BriefcaseBusiness,
};
const pageTitles = {
  "/": ["Good morning", "Here’s what’s happening with your money."],
  "/transactions": ["Transactions", "Every rupee, accounted for."],
  "/budgets": ["Your budgets", "A little planning goes a long way."],
  "/goals": ["Savings goals", "Big things start with small steps."],
  "/insights": ["Your money, decoded", "Personalized insights to help you get ahead."],
  "/reports": ["Reports & analytics", "A clearer picture of your financial year."],
  "/settings": ["Settings", "Make FinTrack work the way you do."],
};

const localDate = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const isPlausibleEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

function App() {
  const { theme, setTheme } = useFinanceStore();
  return (
    <div className={`app-root theme-${theme}`}>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function ProtectedRoute() {
  const authenticated = useAuthStore((state) => state.authenticated);
  const location = useLocation();
  return authenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInDemo, signIn, clearError } = useAuthStore();
  const authError = useAuthStore((state) => state.error);
  const [registering, setRegistering] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [feedback, setFeedback] = useState("");
  const form = useForm({ defaultValues: { name: "", email: "", password: "" } });
  const redirect = location.state?.from?.pathname || "/";

  const onSubmit = async ({ name, email, password }) => {
    setFeedback("");
    clearError();
    try {
      if (resetMode) {
        await api.post("/auth/forgot-password", { email });
        setFeedback("If your account exists, we’ll email you a reset link.");
        return;
      }
      const { data } = await api.post(registering ? "/auth/register" : "/auth/login", { name, email, password });
      if (registering) {
        setFeedback(data.message);
        return;
      }
      signIn(data.user);
      navigate(redirect, { replace: true });
    } catch (error) {
      setFeedback(getApiError(error));
    }
  };
  const resendVerification = async () => {
    setFeedback("");
    try {
      const { data } = await api.post("/auth/resend-verification", { email: form.getValues("email") });
      setFeedback(data.message);
    } catch (error) { setFeedback(getApiError(error)); }
  };

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <BrandMark />
        <div className="auth-brand-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> MONEY, MEET CLARITY</div>
          <h1>Feel good<br />about your <span>money.</span></h1>
          <p>One calm place to see where it goes, grow what stays, and plan what’s next.</p>
        </div>
        <div className="auth-mini-card">
          <div className="mini-card-top"><span>Your money, in focus</span><TrendingUp size={16} /></div>
          <strong>One clear view</strong>
          <span className="mini-positive">Every transaction, accounted for</span>
        </div>
        <p className="auth-quote">“It’s not about having more. It’s about making more of what you have.”</p>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-form-mobile-brand"><BrandMark /></div>
          <div className="auth-form-heading">
            <p className="eyebrow">{resetMode ? "ACCOUNT RECOVERY" : registering ? "YOUR NEXT CHAPTER" : "WELCOME BACK"}</p>
            <h2>{resetMode ? "Reset your password" : registering ? "Create your account" : "Let’s get you in."}</h2>
            <p>{resetMode ? "Enter the email linked to your account." : registering ? "A better relationship with money starts here." : "Your money dashboard is right where you left it."}</p>
          </div>
          <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)}>
            {registering && !resetMode && <FormField label="Your name" error={form.formState.errors.name?.message}><input placeholder="Your name" {...form.register("name", { required: "Please enter your name", minLength: { value: 2, message: "Use at least 2 characters" }, maxLength: { value: 80, message: "Use at most 80 characters" } })} /></FormField>}
            <FormField label="Email address" error={form.formState.errors.email?.message}><input type="email" placeholder="you@example.com" autoComplete="email" {...form.register("email", { required: "Enter your email address", validate: (email) => isPlausibleEmail(email.trim()) || "Enter a valid email address" })} /></FormField>
            {!resetMode && <FormField label="Password" error={form.formState.errors.password?.message}><input type="password" placeholder={registering ? "Create a strong password" : "Your password"} autoComplete={registering ? "new-password" : "current-password"} {...form.register("password", { required: "Enter your password", ...(registering ? { minLength: { value: 8, message: "Use at least 8 characters" }, validate: (password) => isStrongPassword(password) || "Use 8–72 characters with uppercase and lowercase letters, a number, and a symbol." } : {}) })} />{registering && <PasswordRequirements password={form.watch("password")} />}</FormField>}
            {(feedback || authError) && <p className="form-feedback" role="status">{feedback || authError}</p>}
            {!registering && !resetMode && <button className="text-button forgot-button" type="button" onClick={() => { setResetMode(true); setFeedback(""); }}>Forgot password?</button>}
            <button type="submit" className="button button-primary auth-submit">{form.formState.isSubmitting ? "Please wait..." : resetMode ? "Send reset link" : registering ? "Create account" : "Sign in"} <ArrowRight size={17} /></button>
          </form>
          {resetMode ? <p className="auth-switch"><button type="button" onClick={() => { setResetMode(false); setFeedback(""); }}>Back to sign in</button></p> : (
            <p className="auth-switch">{registering ? "Already have an account?" : "New to FinTrack?"} <button type="button" onClick={() => { setRegistering(!registering); setFeedback(""); }}> {registering ? "Sign in" : "Create an account"}</button></p>
          )}
          {!resetMode && <p className="auth-switch"><button type="button" onClick={resendVerification}>Resend email verification</button></p>}
          <div className="auth-divider"><span /> <small>OR START WITH A BLANK WORKSPACE</small> <span /></div>
          <button type="button" className="button button-secondary demo-button" onClick={() => { signInDemo(); navigate("/", { replace: true }); }}>Try a blank workspace <ArrowRight size={16} /></button>
          <p className="auth-terms">By continuing, you agree to our <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</p>
        </div>
      </section>
    </main>
  );
}

function VerifyEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState("Verifying your email…");
  const [failed, setFailed] = useState(false);
  const attempted = useRef(false);
  useEffect(() => {
    if (attempted.current) return undefined;
    attempted.current = true;
    let active = true;
    api.post("/auth/verify-email", { token })
      .then(({ data }) => { if (active) setFeedback(data.message); })
      .catch((error) => { if (active) { setFailed(true); setFeedback(getApiError(error)); } });
    return () => { active = false; };
  }, [token]);
  return <main className="auth-page reset-page"><section className="auth-form-panel"><div className="auth-form-wrap">
    <div className="auth-form-mobile-brand"><BrandMark /></div>
    <div className="auth-form-heading"><p className="eyebrow">EMAIL CONFIRMATION</p><h2>{failed ? "We couldn’t verify that link" : "Your email is verified"}</h2><p>{feedback}</p></div>
    <button className="button button-primary auth-submit" type="button" onClick={() => navigate("/login", { replace: true })}>{failed ? "Back to sign in" : "Sign in"}</button>
  </div></section></main>;
}

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError(false);
    setFeedback("");
    if (!isStrongPassword(password)) {
      setError(true);
      setFeedback("Use 8–72 characters with uppercase and lowercase letters, a number, and a symbol.");
      return;
    }
    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      setFeedback(data.message);
    } catch (issue) {
      setError(true);
      setFeedback(getApiError(issue));
    }
  };

  return <main className="auth-page reset-page"><section className="auth-form-panel"><div className="auth-form-wrap">
    <div className="auth-form-mobile-brand"><BrandMark /></div>
    <div className="auth-form-heading"><p className="eyebrow">ACCOUNT RECOVERY</p><h2>Choose a new password</h2><p>Make it unique to your FinTrack account.</p></div>
    <form className="auth-form" onSubmit={submit}>
      <FormField label="New password"><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><PasswordRequirements password={password} /></FormField>
      {feedback && <p className={error ? "form-feedback" : "success-message"} role={error ? "alert" : "status"}>{feedback}</p>}
      {error ? <button className="button button-primary auth-submit" type="submit">Try again</button> : feedback ? <button className="button button-primary auth-submit" type="button" onClick={() => navigate("/login", { replace: true })}>Back to sign in</button> : <button className="button button-primary auth-submit" type="submit">Reset password</button>}
    </form>
  </div></section></main>;
}

function BrandMark({ compact = false }) {
  return <Link to="/" className={`brand-mark ${compact ? "brand-compact" : ""}`}><span className="brand-icon"><span /><span /><span /></span><span>fintrack<span className="brand-ai">.ai</span></span></Link>;
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(useAuthStore.getState().mode === "api");
  const [dataLoadError, setDataLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const location = useLocation();
  const { profile, theme, toggleTheme, transactions, budgets, goals, currency } = useFinanceStore();
  const operationError = useFinanceStore((state) => state.operationError);
  const clearOperationError = useFinanceStore((state) => state.clearOperationError);
  const replaceAccountData = useFinanceStore((state) => state.replaceAccountData);
  const mode = useAuthStore((state) => state.mode);
  const authUserId = useAuthStore((state) => state.user?.id);
  const signOut = useAuthStore((state) => state.signOut);
  const page = pageTitles[location.pathname] || pageTitles["/"];
  const firstName = profile.name.trim().split(/\s+/)[0];
  const pageTitle = location.pathname === "/" && firstName ? `${page[0]}, ${firstName}` : page[0];
  const currentTransactions = selectMonthlyTransactions(transactions);
  const spending = summarizeTransactions(currentTransactions).expenses;
  useEffect(() => {
    if (mode !== "api") {
      setDataLoading(false);
      setDataLoadError("");
      return undefined;
    }
    let active = true;
    setDataLoading(true);
    setDataLoadError("");
    loadAccountData()
      .then((data) => {
        if (active) replaceAccountData(data);
      })
      .catch((error) => {
        if (!active) return;
        if (error.response?.status === 401) signOut();
        else setDataLoadError(getApiError(error));
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });
    return () => { active = false; };
  }, [mode, authUserId, loadAttempt, replaceAccountData, signOut]);
  const alerts = [
    ...budgets.flatMap((budget) => {
      const spent = currentTransactions.filter((tx) => tx.type === "expense" && tx.category === budget.category).reduce((sum, tx) => sum + Number(tx.amount), 0);
      const percent = spent / budget.limit * 100;
      if (spent / budget.limit < 0.8) return [];
      const over = spent > budget.limit;
      return [{
        id: budget.id,
        title: over ? `${budget.category} is over budget` : `${budget.category} is at ${formatPercent(percent)}`,
        detail: over ? `${formatMoney(spent - budget.limit, currency)} over this month’s limit.` : spent === budget.limit ? "You’ve reached this month’s limit." : "You’re getting close to this month’s limit.",
        tone: over ? "danger" : "warning",
      }];
    }),
    ...goals.filter((goal) => goal.target > 0 && goal.saved / goal.target >= 0.8).map((goal) => ({ id: goal.id, title: `${goal.name} is almost there`, detail: `${formatMoney(goal.saved, currency)} saved so far.` })),
  ];

  if (dataLoading) return <main className="account-state"><p>Loading your account data…</p></main>;
  if (dataLoadError) return <main className="account-state"><div><h1>Couldn’t load your account</h1><p>{dataLoadError}</p><button className="button button-primary" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Try again</button><button className="button button-quiet" onClick={signOut}>Sign out</button></div></main>;

  return (
    <div className="shell">
      {sidebarOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><BrandMark compact /><button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button></div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{badge && <small>{badge}</small>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-help"><div className="help-icon"><CircleHelp size={17} /></div><strong>Need a hand?</strong><p>We’re here if you need us.</p><a href="mailto:hello@fintrack.ai">Get in touch <ArrowRight size={13} /></a></div>
        <div className="sidebar-profile">
          <div className="avatar">{initials(profile.name)}</div>
          <div className="profile-copy"><strong>{profile.name || "Demo account"}</strong><span>Personal account</span></div>
          <button className="icon-button profile-menu" title="Sign out" onClick={signOut}><LogOut size={16} /></button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button className="icon-button sidebar-toggle" onClick={() => setSidebarOpen((open) => !open)} aria-label={sidebarOpen ? "Close navigation" : "Open navigation"} aria-expanded={sidebarOpen}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{location.pathname === "/" ? "Overview" : page[0]}</strong></div>
          <div className="topbar-actions">
            <div className="top-date"><CalendarDays size={15} />{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date())}</div>
            <button className="icon-button theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === "light" ? "dark" : "light"} theme`} aria-label="Toggle theme">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
            <div className="notification-wrap">
              <button className={`icon-button notification-button ${alerts.length ? "has-alert" : ""}`} onClick={() => setAlertsOpen(!alertsOpen)} aria-label="Notifications"><Bell size={18} />{alerts.length > 0 && <i />}</button>
              {alertsOpen && <div className="notification-popover"><div className="popover-heading"><strong>Notifications</strong><span>{alerts.length} new</span></div>{alerts.length ? alerts.map((alert) => <div className={`notice-item ${alert.tone === "danger" ? "notice-danger" : ""}`} key={alert.id}><span className="notice-icon"><Bell size={15} /></span><div><strong>{alert.title}</strong><p>{alert.detail}</p></div></div>) : <div className="notice-empty"><Check size={17} /> You’re all caught up.</div>}<Link to="/budgets" className="popover-link" onClick={() => setAlertsOpen(false)}>View budgets <ArrowRight size={14} /></Link></div>}
            </div>
            <Link to="/settings" className="avatar top-avatar" aria-label="Account settings">{initials(profile.name)}</Link>
          </div>
        </header>
        <main className="page-content">
          <div className="page-heading"><div><p className="greeting-date">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p><h1>{pageTitle}</h1><p>{page[1]}</p></div>{location.pathname === "/" && <Link className="button button-primary heading-action" to="/transactions?new=1"><Plus size={17} /> Add transaction</Link>}</div>
          {operationError && <div className="error-message" role="alert"><CircleHelp size={16} /><span>{operationError}</span><button type="button" className="text-button" onClick={clearOperationError}>Dismiss</button></div>}
          <Outlet />
          <footer className="app-footer"><span>© {new Date().getFullYear()} FinTrack AI</span><span>Made for a little more financial peace of mind <span className="footer-heart">♥</span></span></footer>
        </main>
      </div>
    </div>
  );
}

function Dashboard() {
  const { transactions, budgets, goals, currency, openingBalance, categories: transactionCategories, setOpeningBalance, addTransaction, updateTransaction, deleteTransaction } = useFinanceStore();
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [transactionDialog, setTransactionDialog] = useState(null);
  const monthTx = selectMonthlyTransactions(transactions);
  const previousMonth = selectMonthlyTransactions(transactions, new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
  const thisTotals = summarizeTransactions(monthTx);
  const lastTotals = summarizeTransactions(previousMonth);
  const allTotals = summarizeTransactions(transactions);
  const balance = calculateBalance(openingBalance, transactions);
  const savings = calculateSavings(thisTotals.income, thisTotals.expenses);
  const savingRate = calculateSavingsRate(thisTotals.income, thisTotals.expenses);
  const moneyFlow = getMoneyFlow(thisTotals.income, thisTotals.expenses);
  const categories = getCategorySpend(monthTx);
  const incomeCategories = getCategoryTotals(monthTx, "income");
  const trend = getTrendData(transactions);
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const incomeDiff = compareToPreviousMonth(thisTotals.income, lastTotals.income, previousMonth.length);
  const spendingDiff = compareToPreviousMonth(thisTotals.expenses, lastTotals.expenses, previousMonth.length);
  verifyBalanceConsistency(allTotals.income, allTotals.expenses, balance, openingBalance);

  const updateBalance = async (value) => {
    const saved = await setOpeningBalance(Number(value));
    if (saved) setBalanceDialogOpen(false);
    return saved;
  };
  const saveTransaction = async (values) => {
    const transaction = { ...values, amount: Number(values.amount) };
    const saved = transactionDialog?.transaction
      ? await updateTransaction(transactionDialog.transaction.id, transaction)
      : await addTransaction(transaction);
    if (saved) setTransactionDialog(null);
    return saved;
  };

  return <div className="dashboard-page">
    <section className="stats-grid">
      <SummaryCard label="Total balance" value={formatMoney(balance, currency)} icon={Wallet} tone="violet" helper={savingRate === null ? "— of income left" : `${formatPercent(savingRate)} of income left`} actionLabel="Set opening balance" actionText="Set opening balance" onAction={() => setBalanceDialogOpen(true)} />
      <SummaryCard label="Income this month" value={formatMoney(thisTotals.income, currency)} icon={ArrowDownLeft} tone="green" helper="Compared to last month" trend={incomeDiff} showTrend details={incomeCategories} currency={currency} actionLabel="Add income" actionText="Add income" onAction={() => setTransactionDialog({ type: "income" })} />
      <SummaryCard label="Spent this month" value={formatMoney(thisTotals.expenses, currency)} icon={ArrowUpRight} tone="orange" helper={moneyFlow.spentPercent === null ? "— of income" : `${formatPercent(moneyFlow.spentPercent)} of income`} trend={spendingDiff} showTrend reverse />
      <SummaryCard label="Saved this month" value={formatMoney(savings, currency)} icon={CircleDollarSign} tone="blue" helper={savingRate === null ? "—" : `${formatPercent(savingRate)} of this month’s income`} />
    </section>

    <MoneyFlowBar income={thisTotals.income} expenses={thisTotals.expenses} flow={moneyFlow} currency={currency} />
    <section className="dashboard-grid">
      <article className="panel trend-panel">
        <PanelHeading title="Cash flow" subtitle="Your income and spending over time">
          <span className="period-pill"><span /> Last 6 months <ChevronDown size={14} /></span>
        </PanelHeading>
        <div className="chart-legend"><span><i className="legend-dot income-dot" />Income</span><span><i className="legend-dot expense-dot" />Expenses</span></div>
        <div className="chart-large"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => formatMoney(value, currency)} tick={{ fill: "var(--muted)", fontSize: 10 }} /><Tooltip content={<ChartTooltip currency={currency} />} /><Line type="monotone" dataKey="income" name="Income" stroke="#55b99b" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} /><Line type="monotone" dataKey="expenses" name="Expenses" stroke="#8783ec" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>
        <div className="chart-footnote"><span><span className="footnote-line" /> A steady month is a good month.</span><Link to="/reports">See trends <ArrowRight size={13} /></Link></div>
      </article>
      <article className="panel spending-panel">
        <PanelHeading title="Where it goes" subtitle="Spending by category this month"><button className="icon-button small-icon" aria-label="More category options"><MoreHorizontal size={19} /></button></PanelHeading>
        {categories.length ? <><div className="pie-area"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="91%" paddingAngle={4} stroke="none">{categories.map((entry, index) => <Cell key={entry.name} fill={expenseColors[index % expenseColors.length]} />)}</Pie><Tooltip content={<ChartTooltip currency={currency} />} /></PieChart></ResponsiveContainer><div className="pie-center"><span>Total spent</span><strong>{formatMoney(thisTotals.expenses, currency)}</strong><small>this month</small></div></div><div className="category-legend">{categories.map((item, index) => <div key={item.name} className="category-legend-row"><span><i style={{ background: expenseColors[index % expenseColors.length] }} />{item.name}</span><span className="category-legend-value"><strong>{formatMoney(item.value, currency)}</strong><small>{formatPercent((item.value / thisTotals.expenses) * 100)}</small></span></div>)}</div></> : <EmptyState icon={PieChart} title="Nothing to chart yet" text="Add a few expenses to see your spending breakdown." />}
      </article>
      <article className="panel recent-panel">
        <PanelHeading title="Recent transactions" subtitle="The latest activity on your account"><Link to="/transactions" className="panel-link">See all <ArrowRight size={14} /></Link></PanelHeading>
        <TransactionList transactions={recent} currency={currency} onEdit={(transaction) => setTransactionDialog({ transaction })} onDelete={(transaction) => { if (window.confirm(`Delete "${transaction.title}"? This can’t be undone.`)) deleteTransaction(transaction.id); }} />
      </article>
      <article className="panel savings-panel">
        <PanelHeading title="Savings goals" subtitle="Little by little adds up"><Link to="/goals" className="panel-link">All goals <ArrowRight size={14} /></Link></PanelHeading>
        <div className="goal-mini-list">{goals.slice(0, 2).map((goal) => <GoalMini key={goal.id} goal={goal} currency={currency} />)}</div>
        <Link to="/goals" className="add-goal-button"><span><Plus size={15} /></span> Set a new savings goal</Link>
      </article>
      <article className="panel budgets-home-panel">
        <PanelHeading title="Budget check-in" subtitle="Stay on top of your monthly plan"><Link to="/budgets" className="panel-link">Manage <ArrowRight size={14} /></Link></PanelHeading>
        <div className="budget-mini-list">{budgets.slice(0, 3).map((budget) => {
          const used = monthTx.filter((tx) => tx.type === "expense" && tx.category === budget.category).reduce((sum, tx) => sum + Number(tx.amount), 0);
          return <BudgetMini key={budget.id} name={budget.category} used={used} limit={budget.limit} currency={currency} />;
        })}</div>
        {!budgets.length && <EmptyState icon={Gauge} title="No budgets yet" text="Create a monthly plan to see your progress here." />}
      </article>
      <article className="insight-card">
        <div className="insight-spark"><Sparkles size={18} /></div><div><span className="insight-kicker">A LITTLE INSIGHT FOR YOU</span><p>{spendingDiff !== null && spendingDiff > 0 ? `Your spending is up ${formatPercent(spendingDiff)} this month. A quick look at dining could help bring it back in balance.` : "You’ve saved consistently this month. Keep it up and your goals will be closer than they look."}</p><Link to="/insights">Explore your insights <ArrowRight size={14} /></Link></div><div className="insight-orb" />
      </article>
    </section>
    {balanceDialogOpen && <BalanceUpdateDialog openingBalance={openingBalance} currency={currency} onClose={() => setBalanceDialogOpen(false)} onSave={updateBalance} />}
    {transactionDialog && <TransactionModal transaction={transactionDialog.transaction} defaultType={transactionDialog.type || "expense"} categories={transactionCategories} onClose={() => setTransactionDialog(null)} onSave={saveTransaction} />}
  </div>;
}

function SummaryCard({ label, value, icon: Icon, tone, helper, trend, reverse = false, showTrend = false, details, currency = "INR", actionLabel, actionText, onAction }) {
  const positive = reverse ? Number(trend) <= 0 : Number(trend) >= 0;
  return <article className="stat-card"><div className="stat-top"><span>{label}</span>{onAction ? <button type="button" className={`stat-action ${tone}`} onClick={onAction} aria-label={actionLabel} title={actionLabel}>{actionLabel === "Add income" ? <Plus size={14} /> : <Pencil size={13} />}{actionText}</button> : <span className={`stat-icon ${tone}`}><Icon size={18} /></span>}</div><strong className="stat-value">{value}</strong>{details && <div className="stat-breakdown">{details.length ? details.map((item) => <div key={item.name}><span>{item.name}</span><strong>{formatMoney(item.value, currency)}</strong></div>) : <span className="stat-breakdown-empty">No income categories yet</span>}</div>}<div className="stat-bottom"><span>{helper}</span>{showTrend && <span className={`stat-trend ${trend === null ? "" : positive ? "trend-positive" : "trend-negative"}`}>{trend === null ? "—" : <>{Number(trend) >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{formatPercent(Math.abs(Number(trend)))}</>}</span>}</div></article>;
}

function MoneyFlowBar({ income, expenses, flow, currency }) {
  return <section className="panel money-flow-panel" aria-label="Monthly money flow">
    <div className="money-flow-heading"><div><h2>Money flow</h2><p>Income {formatMoney(income, currency)} this month</p></div></div>
    <div className="money-flow-track" role="img" aria-label={`Spent ${formatMoney(expenses, currency)}, remaining ${formatMoney(flow.remaining, currency)}`}>
      <span className="money-flow-spent" style={{ width: `${flow.spentWidth}%` }} />
      <span className="money-flow-remaining" style={{ width: `${flow.remainingWidth}%` }} />
    </div>
    <div className="money-flow-details">
      <div><span><i className="money-flow-spent-dot" />Spent</span><strong>{formatMoney(expenses, currency)} <small>{formatPercent(flow.spentPercent)}</small></strong></div>
      <div><span><i className="money-flow-remaining-dot" />Remaining</span><strong>{formatMoney(flow.remaining, currency)} <small>{formatPercent(flow.remainingPercent)}</small></strong></div>
    </div>
  </section>;
}

function TransactionsPage() {
  const { transactions, categories, currency, addTransaction, updateTransaction, deleteTransaction } = useFinanceStore();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [dialog, setDialog] = useState(null);
  const [page, setPage] = useState(1);
  const location = useLocation();
  const pageSize = 8;
  const transactionCategories = [...new Set([
    ...categories.income,
    ...categories.expense,
    ...transactions.map((transaction) => transaction.category),
  ])];

  useEffect(() => {
    if (new URLSearchParams(location.search).get("new") === "1") setDialog({ mode: "create" });
  }, [location.search]);

  const filtered = transactions.filter((tx) => {
    const matchesText = `${tx.title} ${tx.category} ${tx.notes || ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesText && (typeFilter === "all" || tx.type === typeFilter) && (categoryFilter === "all" || tx.category === categoryFilter);
  }).sort((a, b) => sort === "date-asc" ? a.date.localeCompare(b.date) : sort === "amount-desc" ? b.amount - a.amount : b.date.localeCompare(a.date));
  const pages = Math.ceil(filtered.length / pageSize);
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);

  const save = async (values) => {
    const saved = dialog?.mode === "edit"
      ? await updateTransaction(dialog.transaction.id, { ...values, amount: Number(values.amount) })
      : await addTransaction({ ...values, amount: Number(values.amount) });
    if (saved) setDialog(null);
    return saved;
  };

  return <section className="page-section">
    <div className="list-toolbar"><div className="search-field"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search transactions..." aria-label="Search transactions" />{search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}</div><div className="toolbar-filters"><label className="select-wrap"><Filter size={15} /><select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} aria-label="Filter by transaction type"><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></label><label className="select-wrap"><select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }} aria-label="Filter by category"><option value="all">All categories</option>{transactionCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></label><button className="button button-primary" onClick={() => setDialog({ mode: "create" })}><Plus size={16} /> Add transaction</button></div></div>
    <div className="table-card"><div className="table-card-heading"><div><strong>All transactions</strong><span>{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</span></div><label className="sort-select">Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amount-desc">Largest amount</option></select><ChevronDown size={13} /></label></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
        {shown.map((tx) => <TransactionRow key={tx.id} tx={tx} currency={currency} onEdit={() => setDialog({ mode: "edit", transaction: tx })} onDelete={() => { if (window.confirm(`Delete "${tx.title}"? This can’t be undone.`)) deleteTransaction(tx.id); }} />)}
      </tbody></table></div>
      {!shown.length && <EmptyState icon={Search} title="No matches found" text={transactions.length ? "Try another search or change your filters." : "Your transactions will show up here once you add one."} />}
      <div className="table-pagination"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><div><button className="icon-button small-icon" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={17} /></button><span className="page-number">{page} / {Math.max(pages, 1)}</span><button className="icon-button small-icon" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={17} /></button></div></div>
    </div>
    {dialog && <TransactionModal transaction={dialog.transaction} categories={categories} onClose={() => setDialog(null)} onSave={save} />}
  </section>;
}

function TransactionModal({ transaction, categories, onClose, onSave, defaultType = "expense" }) {
  const defaultValues = transaction || { title: "", amount: "", type: defaultType, category: "", date: localDate(), notes: "" };
  const form = useForm({ defaultValues, mode: "onChange", shouldUnregister: true });
  const selectedType = form.watch("type");
  const submit = async (values) => {
    const category = selectedType === "income" ? "Income" : "Uncategorized";
    const saved = await onSave({ ...values, category, amount: Number(values.amount) });
    if (saved) form.reset(defaultValues);
  };
  return <Modal title={transaction ? "Edit transaction" : "Add a transaction"} subtitle="A clear picture starts with the little things." onClose={onClose}>
    <form className="dialog-form" onSubmit={form.handleSubmit(submit)}>
      <FormField label={selectedType === "income" ? "Where did this income come from?" : "What was it for?"} error={form.formState.errors.title?.message}><input placeholder={selectedType === "income" ? "e.g. Monthly salary" : "e.g. Weekly groceries"} autoFocus {...form.register("title", { required: selectedType === "income" ? "Enter an income source" : "Give this expense a name" })} /></FormField>
      <div className="form-row"><FormField label="Amount" error={form.formState.errors.amount?.message}><div className="input-prefix"><span>₹</span><input type="number" step="0.01" min="0.01" placeholder="0.00" {...form.register("amount", { required: "Enter an amount", valueAsNumber: true, min: { value: 0.01, message: "Amount should be greater than zero" } })} /></div></FormField><FormField label="Type"><select {...form.register("type")}><option value="expense">Expense</option><option value="income">Income</option></select></FormField></div>
      <FormField label="Date"><input type="date" max={localDate()} {...form.register("date", { required: "Choose a date" })} /></FormField>
      <FormField label="Notes (optional)"><textarea rows="2" placeholder={selectedType === "income" ? "e.g. November salary" : "Add a little context..."} {...form.register("notes")} /></FormField>
      <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={!form.formState.isValid || form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : transaction ? "Save changes" : "Add transaction"}</button></div>
    </form>
  </Modal>;
}

function BalanceUpdateDialog({ openingBalance, currency, onClose, onSave }) {
  const form = useForm({ defaultValues: { openingBalance } });
  const currencySymbol = new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
    .formatToParts(0).find((part) => part.type === "currency")?.value || currency;
  const submit = async ({ openingBalance: value }) => {
    await onSave(Number(value));
  };

  return <Modal title="Set opening balance" subtitle="Your total balance will include this amount plus recorded income and expenses." onClose={onClose}>
    <form className="dialog-form" onSubmit={form.handleSubmit(submit)}>
      <FormField label="Opening balance" error={form.formState.errors.openingBalance?.message}>
        <div className="input-prefix"><span>{currencySymbol}</span><input type="number" step="0.01" min="-1000000000" max="1000000000" autoFocus {...form.register("openingBalance", {
          required: "Enter your opening balance",
          valueAsNumber: true,
          min: { value: -1_000_000_000, message: "Balance must be at least -1,000,000,000" },
          max: { value: 1_000_000_000, message: "Balance must be at most 1,000,000,000" },
        })} /></div>
      </FormField>
      <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">Save balance</button></div>
    </form>
  </Modal>;
}

function TransactionRow({ tx, currency, onEdit, onDelete }) {
  const Icon = iconByCategory[tx.category] || CircleDollarSign;
  return <tr><td><div className="transaction-title-cell"><span className={`category-icon ${tx.type === "income" ? "cat-income" : ""}`}><Icon size={16} /></span><div><strong>{tx.title}</strong>{tx.notes && <small>{tx.notes}</small>}</div></div></td><td><span className="category-chip">{tx.category}</span></td><td className="date-cell">{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${tx.date}T00:00:00`))}</td><td><span className={`amount-cell ${tx.type === "income" ? "amount-income" : ""}`}>{tx.type === "income" ? "+" : "−"}{formatMoney(tx.amount, currency)}</span></td><td><div className="row-actions"><button className="icon-button small-icon" onClick={onEdit} aria-label={`Edit ${tx.title}`}><Pencil size={14} /></button><button className="icon-button small-icon delete-action" onClick={onDelete} aria-label={`Delete ${tx.title}`}><Trash2 size={14} /></button></div></td></tr>;
}

function BudgetsPage() {
  const { budgets, transactions, currency, addBudget, addCategory, categories } = useFinanceStore();
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const monthTx = selectMonthlyTransactions(transactions);
  const form = useForm({ defaultValues: { category: "", limit: "" }, mode: "onChange" });
  const submit = async (values) => {
    const enteredCategory = String(values.category || "").trim();
    if (!enteredCategory) return;
    const category = categories.expense.find((item) => item.toLowerCase() === enteredCategory.toLowerCase()) || enteredCategory;
    if (!categories.expense.some((item) => item.toLowerCase() === category.toLowerCase())
      && !(await addCategory("expense", category))) return;
    const saved = await addBudget({ ...values, category, limit: Number(values.limit) });
    if (!saved) return;
    setShowForm(false);
    setMessage(`${category} budget saved.`);
    form.reset({ category: "", limit: "" });
    window.setTimeout(() => setMessage(""), 3000);
  };
  return <section className="page-section">
    <div className="section-intro-row"><div><div className="month-label"><CalendarDays size={15} /> {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date())}</div><p className="section-intro">A budget isn’t a restriction. It’s permission to spend on what matters.</p></div><button className="button button-primary" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Create a budget</button></div>
    {message && <div className="success-message"><Check size={16} />{message}</div>}
    {showForm && <form className="inline-create-card" onSubmit={form.handleSubmit(submit)}><div className="inline-form-title"><span className="stat-icon violet"><Gauge size={17} /></span><div><strong>Plan your monthly limit</strong><p>Enter a category or choose one you created.</p></div><button type="button" className="icon-button small-icon" onClick={() => setShowForm(false)} aria-label="Close form"><X size={17} /></button></div><div className="form-row"><FormField label="Category" error={form.formState.errors.category?.message}><input list="expense-category-options" placeholder="Type a category" {...form.register("category", { required: "Enter a category", validate: (value) => Boolean(value.trim()) || "Enter a category" })} /><datalist id="expense-category-options">{categories.expense.map((category) => <option key={category} value={category} />)}</datalist></FormField><FormField label="Monthly limit" error={form.formState.errors.limit?.message}><div className="input-prefix"><span>₹</span><input type="number" min="1" placeholder="e.g. 12000" {...form.register("limit", { required: "Add a budget limit", min: { value: 1, message: "Limit should be greater than zero" } })} /></div></FormField></div><button type="submit" className="button button-primary" disabled={!form.formState.isValid || form.formState.isSubmitting}>Save budget</button></form>}
    {budgets.length ? <div className="budget-grid">{budgets.map((budget) => {
      const spent = monthTx.filter((tx) => tx.type === "expense" && tx.category === budget.category).reduce((sum, tx) => sum + Number(tx.amount), 0);
      return <BudgetCard key={budget.id} budget={budget} spent={spent} currency={currency} />;
    })}</div> : <EmptyState icon={Gauge} title="Your plan starts here" text="Set a monthly budget for the categories that matter to you." />}
    <div className="budget-tip"><div className="tip-icon"><Lightbulb size={18} /></div><div><strong>Give yourself a little breathing room</strong><p>Budgets work best when they’re realistic. Review them as your plans change, not just when the month begins.</p></div></div>
  </section>;
}

function BudgetCard({ budget, spent, currency }) {
  const ratio = spent / Math.max(budget.limit, 1);
  const percent = ratio * 100;
  const danger = spent > budget.limit;
  const atLimit = spent === budget.limit;
  const warning = ratio >= 0.8 && !danger;
  const Icon = iconByCategory[budget.category] || CircleDollarSign;
  return <article className={`budget-card ${danger ? "budget-danger" : warning ? "budget-warning" : ""}`}><div className="budget-card-top"><span className="category-icon"><Icon size={17} /></span><span className="budget-spent-label">{danger ? "Spending alert" : ""}</span></div><div className="budget-title">{budget.category}<span>{(danger || atLimit || warning) && <span className="budget-warning-label">{danger ? "Over budget" : atLimit ? "Limit reached" : "Almost there"}</span>}</span></div><div className="budget-numbers"><strong>{formatMoney(spent, currency)}</strong><span>of {formatMoney(budget.limit, currency)}</span></div><div className="progress-track"><span style={{ width: `${Math.min(percent, 100)}%` }} /></div><div className="budget-card-bottom"><span>{formatPercent(percent)} used</span><strong className={danger || atLimit || warning ? "remaining-alert" : ""}>{danger ? `${formatMoney(spent - budget.limit, currency)} over` : atLimit ? "At limit" : `${formatMoney(budget.limit - spent, currency)} left`}</strong></div></article>;
}

function PasswordRequirements({ password }) {
  return <ul className="password-requirements" aria-label="Password requirements">
    {getPasswordRequirements(password).map(({ label, met }) => <li className={met ? "requirement-met" : ""} key={label}>{label}</li>)}
  </ul>;
}

function GoalsPage() {
  const { goals, currency, addGoal, updateGoal, deleteGoal, contributeToGoal } = useFinanceStore();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [contributionGoal, setContributionGoal] = useState(null);
  const [notice, setNotice] = useState("");
  const form = useForm({ defaultValues: { name: "", target: "", deadline: "", icon: "target" } });
  const contributionForm = useForm({ defaultValues: { amount: "" } });
  const saveGoal = async (values) => {
    const payload = { ...values, target: Number(values.target) };
    if (editingGoal && payload.target < editingGoal.saved) {
      setNotice(`The target cannot be below ${formatMoney(editingGoal.saved, currency)}, already saved.`);
      return;
    }
    const saved = editingGoal ? await updateGoal(editingGoal.id, payload) : await addGoal(payload);
    if (!saved) return;
    form.reset({ name: "", target: "", deadline: "", icon: "target" });
    setShowForm(false);
    setEditingGoal(null);
    setNotice(editingGoal ? "Your savings goal has been updated." : "Your new goal is ready. One step at a time!");
    window.setTimeout(() => setNotice(""), 3500);
  };
  const editGoal = (goal) => {
    setEditingGoal(goal);
    form.reset({ name: goal.name, target: String(goal.target), deadline: goal.deadline || "", icon: goal.icon || "target" });
    setShowForm(true);
  };
  const removeGoal = async (goal) => {
    if (!window.confirm(`Delete “${goal.name}”? This cannot be undone.`)) return;
    if (await deleteGoal(goal.id)) setNotice("Savings goal deleted.");
  };
  const contribute = async (values) => {
    const saved = await contributeToGoal(contributionGoal.id, Number(values.amount));
    if (!saved) return;
    setContributionGoal(null);
    contributionForm.reset({ amount: "" });
  };
  return <section className="page-section">
    <div className="section-intro-row"><div><div className="goal-summary"><span className="goal-summary-icon"><Target size={19} /></span><span><strong>{goals.length} goals in progress</strong><small>You’re building something good.</small></span></div></div><button className="button button-primary" onClick={() => setShowForm(!showForm)}><Plus size={16} /> New savings goal</button></div>
    {notice && <div className="success-message"><Check size={16} />{notice}</div>}
    {showForm && <form className="inline-create-card goal-create" onSubmit={form.handleSubmit(saveGoal)}><div className="inline-form-title"><span className="stat-icon green"><Flag size={17} /></span><div><strong>{editingGoal ? "Update your savings goal" : "What are you saving for?"}</strong><p>Give your goal a name, amount, and a little deadline.</p></div><button type="button" className="icon-button small-icon" onClick={() => { setShowForm(false); setEditingGoal(null); form.reset(); }} aria-label="Close form"><X size={17} /></button></div><FormField label="Goal name" error={form.formState.errors.name?.message}><input placeholder="e.g. A little getaway" {...form.register("name", { required: "Add a name for your goal" })} /></FormField><div className="form-row"><FormField label="Target amount" error={form.formState.errors.target?.message}><div className="input-prefix"><span>₹</span><input type="number" min="1" placeholder="e.g. 50000" {...form.register("target", { required: "Enter your target", min: { value: 1, message: "Target should be greater than zero" } })} /></div></FormField><FormField label="Target date"><input type="date" min={localDate()} {...form.register("deadline")} /></FormField></div><button type="submit" className="button button-primary">{editingGoal ? "Save changes" : "Create this goal"}</button></form>}
    <div className="goal-grid">{goals.map((goal, index) => <GoalCard key={goal.id} goal={goal} currency={currency} index={index} onContribute={() => setContributionGoal(goal)} onEdit={() => editGoal(goal)} onDelete={() => removeGoal(goal)} />)}{!goals.length && <EmptyState icon={Target} title="Dream it, then plan it" text="Create your first savings goal and watch the progress add up." />}</div>
    <div className="goal-encouragement"><span className="encouragement-art"><Sparkles size={21} /></span><div><strong>Progress is progress, no matter how small.</strong><p>Even a tiny regular contribution can make a big difference over time.</p></div></div>
    {contributionGoal && <Modal title="Add to your goal" subtitle={`Every little bit brings ${contributionGoal.name} closer.`} onClose={() => setContributionGoal(null)}><form className="dialog-form" onSubmit={contributionForm.handleSubmit(contribute)}><FormField label="How much would you like to add?" error={contributionForm.formState.errors.amount?.message}><div className="input-prefix"><span>₹</span><input type="number" min="1" max={contributionGoal.target - contributionGoal.saved} placeholder="e.g. 2500" autoFocus {...contributionForm.register("amount", { required: "Enter an amount", min: { value: 1, message: "Add at least ₹1" }, max: { value: contributionGoal.target - contributionGoal.saved, message: "That’s more than this goal needs" } })} /></div></FormField><div className="dialog-actions"><button type="button" className="button button-quiet" onClick={() => setContributionGoal(null)}>Cancel</button><button className="button button-primary" type="submit">Add savings</button></div></form></Modal>}
  </section>;
}

function GoalCard({ goal, currency, index, onContribute, onEdit, onDelete }) {
  const percent = Math.min(100, goal.saved / Math.max(goal.target, 1) * 100);
  const icon = goal.icon === "laptop" ? Laptop : goal.icon === "plane" ? Plane : goal.icon === "shield" ? ShieldCheck : Target;
  const Icon = icon;
  const [menuOpen, setMenuOpen] = useState(false);
  return <article className={`goal-card goal-tone-${index % 3}`}><div className="goal-card-top"><span className="goal-art-icon"><Icon size={20} /></span><div className="goal-options"><button className="icon-button small-icon" type="button" aria-label={`Options for ${goal.name}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><MoreHorizontal size={19} /></button>{menuOpen && <div className="goal-options-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }}><Pencil size={14} /> Edit goal</button><button type="button" role="menuitem" className="goal-delete-option" onClick={() => { setMenuOpen(false); onDelete(); }}><Trash2 size={14} /> Delete goal</button></div>}</div></div><span className="goal-eyebrow">SAVING FOR</span><h3>{goal.name}</h3><div className="goal-amounts"><strong>{formatMoney(goal.saved, currency)}</strong><span>of {formatMoney(goal.target, currency)}</span></div><div className="progress-track goal-track"><span style={{ width: `${percent}%` }} /></div><div className="goal-progress-caption"><span>{formatPercent(percent)} there</span><span>{goal.deadline ? `Target: ${new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${goal.deadline}T00:00:00`))}` : "No deadline"}</span></div><div className="goal-card-footer"><span><span className="goal-status-dot" />{percent >= 100 ? "Goal reached!" : `${formatMoney(Math.max(goal.target - goal.saved, 0), currency)} to go`}</span><button className="button button-soft" onClick={onContribute} disabled={percent >= 100}><Plus size={15} /> Add savings</button></div></article>;
}

function GoalMini({ goal, currency }) {
  const percent = Math.min(100, goal.saved / Math.max(goal.target, 1) * 100);
  const Icon = goal.icon === "laptop" ? Laptop : goal.icon === "plane" ? Plane : ShieldCheck;
  return <div className="goal-mini"><span className="goal-mini-icon"><Icon size={17} /></span><div className="goal-mini-content"><div><strong>{goal.name}</strong><span>{formatPercent(percent)}</span></div><div className="progress-track"><span style={{ width: `${percent}%` }} /></div><small>{formatMoney(goal.saved, currency)} of {formatMoney(goal.target, currency)}</small></div></div>;
}

function InsightsPage() {
  const { transactions, currency, goals } = useFinanceStore();
  const monthTx = selectMonthlyTransactions(transactions);
  const lastTx = selectMonthlyTransactions(transactions, new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
  const current = summarizeTransactions(monthTx);
  const previous = summarizeTransactions(lastTx);
  const spendByCategory = getCategorySpend(monthTx);
  const top = spendByCategory[0];
  const spendDelta = compareToPreviousMonth(current.expenses, previous.expenses, lastTx.length);
  const savingsRate = calculateSavingsRate(current.income, current.expenses);
  const score = monthTx.length
    ? Math.max(0, Math.min(100, Math.round((savingsRate || 0) * 0.45 + (spendDelta !== null && spendDelta <= 0 ? 9 : 0) - (spendDelta || 0) * 0.15)))
    : 0;
  const mutation = useMutation({
    mutationFn: async () => (await api.post("/insights/analyze", { transactions: monthTx, previousTransactions: lastTx })).data,
  });
  const analyze = () => mutation.mutate();
  return <section className="page-section insights-page">
    <div className="insights-score-card"><div className="score-orb" style={{ background: `conic-gradient(#7672d8 0 ${score}%, #dedcf1 ${score}% 100%)` }}><div className="score-ring"><strong>{score}</strong><small>out of 100</small></div></div><div className="score-copy"><span className="insight-kicker">YOUR FINANCIAL WELLNESS</span><h2>{score >= 75 ? "You’re finding your rhythm." : "You’re building good habits."}</h2><p>Your money health score looks at spending patterns, savings progress, and how you’re tracking against your goals.</p><div className="score-pills"><span><span className="score-pip green-pip" />Savings rate <strong>{formatPercent(savingsRate)}</strong></span><span><span className="score-pip purple-pip" />Active goals <strong>{goals.length}</strong></span></div></div><Sparkles className="score-sparkle" size={40} /></div>
    <div className="insights-section-heading"><div><h2>Your monthly read</h2><p>Real patterns, kind suggestions. Never judgment.</p></div><button className="button button-secondary" onClick={analyze} disabled={mutation.isPending}><Sparkles size={15} />{mutation.isPending ? "Looking at your numbers..." : "Get AI analysis"}</button></div>
    {mutation.isError && <p className="form-feedback" role="alert">{getApiError(mutation.error)} We’ve still put together the insights below from your local data.</p>}
    {mutation.data?.insights && <div className="ai-result"><Sparkles size={16} /><div><span className="insight-kicker">{mutation.data.source === "gemini" ? "AI ANALYSIS" : "BASED ON YOUR DATA"}</span><p>{mutation.data.insights}</p></div></div>}
    <div className="insight-cards">
      <InsightCard tone="lavender" icon={TrendingUp} label="YOUR SPENDING" title={spendDelta > 0 ? `Spending is up ${formatPercent(spendDelta)}` : spendDelta < 0 ? `Spending is down ${formatPercent(Math.abs(spendDelta))}` : "You're on a steady track"} text={spendDelta > 0 ? `You spent ${formatMoney(current.expenses, currency)} this month. Take a closer look at ${top?.name?.toLowerCase() || "your flexible spending"} for an easy place to adjust.` : `You've spent ${formatMoney(current.expenses, currency)} this month. Keeping to this pace gives your savings room to grow.`} />
      <InsightCard tone="mint" icon={CircleDollarSign} label="A GENTLE NUDGE" title={top ? `${top.name} is your biggest category` : "Every little habit counts"} text={top ? `${formatPercent((top.value / Math.max(current.expenses, 1)) * 100)} of your spending is in ${top.name.toLowerCase()}. A small adjustment here could free up ${formatMoney(top.value * 0.1, currency)} a month.` : "Add a few expenses to get a clearer picture of your spending habits."} />
      <InsightCard tone="peach" icon={Target} label="LOOKING AHEAD" title={`${goals.length} lovely things to save for`} text={`You’ve got ${goals.length} active ${goals.length === 1 ? "goal" : "goals"}. Set up a small weekly transfer to keep the momentum going without thinking about it.`} />
    </div>
    <div className="insights-note"><ShieldCheck size={17} /><span>These insights are here to help you feel informed, not to give financial advice. Your choices are always yours.</span></div>
  </section>;
}

function InsightCard({ tone, icon: Icon, label, title, text }) {
  return <article className={`insight-tile ${tone}`}><div className="insight-tile-icon"><Icon size={18} /></div><span className="insight-kicker">{label}</span><h3>{title}</h3><p>{text}</p></article>;
}

function ReportsPage() {
  const { transactions, currency } = useFinanceStore();
  const [period, setPeriod] = useState("year");
  const [reportType, setReportType] = useState("category");
  const now = new Date();
  const yearTx = transactions.filter((tx) => new Date(`${tx.date}T00:00:00`).getFullYear() === now.getFullYear());
  const reportTx = period === "month" ? selectMonthlyTransactions(transactions) : yearTx;
  const totals = summarizeTransactions(reportTx);
  const categories = getCategorySpend(reportTx);
  const exportCsv = () => {
    const rows = [["Date", "Title", "Type", "Category", "Amount", "Notes"], ...reportTx.map((tx) => [tx.date, tx.title, tx.type, tx.category, tx.amount, tx.notes || ""])];
    const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    downloadFile(content, `fintrack-${period}-report.csv`, "text/csv;charset=utf-8");
  };
  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet(reportTx.map(({ date, title, type, category, amount, notes }) => ({ Date: date, Title: title, Type: type, Category: category, Amount: amount, Notes: notes || "" })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Transactions");
    XLSX.writeFile(book, `fintrack-${period}-report.xlsx`);
  };
  const exportPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("FinTrack AI", 18, 19);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`${period === "month" ? "Monthly" : "Yearly"} report · ${new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(now)}`, 18, 28);
    doc.text(`Income: ${formatMoney(totals.income, currency)}     Expenses: ${formatMoney(totals.expenses, currency)}     Net: ${formatMoney(totals.income - totals.expenses, currency)}`, 18, 39);
    doc.setFont("helvetica", "bold");
    doc.text("DATE", 18, 52); doc.text("TRANSACTION", 48, 52); doc.text("CATEGORY", 115, 52); doc.text("AMOUNT", 165, 52);
    doc.setFont("helvetica", "normal");
    let y = 61;
    for (const tx of reportTx.slice(0, 24)) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(tx.date, 18, y);
      doc.text(tx.title.slice(0, 27), 48, y);
      doc.text(tx.category.slice(0, 18), 115, y);
      doc.text(`${tx.type === "income" ? "+" : "-"}${formatMoney(tx.amount, currency)}`, 165, y);
      y += 9;
    }
    doc.save(`fintrack-${period}-report.pdf`);
  };
  const trendData = getTrendData(transactions, 12);
  return <section className="page-section report-page">
    <div className="report-controls"><div className="segmented-control" role="group" aria-label="Report period"><button className={period === "month" ? "selected" : ""} onClick={() => setPeriod("month")}>This month</button><button className={period === "year" ? "selected" : ""} onClick={() => setPeriod("year")}>This year</button></div><div className="export-actions"><button className="button button-secondary" onClick={exportCsv}><Download size={15} /> CSV</button><button className="button button-secondary" onClick={exportExcel}><FileDown size={15} /> Excel</button><button className="button button-primary" onClick={exportPdf}><FileDown size={15} /> Download PDF</button></div></div>
    <div className="report-summary-grid"><SummaryTile label="Income" value={formatMoney(totals.income, currency)} icon={ArrowDownLeft} tone="green" /><SummaryTile label="Expenses" value={formatMoney(totals.expenses, currency)} icon={ArrowUpRight} tone="orange" /><SummaryTile label="Net savings" value={formatMoney(totals.income - totals.expenses, currency)} icon={Wallet} tone="violet" /><SummaryTile label="Transactions" value={reportTx.length.toString()} icon={ArrowLeftRight} tone="blue" /></div>
    <div className="panel report-chart-panel"><PanelHeading title="Income & expenses" subtitle="A month-by-month view of your cash flow"><label className="sort-select report-type-select"><select value={reportType} onChange={(event) => setReportType(event.target.value)}><option value="category">All categories</option><option value="income">Income only</option><option value="expense">Expenses only</option></select><ChevronDown size={13} /></label></PanelHeading><div className="report-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 5" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} dy={9} /><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => formatMoney(value, currency)} tick={{ fill: "var(--muted)", fontSize: 10 }} /><Tooltip content={<ChartTooltip currency={currency} />} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} /><Bar dataKey="income" name="Income" fill="#55b99b" radius={[4, 4, 0, 0]} barSize={14} hide={reportType === "expense"} /><Bar dataKey="expenses" name="Expenses" fill="#8580e5" radius={[4, 4, 0, 0]} barSize={14} hide={reportType === "income"} /></ComposedChart></ResponsiveContainer></div></div>
    <div className="panel category-report-panel"><PanelHeading title="Spending by category" subtitle="Where your expenses are going"><span className="report-period-label">{period === "month" ? "THIS MONTH" : "THIS YEAR"}</span></PanelHeading>{categories.length ? <div className="category-report-list">{categories.map((item, index) => <div className="category-report-row" key={item.name}><span className="category-report-name"><i style={{ background: expenseColors[index % expenseColors.length] }} />{item.name}</span><div className="category-report-track"><span style={{ width: `${(item.value / categories[0].value) * 100}%`, background: expenseColors[index % expenseColors.length] }} /></div><strong>{formatMoney(item.value, currency)}</strong><small>{formatPercent((item.value / Math.max(totals.expenses, 1)) * 100)}</small></div>)}</div> : <EmptyState icon={ChartNoAxesCombined} title="Not much to report yet" text="Add some expenses and your category report will appear here." />}</div>
  </section>;
}

function SummaryTile({ label, value, icon: Icon, tone }) {
  return <div className="summary-tile"><div className={`summary-icon ${tone}`}><Icon size={17} /></div><span>{label}</span><strong>{value}</strong></div>;
}

function SettingsPage() {
  const { profile, currency, setCurrency, openingBalance, setOpeningBalance, setProfile, theme, setTheme, categories, addCategory, removeCategory } = useFinanceStore();
  const { mode } = useAuthStore();
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();
  const [categoryType, setCategoryType] = useState("expense");
  const [categoryValue, setCategoryValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const form = useForm({ defaultValues: profile });
  const balanceForm = useForm({ defaultValues: { openingBalance } });
  const updateProfile = async (values) => {
    if (!(await setProfile(values))) return;
    setMessage("Your profile details have been saved.");
    setTimeout(() => setMessage(""), 3000);
  };
  const updateOpeningBalance = async ({ openingBalance: value }) => {
    if (!(await setOpeningBalance(Number(value)))) return;
    setMessage("Your starting balance has been saved.");
    setTimeout(() => setMessage(""), 3000);
  };
  const updatePassword = async (event) => {
    event.preventDefault();
    setError(""); setMessage("");
    if (mode === "demo") { setError("Password updates are available after signing in to an account."); return; }
    if (!isStrongPassword(passwordForm.newPassword)) {
      setError("Use 8–72 characters with uppercase and lowercase letters, a number, and a symbol.");
      return;
    }
    try {
      await api.patch("/auth/password", passwordForm);
      signOut();
      navigate("/login", { replace: true });
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } catch (issue) { setError(getApiError(issue)); }
  };
  const submitCategory = async (event) => {
    event.preventDefault();
    if (!categoryValue.trim()) return;
    if (!(await addCategory(categoryType, categoryValue))) return;
    setCategoryValue("");
    setMessage("Category added.");
    setTimeout(() => setMessage(""), 3000);
  };
  const deleteCategory = async (category) => {
    if (!window.confirm(`Remove the ${category} category? Existing transactions will keep their category name.`)) return;
    if (await removeCategory(categoryType, category)) {
      setMessage("Category removed.");
      setTimeout(() => setMessage(""), 3000);
    }
  };
  return <section className="page-section settings-page">
    {(message || error) && <div className={error ? "error-message" : "success-message"}>{error ? <CircleHelp size={16} /> : <Check size={16} />}{error || message}</div>}
    <div className="settings-layout">
      <div className="settings-main">
        <article className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon"><div className="avatar settings-avatar">{initials(profile.name)}</div></span><div><h2>Personal details</h2><p>The account details we use to personalize your experience.</p></div></div><form className="settings-form" onSubmit={form.handleSubmit(updateProfile)}><div className="form-row"><FormField label="Full name"><input {...form.register("name", { required: "Enter your name" })} /></FormField><FormField label="Email address"><input type="email" {...form.register("email", { required: "Enter your email" })} /></FormField></div><div className="settings-actions"><span>Your information is private to you.</span><button type="submit" className="button button-primary">Save changes</button></div></form></article>
        <article className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon"><Wallet size={20} /></span><div><h2>Starting balance</h2><p>Set the balance you had before tracking transactions. Your dashboard adds recorded income and subtracts expenses from it.</p></div></div><form className="settings-form" onSubmit={balanceForm.handleSubmit(updateOpeningBalance)}><FormField label="Starting balance" error={balanceForm.formState.errors.openingBalance?.message}><div className="input-prefix"><span>{new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((part) => part.type === "currency")?.value || currency}</span><input type="number" step="0.01" min="-1000000000" max="1000000000" {...balanceForm.register("openingBalance", { required: "Enter your starting balance", valueAsNumber: true, min: { value: -1000000000, message: "Balance must be at least -1,000,000,000" }, max: { value: 1000000000, message: "Balance must be at most 1,000,000,000" } })} /></div></FormField><div className="settings-actions"><span>Income, spending, and savings are calculated from your transactions.</span><button type="submit" className="button button-primary">Save balance</button></div></form></article>
        <article className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon"><ShieldCheck size={20} /></span><div><h2>Security</h2><p>Keep your account safe and sound.</p></div></div><form className="settings-form" onSubmit={updatePassword}><div className="form-row"><FormField label="Current password"><input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></FormField><FormField label="New password"><input type="password" minLength={8} autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /><PasswordRequirements password={passwordForm.newPassword} /></FormField></div><div className="settings-actions"><span>Use a unique password for this account.</span><button className="button button-secondary" type="submit">Update password</button></div></form></article>
        <article className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon"><Package size={20} /></span><div><h2>Your categories</h2><p>Add categories you need, or remove ones you no longer use.</p></div></div><form className="add-setting-category" onSubmit={submitCategory}><select value={categoryType} onChange={(event) => setCategoryType(event.target.value)} aria-label="Category type"><option value="expense">Expense</option><option value="income">Income</option></select><input value={categoryValue} onChange={(event) => setCategoryValue(event.target.value)} placeholder="Name your category" /><button className="button button-secondary" type="submit" disabled={!categoryValue.trim()}><Plus size={15} /> Add</button></form><div className="settings-category-list">{categories[categoryType].length ? categories[categoryType].map((category, index) => <span key={category} style={{ "--category-color": expenseColors[index % expenseColors.length] }}><i />{category}<button type="button" className="category-delete" onClick={() => deleteCategory(category)} aria-label={`Remove ${category}`} title={`Remove ${category}`}><Trash2 size={13} /></button></span>) : <span className="stat-breakdown-empty">No categories yet. Add one above.</span>}</div></article>
      </div>
      <aside className="settings-side">
        <article className="settings-card preference-card"><div className="settings-card-heading"><span className="settings-card-icon"><CircleDollarSign size={20} /></span><div><h2>Preferences</h2><p>Small details, your way.</p></div></div><label className="preference-row"><span><strong>Currency</strong><small>Used across your dashboard</small></span><select value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="INR">₹ INR</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option><option value="GBP">£ GBP</option><option value="CAD">C$ CAD</option><option value="AUD">A$ AUD</option></select></label><div className="preference-row"><span><strong>Appearance</strong><small>Make yourself at home</small></span><div className="theme-choice"><button className={theme === "light" ? "selected" : ""} aria-label="Light theme" onClick={() => setTheme("light")}><Sun size={16} /></button><button className={theme === "dark" ? "selected" : ""} aria-label="Dark theme" onClick={() => setTheme("dark")}><Moon size={16} /></button></div></div></article>
        <article className="privacy-card"><span className="privacy-lock"><ShieldCheck size={19} /></span><h3>Your money is your business.</h3><p>Your financial information is personal. It’s kept private and is never sold.</p><a href="#privacy">Learn about privacy <ArrowRight size={14} /></a></article>
      </aside>
    </div>
  </section>;
}

function Modal({ title, subtitle, onClose, children }) {
  const operationError = useFinanceStore((state) => state.operationError);
  const clearOperationError = useFinanceStore((state) => state.clearOperationError);
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-heading"><div className="modal-heading"><div><h2 id="modal-heading">{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>{operationError && <div className="error-message" role="alert"><CircleHelp size={16} /><span>{operationError}</span><button type="button" className="text-button" onClick={clearOperationError}>Dismiss</button></div>}{children}</section></div>;
}

function FormField({ label, error, children }) {
  return <label className={`form-field ${error ? "has-error" : ""}`}><span>{label}</span>{children}{error && <small role="alert">{error}</small>}</label>;
}

function PanelHeading({ title, subtitle, children }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{children}</div>;
}

function TransactionList({ transactions, currency, onEdit, onDelete }) {
  return <div className="transaction-list">{transactions.length ? transactions.map((tx) => {
    const Icon = iconByCategory[tx.category] || CircleDollarSign;
    return <div className="transaction-list-row" key={tx.id}><span className={`category-icon ${tx.type === "income" ? "cat-income" : ""}`}><Icon size={16} /></span><div className="transaction-list-copy"><strong>{tx.title}</strong><span>{tx.category} <i /> {new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(`${tx.date}T00:00:00`))}</span></div><strong className={`list-amount ${tx.type === "income" ? "amount-income" : ""}`}>{tx.type === "income" ? "+" : "−"}{formatMoney(tx.amount, currency)}</strong><div className="transaction-list-actions"><button type="button" className="icon-button small-icon" onClick={() => onEdit?.(tx)} aria-label={`Edit ${tx.title}`}><Pencil size={14} /></button><button type="button" className="icon-button small-icon delete-action" onClick={() => onDelete?.(tx)} aria-label={`Delete ${tx.title}`}><Trash2 size={14} /></button></div></div>;
  }) : <EmptyState icon={ArrowLeftRight} title="No transactions yet. Add your first one." text="Record an income or expense to see it here." />}</div>;
}

function BudgetMini({ name, used, limit, currency }) {
  const percent = (used / Math.max(limit, 1)) * 100;
  const over = used > limit;
  return <div className={`budget-mini ${over ? "budget-mini-danger" : ""}`}><div className="budget-mini-top"><span>{name}</span><strong>{formatMoney(used, currency)} <small>of {formatMoney(limit, currency)}</small></strong></div><div className={`progress-track ${over ? "progress-danger" : used / Math.max(limit, 1) >= 0.8 ? "progress-warn" : ""}`}><span style={{ width: `${Math.min(100, percent)}%` }} /></div></div>;
}

function EmptyState({ icon: Icon = Package, title, text }) {
  return <div className="empty-state"><span><Icon size={20} /></span><strong>{title}</strong><p>{text}</p></div>;
}

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.dataKey}><i style={{ backgroundColor: item.color }} />{item.name || item.dataKey}<b>{formatMoney(item.value, currency)}</b></span>)}</div>;
}

function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "FT";
}

function csvCell(value) {
  const text = String(value).replaceAll('"', '""');
  return /[",\r\n]/.test(text) ? `"${text}"` : text;
}

function downloadFile(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default App;
