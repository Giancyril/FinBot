import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';

export default function TransactionList({ refreshTrigger }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: search.trim() || undefined,
        category: category || undefined,
      };
      const response = await axios.get('/api/transactions', { params });
      if (response.data) {
        setTransactions(response.data.transactions);
        setTotal(response.data.total);
      }
    } catch (err) {
      console.error('Error fetching transactions list:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, category]);

  useEffect(() => {
    fetchTransactions();
  }, [page, search, category, refreshTrigger]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-4">
      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by merchant or name..."
            className="form-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="relative w-full md:w-56">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select
            className="form-input pl-10 appearance-none bg-slate-800/80 cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Shops">Shops</option>
            <option value="Food and Drink">Food and Drink</option>
            <option value="Travel">Travel</option>
            <option value="Transfer">Transfer</option>
            <option value="Service">Service</option>
            <option value="Recreation">Recreation</option>
            <option value="Payment">Payment</option>
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/30">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/40 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-700/30">
              <th className="p-4">Date</th>
              <th className="p-4">Merchant / Name</th>
              <th className="p-4">Category</th>
              <th className="p-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-slate-300 text-sm">
            {loading ? (
              <tr>
                <td colSpan="4" className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isDebit = tx.amount > 0;
                return (
                  <tr key={tx.id} className="hover:bg-slate-800/25 transition-colors">
                    <td className="p-4 text-xs font-mono text-slate-400">
                      {new Date(tx.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC'
                      })}
                    </td>
                    <td className="p-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {tx.merchant_name || tx.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700/50 text-slate-400">
                        {tx.category}
                      </span>
                    </td>
                    <td className={`p-4 text-right font-bold ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isDebit ? `-$${Math.abs(tx.amount).toFixed(2)}` : `+$${Math.abs(tx.amount).toFixed(2)}`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination control */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 px-2">
          <span className="text-xs text-slate-500">
            Showing Page <span className="text-slate-300 font-semibold">{page}</span> of{' '}
            <span className="text-slate-300 font-semibold">{totalPages}</span> ({total} transactions)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary p-2 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary p-2 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
