import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, ShoppingBag, Download } from 'lucide-react';
import CustomSelectDropdown from './CustomSelectDropdown';

const CATEGORIES = ['Food and Drink', 'Shops', 'Travel', 'Service', 'Recreation', 'Transfer', 'Payment'];

export default function TransactionList({ refreshTrigger }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = { page, limit, search: search.trim() || undefined, category: category || undefined };
      const { data } = await axios.get('/api/transactions', { params });
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = { limit: 1000, search: search.trim() || undefined, category: category || undefined };
      const { data } = await axios.get('/api/transactions', { params });
      const txs = data.transactions || [];

      const headers = ['Date', 'Merchant/Description', 'Category', 'Amount', 'Type'];
      const rows = txs.map(t => {
        const date = new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
        const name = t.merchant_name || t.name;
        const amount = Math.abs(t.amount).toFixed(2);
        const type = t.amount > 0 ? 'Debit' : 'Credit';
        return [date, `"${name.replace(/"/g, '""')}"`, t.category || 'Other', amount, type];
      });

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  useEffect(() => { setPage(1); }, [search, category]);
  useEffect(() => { fetchTransactions(); }, [page, search, category, refreshTrigger]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input type="text" placeholder="Search merchant or name..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800/60 border border-white/5 text-white placeholder-gray-600 text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-white/10 transition-all" />
        </div>

        {/* Custom Select Dropdown */}
        <CustomSelectDropdown
          value={category}
          onChange={(val) => setCategory(val === 'All Categories' ? '' : val)}
          options={['All Categories', ...CATEGORIES]}
          placeholder="All Categories"
          icon={SlidersHorizontal}
          className="w-full sm:w-48"
        />

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-800/60 hover:bg-gray-850 border border-white/5 hover:border-white/10 text-gray-350 hover:text-white text-xs font-semibold rounded-xl transition-all shrink-0"
          title="Export to CSV"
        >
          <Download size={13} /> <span className="sm:hidden md:inline">Export</span>
        </button>
      </div>

      {/* Table Container with Min-Height to prevent shaking/collapsing */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 min-h-[465px] relative bg-gray-900/10">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className="bg-gray-800/40 border-b border-white/5">
              <th className="w-1/4 px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Date</th>
              <th className="w-2/5 px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Merchant</th>
              <th className="w-1/4 px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Category</th>
              <th className="w-1/5 px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-white/5 transition-opacity duration-150 ${loading ? 'opacity-40 pointer-events-none' : ''}`}>
            {transactions.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="py-24 text-center text-gray-600 text-xs">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isDebit = tx.amount > 0;
                const date = new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
                return (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 truncate">{date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-gray-800 border border-white/5 flex items-center justify-center shrink-0">
                          <ShoppingBag size={10} className="text-gray-500" />
                        </div>
                        <span className="text-white text-xs font-medium truncate group-hover:text-indigo-300 transition-colors">
                          {tx.merchant_name || tx.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-gray-800/60 border-white/5 text-gray-400">
                        {tx.category}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right text-xs font-bold ${isDebit ? 'text-red-400' : 'text-emerald-400'} truncate`}>
                      {isDebit ? `-$${Math.abs(tx.amount).toFixed(2)}` : `+$${Math.abs(tx.amount).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Floating Spinner Overlay to keep the layout static while updating */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/10 backdrop-blur-[1px] pointer-events-none">
            <div className="w-5 h-5 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-[11px] text-gray-600">
            Page <span className="text-gray-400 font-semibold">{page}</span> of <span className="text-gray-400 font-semibold">{totalPages}</span>
            <span className="ml-1.5 text-gray-700">· {total} total</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center bg-gray-800/60 border border-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronLeft size={12} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center bg-gray-800/60 border border-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
