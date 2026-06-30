const jwt = require('jsonwebtoken');

/**
 * JWT authentication middleware using httpOnly cookies.
 * Reads the 'token' cookie, verifies it, and attaches req.user.
 */
function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = authMiddleware;
