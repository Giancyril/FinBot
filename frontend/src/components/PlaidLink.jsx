import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import axios from 'axios';
import { Link2, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

export default function PlaidLink({ onSyncComplete }) {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [institution, setInstitution] = useState('');
  const [error, setError] = useState('');

  const fetchLinkToken = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/plaid/create-link-token');
      setLinkToken(response.data.link_token);
    } catch (err) {
      setError('Could not initialize bank connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLinkToken(); }, []);

  const onSuccess = async (public_token, metadata) => {
    const institutionName = metadata.institution?.name || 'Sandbox Bank';
    setInstitution(institutionName);
    setSyncing(true); setError('');
    try {
      await axios.post('/api/plaid/exchange-token', { public_token, institution_name: institutionName });
      setConnected(true);
      await axios.post('/api/transactions/sync');
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      setError('Token exchange or sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess, onExit: (err) => { if (err) setError(err.message); } });

  if (syncing) return (
    <div className="flex items-center gap-3 py-2.5 px-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
      <RefreshCw size={14} className="text-indigo-400 animate-spin shrink-0" />
      <span className="text-indigo-400 text-xs font-medium">Syncing transactions...</span>
    </div>
  );

  if (connected) return (
    <div className="flex items-center justify-between py-2.5 px-4 bg-emerald-400/5 border border-emerald-400/20 rounded-xl gap-4">
      <div className="flex items-center gap-2 text-emerald-400">
        <CheckCircle size={14} className="shrink-0" />
        <span className="text-xs font-semibold whitespace-nowrap">Connected to {institution}</span>
      </div>
      <button onClick={() => { setConnected(false); fetchLinkToken(); }}
        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors whitespace-nowrap">
        + Add Another
      </button>
    </div>
  );

  return (
    <div className="space-y-2">
      <button onClick={() => open()} disabled={!ready || loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-400/10 hover:bg-emerald-400/15 border border-emerald-400/20 hover:border-emerald-400/40 text-emerald-400 text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
        <Link2 size={14} className="shrink-0" />
        <span>{loading ? 'Initializing...' : 'Connect Bank Account'}</span>
      </button>
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-[11px]">
          <AlertCircle size={11} /> <span>{error}</span>
        </div>
      )}
    </div>
  );
}
