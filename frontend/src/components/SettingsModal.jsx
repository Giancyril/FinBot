import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Key, Shield, Landmark, AlertTriangle } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  const fetchBanks = async () => {
    try {
      setLoadingBanks(true);
      const { data } = await axios.get('/api/plaid/items');
      setBanks(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBanks(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBanks();
      setMessage(null);
      setError(null);
      setCurrentPassword('');
      setNewPassword('');
    }
  }, [isOpen]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const { data } = await axios.put('/api/auth/update', {
        email: email || undefined,
        currentPassword,
        newPassword: newPassword || undefined,
      });
      setMessage(data.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    }
  };

  const handleDisconnectBank = async (itemId) => {
    if (!confirm('Are you sure you want to disconnect this bank connection? This will delete all synced transactions.')) return;
    try {
      await axios.delete(`/api/plaid/items/${itemId}`);
      await fetchBanks();
    } catch (err) {
      console.error(err);
      alert('Failed to disconnect account.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-indigo-400" />
            <h3 className="text-white text-sm font-bold">Settings & Security</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-gray-950/25 p-1 gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'profile' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Profile & Security
          </button>
          <button
            onClick={() => setActiveTab('banks')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'banks' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Connected Banks
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {activeTab === 'profile' ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {message && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-center font-medium">
                  {message}
                </div>
              )}
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl text-center font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">New Email Address</label>
                <input
                  type="email"
                  placeholder="Leave blank to keep current"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800/60 border border-white/5 text-white placeholder-gray-600 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-white/10 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-800/60 border border-white/5 text-white placeholder-gray-600 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-white/10 transition-all"
                />
              </div>

              <div className="border-t border-white/5 my-4 pt-4 space-y-1.5">
                <label className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Key size={10} /> Current Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Required to save changes"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-gray-800/60 border border-white/5 text-white placeholder-gray-650 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-white/10 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/10"
              >
                Save Profile Changes
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[11px] text-amber-550/90 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
                <AlertTriangle size={14} className="shrink-0" />
                <p>Disconnecting a bank connection will revoke its Plaid access tokens and delete all related transaction records.</p>
              </div>

              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {loadingBanks ? (
                  <div className="py-8 flex justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : banks.length === 0 ? (
                  <p className="text-gray-600 text-xs text-center py-8">No bank connections found.</p>
                ) : (
                  banks.map((bank) => (
                    <div key={bank.id} className="flex items-center justify-between bg-gray-800/40 border border-white/5 p-3 rounded-xl hover:border-white/10 transition-all">
                      <div className="min-w-0 pr-2">
                        <p className="text-white text-xs font-bold truncate flex items-center gap-1.5">
                          <Landmark size={12} className="text-indigo-400" /> {bank.institution_name}
                        </p>
                        <p className="text-gray-550 text-[10px] truncate mt-1">
                          Connected {new Date(bank.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDisconnectBank(bank.id)}
                        className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[10px] font-semibold rounded-lg transition-all"
                      >
                        Disconnect
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
