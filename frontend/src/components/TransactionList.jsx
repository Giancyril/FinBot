import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, ShoppingBag, ChevronDown } from 'lucide-react';

const CATEGORIES = ['Food and Drink', 'Shops', 'Travel', 'Service', 'Recreation', 'Transfer', 'Payment'];

export default function TransactionList({ refreshTrigger }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const limit = 10;
  const dropdownRef = useRef(null);

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

  useEffect(() => { setPage(1); }, [search, category]);
  useEffect(() => { fetchTransactions(); }, [page, search, category, refreshTrigger]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="relative w-full sm:w-48" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between bg-gray-800/60 border border-white/5 text-gray-300 text-xs rounded-xl px-4 py-2.5 outline-none hover:border-white/10 transition-all text-left"
          >
            <span className="flex items-center gap-2 truncate">
              <SlidersHorizontal size={13} className="text-gray-600 shrink-0" />
              {category || 'All Categories'}
            </span>
            <ChevronDown size={13} className={`text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-full bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
              <button
                type="button"
                onClick={() => { setCategory(''); setDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2 text-xs transition-colors ${!category ? 'bg-indigo-500/10 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'}`}
              >
                All Categories
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCategory(c); setDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors ${category === c ? 'bg-indigo-500/10 text-indigo-400 font-semibold' : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
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
