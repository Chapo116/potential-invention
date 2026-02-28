const jwt = require('jsonwebtoken');
require('dotenv').config();
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' });
    req.userId = decoded.id; req.userEmail = decoded.email; req.isAdmin = decoded.isAdmin;
    next();
  });
};
const verifyAdmin = (req, res, next) => {
  if (!req.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
};
module.exports = { verifyToken, verifyAdmin };
