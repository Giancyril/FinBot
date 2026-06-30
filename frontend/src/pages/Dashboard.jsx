import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PlaidLink from '../components/PlaidLink';
import CategoryBarChart from '../components/charts/CategoryBarChart';
import SpendingLineChart from '../components/charts/SpendingLineChart';
import TransactionList from '../components/TransactionList';
import {
  Wallet,
  TrendingUp,
  MessageSquareCode,
  DollarSign,
  Calendar,
  AlertCircle,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/transactions/summary');
      if (response.data) {
        setSummaryData(response.data);
      }
    } catch (err) {
      console.error('Failed to load transaction summary:', err);
      // Suppress full error if it's just 404 because no bank is connected yet
      if (err.response?.status !== 404) {
        setError('Failed to fetch dashboard metrics.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [refreshTrigger]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError('');
      await axios.post('/api/transactions/sync');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Sync failed:', err);
      setError('Failed to sync bank transactions.');
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const totalSpent = Number(summaryData?.summary?.total_spent || 0);
  const transactionCount = parseInt(summaryData?.summary?.transaction_count || 0);
  const biggestTx = Number(summaryData?.summary?.biggest_transaction || 0);
  const topCategory = summaryData?.by_category?.[0]?.category || 'N/A';

  return (
    <div className="min-h-screen bg-[#07080d] flex flex-col relative overflow-hidden pb-12">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-900/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header bar */}
      <header className="glass-card rounded-none border-t-0 border-x-0 py-4 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
            FinAI Dashboard
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Active: <strong className="text-slate-200">{user?.email}</strong>
          </span>
          <button
            onClick={logout}
            className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main dashboard content container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 z-10 flex flex-col gap-6">
        
        {/* Top welcome row */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">Financial Overview</h1>
            <p className="text-sm text-slate-400 mt-1">Review spending breakdowns or talk to your AI assistant.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {summaryData && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="btn btn-secondary py-2 px-4 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Transactions'}</span>
              </button>
            )}
            <Link to="/chat" className="btn btn-primary py-2 px-4 text-sm flex items-center gap-2">
              <MessageSquareCode className="w-4 h-4" />
              <span>Ask AI Chat</span>
            </Link>
          </div>
        </section>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Check if Plaid is connected: If not, display connection banner */}
        {!summaryData?.by_category || summaryData.by_category.length === 0 ? (
          <section className="glass-card p-8 flex flex-col items-center justify-center text-center max-w-xl mx-auto mt-6">
            <TrendingUp className="w-12 h-12 text-indigo-400/80 mb-3" />
            <h2 className="text-xl font-bold text-slate-200">Connect Your Bank Account</h2>
            <p className="text-sm text-slate-400 mt-1.5 mb-6 max-w-sm">
              We sync transactions securely using Plaid sandbox. Complete link setup to view metrics and unlock chat.
            </p>
            <div className="w-full max-w-xs">
              <PlaidLink onSyncComplete={handleLinkComplete} />
            </div>
          </section>
        ) : (
          <>
            {/* Summary Cards Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="glass-card flex items-center gap-4">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Total Spending</span>
                  <strong className="text-xl text-slate-100">${totalSpent.toFixed(2)}</strong>
                </div>
              </div>

              <div className="glass-card flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Top Category</span>
                  <strong className="text-xl text-slate-100 truncate max-w-[150px] block">{topCategory}</strong>
                </div>
              </div>

              <div className="glass-card flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Transaction Count</span>
                  <strong className="text-xl text-slate-100">{transactionCount} tx</strong>
                </div>
              </div>

              <div className="glass-card flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Biggest Tx</span>
                  <strong className="text-xl text-slate-100">${biggestTx.toFixed(2)}</strong>
                </div>
              </div>

            </section>

            {/* Charts Grid */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="glass-card flex flex-col gap-4 h-[350px]">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Spending by Category</h3>
                  <p className="text-xs text-slate-400">Top cost distributions in this period</p>
                </div>
                <div className="flex-1 min-h-0">
                  <CategoryBarChart data={summaryData.by_category} />
                </div>
              </div>

              <div className="glass-card flex flex-col gap-4 h-[350px]">
                <div>
                  <h3 className="text-sm font-bold text-slate-200">Spending Trend Over Time</h3>
                  <p className="text-xs text-slate-400">Cumulative day-over-day tracking</p>
                </div>
                <div className="flex-1 min-h-0">
                  <SpendingLineChart data={summaryData.daily_spending} />
                </div>
              </div>

            </section>

            {/* Detailed Transactions List */}
            <section className="glass-card flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Recent Transactions</h3>
                <p className="text-xs text-slate-400">Detailed list of bank synced items</p>
              </div>
              <TransactionList refreshTrigger={refreshTrigger} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
