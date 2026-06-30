const express = require('express');
const pool = require('../config/db');
const ChatService = require('../services/chatService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/chat/history
// Returns the recent chat conversation history for a user
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, role, content, created_at
       FROM chat_messages
       WHERE user_id = $1
       ORDER BY created_at ASC
       LIMIT 100`,
      [req.user.id]
    );
    return res.json({ history: result.rows });
  } catch (err) {
    console.error('Fetch chat history error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch chat history.' });
  }
});

// POST /api/chat
// Server-Sent Events (SSE) route to stream OpenAI chatbot answers
router.post('/', authMiddleware, async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  // 1. Fetch message history for context (last 6 messages)
  let history = [];
  try {
    const historyResult = await pool.query(
      `SELECT role, content
       FROM chat_messages
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 6`,
      [req.user.id]
    );
    history = historyResult.rows.reverse();
  } catch (err) {
    console.error('Error loading history context:', err);
  }

  // 2. Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Establish the SSE connection immediately

  // 3. Keep track of streaming state
  let streamClosed = false;

  const onChunk = (textChunk) => {
    if (streamClosed) return;
    // Format according to Server-Sent Events standard: "data: <content>\n\n"
    res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
  };

  const onDone = async (finalResponseText) => {
    if (streamClosed) return;
    
    // Save both the User message and the Assistant reply to the DB
    try {
      await pool.query(
        'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
        [req.user.id, 'user', message]
      );
      await pool.query(
        'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
        [req.user.id, 'assistant', finalResponseText]
      );
    } catch (dbErr) {
      console.error('Error saving chat messages to DB:', dbErr.message);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
    streamClosed = true;
  };

  const onError = (error) => {
    if (streamClosed) return;
    console.error('SSE chatbot stream error:', error);
    res.write(`data: ${JSON.stringify({ error: 'An error occurred during chat generation.' })}\n\n`);
    res.end();
    streamClosed = true;
  };

  // 4. Start the async streaming from OpenAI
  ChatService.streamChatResponse(
    req.user.id,
    message,
    history,
    onChunk,
    onDone,
    onError
  );

  // If the user disconnects or closes the tab, ensure we release resources
  req.on('close', () => {
    streamClosed = true;
  });
});

module.exports = router;
