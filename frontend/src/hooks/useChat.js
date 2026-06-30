import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Fetch chat history from database on load
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/chat/history');
      if (response.data?.history) {
        setMessages(response.data.history);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setError('Could not load chat history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const sendMessage = async (userText) => {
    if (!userText.trim()) return;

    setError(null);
    setStreamingMessage('');

    // Append user message immediately
    const userMsg = { id: `temp-user-${Date.now()}`, role: 'user', content: userText, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      setLoading(true);

      // Using fetch with SSE streaming instead of standard Axios because we need chunked response reading.
      // We pass the credentials cookie using credentials: 'include'.
      const response = await fetch(`${axios.defaults.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userText }),
        credentials: 'include', // Important to pass the JWT cookie
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server returned error during streaming.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let botAccumulated = '';

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: !done });
          
          // Split SSE events (delimited by double newlines)
          const lines = chunkStr.split('\n\n');
          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              const dataContent = line.replace('data: ', '').trim();
              if (dataContent === '[DONE]') {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataContent);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.text) {
                  botAccumulated += parsed.text;
                  setStreamingMessage(botAccumulated);
                }
              } catch (e) {
                // If it's partial JSON, let it slide until full buffer arrives
              }
            }
          }
        }
      }

      // Complete message streaming — add finalized reply to chat list
      const assistantMsg = {
        id: `temp-ast-${Date.now()}`,
        role: 'assistant',
        content: botAccumulated,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingMessage('');
    } catch (err) {
      console.error('Streaming error:', err);
      setError(err.message || 'Failed to generate response.');
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    streamingMessage,
    error,
    sendMessage,
    clearHistory: async () => {
      // Future-proof helper
      setMessages([]);
    }
  };
}
