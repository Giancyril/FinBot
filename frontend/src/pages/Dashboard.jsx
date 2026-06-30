import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PlaidLink from '../components/PlaidLink';
import TransactionList from '../components/TransactionList';
import CategoryBarChart from '../components/charts/CategoryBarChart';
import SpendingLineChart from '../components/charts/SpendingLineChart';
import CustomSelectDropdown from '../components/CustomSelectDropdown';
import {
  Wallet, MessageSquare, LogOut, RefreshCw, DollarSign,
  TrendingUp, Receipt, ShoppingBag, ArrowRight, Bot,
  LayoutDashboard, ChevronDown, Sparkles, Trash2,
} from 'lucide-react';

const CATEGORIES = ['Food and Drink', 'Shops', 'Travel', 'Service', 'Recreation', 'Transfer', 'Payment'];

// ── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon, accent, subColor }) => (
  <div className={`relative bg-gray-900 border border-white/5 rounded-2xl p-4 flex flex-col gap-2.5 overflow-hidden`}>
    <div className={`absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 ${accent} blur-3xl scale-150 pointer-events-none`} />
    <div className="relative flex items-start justify-between">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent} bg-opacity-10`}>{icon}</div>
    </div>
    <div className="relative">
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-gray-500 text-[11px] mt-0.5 font-medium">{label}</p>
      {sub && <p className={`text-[10px] mt-1 font-medium ${subColor ?? 'text-gray-600'}`}>{sub}</p>}
    </div>
  </div>
);

const SectionHeader = ({ title, sub, action }) => (
  <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-white/5">
    <div>
      <h3 className="text-white text-sm font-semibold">{title}</h3>
      {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
    </div>
    {action}
  </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [budgetCategory, setBudgetCategory] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, catRes, trendRes, budgetRes] = await Promise.all([
        axios.get('/api/transactions/summary'),
        axios.get('/api/transactions/by-category'),
        axios.get('/api/transactions/daily-trend'),
        axios.get('/api/budgets'),
      ]);
      setSummary(sumRes.data);
      setCategoryData(catRes.data || []);
      setTrendData(trendRes.data || []);
      setBudgets(budgetRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!budgetCategory || !budgetLimit || parseFloat(budgetLimit) <= 0) return;
    try {
      await axios.post('/api/budgets', {
        category: budgetCategory,
        limit_amount: parseFloat(budgetLimit),
      });
      setBudgetCategory('');
      setBudgetLimit('');
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBudget = async (id) => {
    try {
      await axios.delete(`/api/budgets/${id}`);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await axios.post('/api/transactions/sync');
      setRefreshKey(k => k + 1);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Wallet size={18} className="text-indigo-400" />
        </div>
        <div className="w-5 h-5 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
        <p className="text-gray-600 text-xs">Loading dashboard...</p>
      </div>
    </div>
  );

  const topCat = categoryData[0];
  const biggestTx = summary?.biggest_transaction;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ── Navbar ── */}
      <nav className="bg-gray-900/85 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 transition-all">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Wallet size={15} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              FinAI
            </span>
          </div>

          {/* Tabs */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-950/50 border border-white/5 rounded-xl p-1">
            {[
              { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={12} /> },
              { key: 'transactions', label: 'Transactions', icon: <Receipt size={12} /> },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.key ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link to="/chat"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/35 text-indigo-400 text-xs font-semibold rounded-xl transition-all shadow-sm">
              <Bot size={12} /> <span className="hidden sm:inline">Ask AI</span>
            </Link>
            <button onClick={handleSync} disabled={syncing}
              className="w-9 h-9 flex items-center justify-center bg-gray-800/40 border border-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40">
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center bg-gray-800/40 border border-white/5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-all">
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </nav>

      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-5 sm:py-6 space-y-4 sm:space-y-5">

        {/* ── Welcome Banner ── */}
        <div className="relative bg-gray-900 border border-white/5 rounded-2xl p-4 sm:p-5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Good to see you{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Here's your financial overview for this period.</p>
            </div>
            <PlaidLink onSyncComplete={() => { setRefreshKey(k => k + 1); fetchData(); }} />
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Spent" value={summary?.total_spent != null ? `$${Number(summary.total_spent).toFixed(2)}` : '—'}
            sub={`${summary?.transaction_count ?? 0} transactions`} subColor="text-indigo-400"
            icon={<DollarSign size={14} className="text-indigo-400" />} accent="bg-indigo-500/5" />
          <StatCard
            label="Avg per Transaction" value={summary?.avg_transaction != null ? `$${Number(summary.avg_transaction).toFixed(2)}` : '—'}
            sub="per purchase" subColor="text-cyan-400"
            icon={<TrendingUp size={14} className="text-cyan-400" />} accent="bg-cyan-500/5" />
          <StatCard
            label="Top Category" value={topCat?.category ?? '—'}
            sub={topCat ? `$${Number(topCat.total).toFixed(2)} spent` : 'No data'} subColor="text-violet-400"
            icon={<ShoppingBag size={14} className="text-violet-400" />} accent="bg-violet-500/5" />
          <StatCard
            label="Biggest Transaction" value={biggestTx ? `$${Number(biggestTx.amount).toFixed(2)}` : '—'}
            sub={biggestTx?.merchant_name || biggestTx?.name || 'N/A'} subColor="text-amber-400"
            icon={<Receipt size={14} className="text-amber-400" />} accent="bg-amber-500/5" />
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Category breakdown */}
              <div className="bg-gray-900 border border-white/5 rounded-2xl flex flex-col">
                <SectionHeader title="Spending by Category" sub="Where your money goes" />
                <div className="p-4 sm:p-5">
                  <div className="h-52">
                    <CategoryBarChart data={categoryData} />
                  </div>
                  {/* Category legend pills */}
                  {categoryData.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-1.5">
                      {categoryData.slice(0, 4).map((c, i) => {
                        const colors = ['text-indigo-400 bg-indigo-400/10 border-indigo-400/20', 'text-violet-400 bg-violet-400/10 border-violet-400/20', 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', 'text-amber-400 bg-amber-400/10 border-amber-400/20'];
                        return (
                          <div key={c.category} className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] font-medium ${colors[i]}`}>
                            <span className="truncate">{c.category}</span>
                            <span className="ml-2 font-bold shrink-0">${Number(c.total).toFixed(0)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Spending trend */}
              <div className="bg-gray-900 border border-white/5 rounded-2xl flex flex-col">
                <SectionHeader title="Cumulative Spending" sub="Daily running total this period"
                  action={<span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Live</span>} />
                <div className="p-4 sm:p-5">
                  <div className="h-52">
                    <SpendingLineChart data={trendData} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Transactions & Budgets ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Recent Transactions */}
              <div className="bg-gray-900 border border-white/5 rounded-2xl lg:col-span-2">
                <SectionHeader title="Recent Transactions" sub="Latest 10 transactions"
                  action={
                    <button onClick={() => setActiveTab('transactions')}
                      className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                      View all <ArrowRight size={10} />
                    </button>
                  } />
                <div className="p-4 sm:p-5">
                  <TransactionList refreshTrigger={refreshKey} />
                </div>
              </div>

              {/* Monthly Budgets */}
              <div className="bg-gray-900 border border-white/5 rounded-2xl flex flex-col">
                <SectionHeader title="Monthly Budgets" sub="Set limits and track spending" />
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                  {/* Set Budget Form */}
                  <form onSubmit={handleSetBudget} className="space-y-2">
                    <div className="flex gap-2">
                      <CustomSelectDropdown
                        value={budgetCategory}
                        onChange={setBudgetCategory}
                        options={CATEGORIES}
                        placeholder="Category"
                        className="flex-1"
                      />
                      <input
                        type="number"
                        placeholder="Limit ($)"
                        value={budgetLimit}
                        onChange={(e) => setBudgetLimit(e.target.value)}
                        className="w-24 bg-gray-800/60 border border-white/5 text-white placeholder-gray-600 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-white/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/35 text-indigo-400 text-xs font-semibold rounded-xl transition-all shadow-sm"
                    >
                      Set Limit
                    </button>
                  </form>

                  {/* Budgets List */}
                  <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[300px] pr-1 min-h-[150px]">
                    {budgets.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-gray-600 text-xs">No budgets configured yet</p>
                        <p className="text-gray-700 text-[10px] mt-1">Set a budget above to start tracking</p>
                      </div>
                    ) : (
                      budgets.map((b) => {
                        const spent = categoryData.find((c) => c.category === b.category)?.total || 0;
                        const limit = Number(b.limit_amount);
                        const percent = Math.min(100, Math.round((spent / limit) * 100));

                        let progressColor = 'bg-indigo-500';
                        if (percent >= 100) progressColor = 'bg-red-500';
                        else if (percent >= 80) progressColor = 'bg-amber-500';

                        return (
                          <div key={b.id} className="space-y-1.5 group">
                            <div className="flex items-center justify-between text-[11px] font-medium">
                              <span className="text-gray-300">{b.category}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">
                                  ${spent.toFixed(0)} <span className="text-gray-600">/ ${limit.toFixed(0)}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBudget(b.id)}
                                  className="text-gray-600 hover:text-red-400 transition-colors duration-150 p-0.5"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden border border-white/[0.02]">
                              <div
                                className={`h-full ${progressColor} transition-all duration-500 rounded-full`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── AI Chat CTA ── */}
            <Link to="/chat"
              className="group flex items-center justify-between bg-gray-900 border border-white/5 hover:border-indigo-500/20 rounded-2xl p-4 sm:p-5 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Sparkles size={16} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Ask AI about your finances</p>
                  <p className="text-gray-500 text-xs mt-0.5">"How much did I spend on food this month?"</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-xl">
                  <Bot size={12} /> Chat with AI
                </span>
                <ArrowRight size={14} className="text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          </>
        ) : (
          /* ── Transactions Tab ── */
          <div className="bg-gray-900 border border-white/5 rounded-2xl">
            <SectionHeader title="All Transactions" sub="Search, filter and browse your transaction history"
              action={
                <button onClick={() => setActiveTab('overview')}
                  className="text-[11px] text-gray-500 hover:text-gray-300 font-medium transition-colors">
                  ← Back
                </button>
              } />
            <div className="p-4 sm:p-5">
              <TransactionList refreshTrigger={refreshKey} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center py-2">
          <p className="text-[10px] text-gray-700">FinAI · Powered by Gemini · Plaid Sandbox</p>
        </div>
      </div>
    </div>
  );
}
