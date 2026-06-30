import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Configure axios defaults to send cookies with every request
axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user has an active session cookie on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await axios.get('/api/auth/me');
        if (response.data?.user) {
          setUser(response.data.user);
        }
      } catch (err) {
        // Not logged in or expired cookie
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to login. Please try again.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const signup = async (email, password) => {
    setError(null);
    try {
      const response = await axios.post('/api/auth/signup', { email, password });
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to create account.';
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
