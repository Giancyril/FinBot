import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import axios from 'axios';
import { Link2, CheckCircle, RefreshCw } from 'lucide-react';

export default function PlaidLink({ onSyncComplete }) {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [institution, setInstitution] = useState('');
  const [error, setError] = useState('');

  // 1. Fetch link token from backend on mount or when connection reset
  const fetchLinkToken = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/plaid/create-link-token');
      setLinkToken(response.data.link_token);
    } catch (err) {
      console.error('Error fetching link token:', err);
      setError('Could not initialize bank link connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinkToken();
  }, []);

  // 2. Exchange token after user finishes bank authentication in Plaid Link widget
  const onSuccess = async (public_token, metadata) => {
    const institutionName = metadata.institution?.name || 'Sandbox Bank';
    setInstitution(institutionName);
    setSyncing(true);
    setError('');

    try {
      // Exchange token
      await axios.post('/api/plaid/exchange-token', {
        public_token,
        institution_name: institutionName,
      });

      setConnected(true);
      
      // Auto-trigger sync on first connect
      await axios.post('/api/transactions/sync');
      
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (err) {
      console.error('Token exchange or sync error:', err);
      setError('Token exchange or transaction sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const onExit = (err, metadata) => {
    if (err) {
      console.error('Plaid Link exited with error:', err);
      setError(err.message || 'Plaid Link connection aborted.');
    }
  };

  const config = {
    token: linkToken,
    onSuccess,
    onExit,
  };

  const { open, ready } = usePlaidLink(config);

  if (syncing) {
    return (
      <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/25 rounded-xl">
        <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
        <span className="text-sm font-semibold text-indigo-300">Synchronizing transaction history...</span>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">Connected to {institution}</span>
        </div>
        <button
          onClick={() => {
            setConnected(false);
            fetchLinkToken();
          }}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
        >
          Link Another Bank
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => open()}
        disabled={!ready || loading}
        className="btn btn-accent w-full py-3"
      >
        <Link2 className="w-4 h-4" />
        <span>{loading ? 'Initializing Plaid...' : 'Connect Bank Account'}</span>
      </button>
      
      {error && (
        <span className="text-xs text-red-400 font-medium text-center">{error}</span>
      )}
    </div>
  );
}
