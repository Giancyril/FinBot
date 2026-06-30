import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Mail, Lock, Wallet, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setErr('Please enter all fields.');
    setLoading(true); setErr('');
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (error) {
      setErr(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Wallet size={18} className="text-indigo-400" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">FinAI Assistant</span>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-6">
          <div className="mb-5">
            <h1 className="text-lg font-bold text-white">Welcome back</h1>
            <p className="text-gray-500 text-xs mt-0.5">Sign in to your finance dashboard</p>
          </div>

          {err && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-xs">
              <AlertCircle size={13} className="shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="email" required placeholder="name@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800/60 border border-white/5 text-white placeholder-gray-600 text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-indigo-500/50 focus:bg-gray-800 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="password" required placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800/60 border border-white/5 text-white placeholder-gray-600 text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-indigo-500/50 focus:bg-gray-800 transition-all"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                : <><LogIn size={14} /><span>Sign In</span></>
              }
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <p className="text-xs text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-700 mt-4">
          Demo: demo@example.com · password123
        </p>
      </div>
    </div>
  );
}
