const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function extractToken(req) {
  const header = req.headers?.authorization || '';
  if (typeof header !== 'string') return null;
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim();
}

function decodeToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function attachUser(req, _res, next) {
  if (!JWT_SECRET) return next();
  const token = extractToken(req);
  if (!token) return next();
  const payload = decodeToken(token);
  if (payload) {
    req.user = payload;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  if (req.user) return next();

  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    console.error('Token verification failed', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireRole(roles = []) {
  const allowed = Array.isArray(roles)
    ? roles.map((role) => String(role).toUpperCase())
    : [];

  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!allowed.length) return next();
      const roleName =
        (req.user?.role?.name || req.user?.role || '').toString().toUpperCase();
      if (!roleName || !allowed.includes(roleName)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return next();
    });
  };
}

module.exports = { attachUser, requireAuth, requireRole };
