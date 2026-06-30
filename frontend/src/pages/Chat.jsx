import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { Send, Bot, User, Sparkles, MessageSquare, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const SUGGESTED_CHIPS = [
  "Summarize this month's spending",
  "Where did most of my money go?",
  "How can I save $300 next month?",
  "Did I spend more than usual this month?",
  "Analyze my top spending categories"
];

// Simple markdown formatter helper since we want to avoid extra heavy libraries
// Supports bold, bullet points, headers, inline code, and basic tables
function renderMarkdown(text) {
  if (!text) return '';
  
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Headers
  formatted = formatted.replace(/^### (.*?)$/gm, '<h4 class="text-sm font-semibold mt-3 mb-1 text-indigo-300">$1</h4>');
  formatted = formatted.replace(/^## (.*?)$/gm, '<h3 class="text-base font-bold mt-4 mb-2 text-indigo-200">$1</h3>');
  
  // Bullet lists
  formatted = formatted.replace(/^\s*-\s+(.*?)$/gm, '<li class="ml-4 list-disc">$1</li>');
  
  // Inline Code
  formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-black/30 px-1 py-0.5 rounded text-indigo-300 text-xs font-mono">$1</code>');

  return <div className="markdown-body space-y-2" dangerouslySetInnerHTML={{ __html: formatted }} />;
}

export default function Chat() {
  const { messages, loading, streamingMessage, error, sendMessage } = useChat();
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;
    sendMessage(inputText);
    setInputText('');
  };

  const handleChipClick = (chip) => {
    if (loading) return;
    sendMessage(chip);
  };

  return (
    <div className="min-h-screen bg-[#07080d] flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-[30vw] h-[30vw] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="glass-card rounded-none border-t-0 border-x-0 py-4 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                FinAI Assistant
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h1>
              <p className="text-xs text-slate-400">Powered by Google Gemini</p>
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-medium bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-700/50">
          Logged in as <span className="text-indigo-300 font-semibold">{user?.email}</span>
        </div>
      </header>

      {/* Main Chat Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto p-4 gap-4 z-10">
        
        {/* Recommended Prompts sidebar */}
        <aside className="w-full md:w-64 flex flex-col gap-3 md:h-full md:overflow-y-auto">
          <div className="glass-card p-4 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Suggested Prompts
            </h3>
            <div className="flex flex-wrap md:flex-col gap-2">
              {SUGGESTED_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip)}
                  disabled={loading}
                  className="text-left text-xs bg-slate-800/50 hover:bg-slate-800 border border-slate-700/30 hover:border-slate-600/80 text-slate-300 hover:text-white px-3 py-2.5 rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Message Window Area */}
        <main className="flex-1 flex flex-col glass-card p-0 overflow-hidden relative">
          
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && !streamingMessage && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <MessageSquare className="w-12 h-12 text-slate-600 mb-3" />
                <h2 className="text-lg font-bold text-slate-300">Start Your Finance Q&A</h2>
                <p className="text-sm text-slate-400 max-w-sm mt-1">
                  Ask questions about your transactions, request spending reports, or ask how you can cut budgets.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-500/10 border border-indigo-500/20 text-slate-100 rounded-tr-none'
                      : 'bg-slate-800/40 border border-slate-700/30 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {renderMarkdown(msg.content)}
                </div>
              </div>
            ))}

            {/* Live Streaming Message Bubble */}
            {streamingMessage && (
              <div className="flex gap-3.5 max-w-[85%] mr-auto">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 bg-slate-800/40 border border-slate-700/30 text-slate-200 rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed">
                  {renderMarkdown(streamingMessage)}
                  <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1 align-middle rounded-full"></span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg max-w-md mx-auto text-center">
                <span>{error}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Form input bar */}
          <div className="p-4 border-t border-slate-700/40 bg-slate-900/20">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Ask about your transactions (e.g. How much did I spend last month?)..."
                className="form-input flex-1 py-3"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="btn btn-primary px-5 py-3 shrink-0"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Ask AI</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </main>
      </div>
    </div>
  );
}
