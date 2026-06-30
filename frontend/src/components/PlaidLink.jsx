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
    <div className="flex items-center gap-1.5 py-2 px-3.5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
      <RefreshCw size={12} className="text-indigo-400 animate-spin shrink-0" />
      <span className="text-indigo-400 text-xs font-semibold">Syncing...</span>
    </div>
  );

  if (connected) return (
    <div className="flex items-center justify-between py-2 px-3.5 bg-emerald-400/5 border border-emerald-400/20 rounded-xl gap-3">
      <div className="flex items-center gap-1.5 text-emerald-400">
        <CheckCircle size={12} className="shrink-0" />
        <span className="text-xs font-semibold whitespace-nowrap">Connected: {institution}</span>
      </div>
      <button onClick={() => { setConnected(false); fetchLinkToken(); }}
        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors whitespace-nowrap">
        + Add Another
      </button>
    </div>
  );

  return (
    <div className="space-y-2">
      <button onClick={() => open()} disabled={!ready || loading}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/35 text-emerald-400 text-xs font-semibold rounded-xl transition-all shadow-sm">
        <Link2 size={12} className="shrink-0" />
        <span>{loading ? 'Initializing...' : 'Connect Bank Account'}</span>
      </button>
      {error && (
        <div className="flex items-center gap-1.5 text-red-400 text-[10px]">
          <AlertCircle size={11} /> <span>{error}</span>
        </div>
      )}
    </div>
  );
}
