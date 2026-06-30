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
  formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-black/40 px-1.5 py-0.5 rounded text-indigo-300 text-[11px] font-mono">$1</code>');

  return <div className="space-y-1.5 text-xs sm:text-sm" dangerouslySetInnerHTML={{ __html: formatted }} />;
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
    <div className="min-h-screen bg-gray-950 flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="bg-gray-900 border-b border-white/5 py-3 px-4 sm:px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-8 h-8 flex items-center justify-center bg-gray-800/60 border border-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-1.5">
                FinAI Assistant
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              </h1>
              <p className="text-[10px] text-gray-500">Powered by Google Gemini</p>
            </div>
          </div>
        </div>
        <div className="text-[10px] sm:text-xs text-gray-400 font-medium bg-gray-800/60 px-3 py-1.5 rounded-xl border border-white/5">
          Logged in as <span className="text-indigo-400 font-semibold">{user?.email}</span>
        </div>
      </header>

      {/* Main Chat Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto p-3 sm:p-4 gap-3 sm:gap-4 z-10">
        
        {/* Recommended Prompts sidebar */}
        <aside className="w-full md:w-64 flex flex-col gap-3 md:h-full md:overflow-y-auto">
          <div className="bg-gray-900 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Suggested Prompts
            </h3>
            <div className="flex flex-wrap md:flex-col gap-2">
              {SUGGESTED_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip)}
                  disabled={loading}
                  className="text-left text-xs bg-gray-800/40 hover:bg-gray-800/80 border border-white/5 hover:border-white/10 text-gray-300 hover:text-white px-3 py-2.5 rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Message Window Area */}
        <main className="flex-1 flex flex-col bg-gray-900 border border-white/5 rounded-2xl overflow-hidden relative">
          
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.length === 0 && !streamingMessage && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-white">Start Your Finance Q&A</h2>
                <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">
                  Ask questions about your transactions, request spending reports, or ask how you can cut budgets.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    msg.role === 'user'
                      ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                      : 'bg-gray-800 border-white/5 text-gray-400'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-500/10 border border-indigo-500/20 text-white rounded-tr-none'
                      : 'bg-gray-800/40 border border-white/5 text-gray-200 rounded-tl-none'
                  }`}
                >
                  {renderMarkdown(msg.content)}
                </div>
              </div>
            ))}

            {/* Live Streaming Message Bubble */}
            {streamingMessage && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <div className="w-8 h-8 rounded-xl bg-gray-800 border border-white/5 flex items-center justify-center text-gray-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 bg-gray-800/40 border border-white/5 text-gray-200 rounded-2xl rounded-tl-none text-sm leading-relaxed">
                  {renderMarkdown(streamingMessage)}
                  <span className="inline-block w-1.5 h-3 bg-indigo-400 animate-pulse ml-1 align-middle rounded-full"></span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-400/10 border border-red-400/20 text-red-400 text-xs rounded-xl max-w-md mx-auto text-center flex items-center justify-center gap-2">
                <span>{error}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Form input bar */}
          <div className="p-3 sm:p-4 border-t border-white/5 bg-gray-900/50">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Ask about your transactions (e.g. How much did I spend last month?)..."
                className="flex-1 bg-gray-800/60 border border-white/5 text-white placeholder-gray-600 text-xs sm:text-sm rounded-xl px-4 py-2.5 outline-none focus:border-white/10 transition-all"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-xs sm:text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
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
