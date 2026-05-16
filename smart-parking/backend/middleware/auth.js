const jwt = require('jsonwebtoken');

function getTokenFromHeader(req) {
  return req.headers.authorization?.split(' ')[1] || null;
}

module.exports = function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return res.status(401).json({ message: 'Missing token' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ message: 'JWT_SECRET missing' });

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports.adminOnly = function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }
  return next();
};




