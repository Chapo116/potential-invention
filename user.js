const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.get('/profile', verifyToken, (req, res) => {
  db.get(`SELECT id,email,full_name,phone,balance,total_invested,total_profit,referral_code,status,created_at FROM users WHERE id=?`, [req.userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

router.put('/profile', verifyToken, (req, res) => {
  const { full_name, phone } = req.body;
  db.run('UPDATE users SET full_name=?,phone=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [full_name, phone, req.userId], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update profile' });
    res.json({ message: 'Profile updated successfully' });
  });
});

router.get('/dashboard', verifyToken, (req, res) => {
  db.get('SELECT balance,total_invested,total_profit FROM users WHERE id=?', [req.userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const stats = { balance: user.balance, total_invested: user.total_invested, total_profit: user.total_profit };
    db.get('SELECT COUNT(*) as count FROM investments WHERE user_id=? AND status=?', [req.userId, 'active'], (err, r) => {
      stats.active_investments = r ? r.count : 0;
      db.get('SELECT COUNT(*) as count FROM transactions WHERE user_id=? AND status=?', [req.userId, 'pending'], (err, r) => {
        stats.pending_transactions = r ? r.count : 0;
        db.get('SELECT SUM(amount) as total FROM referral_earnings WHERE user_id=?', [req.userId], (err, r) => {
          stats.referral_earnings = r && r.total ? r.total : 0;
          res.json(stats);
        });
      });
    });
  });
});

router.get('/referrals', verifyToken, (req, res) => {
  db.all(`SELECT u.email,u.full_name,u.created_at,(SELECT SUM(amount) FROM referral_earnings WHERE user_id=? AND referred_user_id=u.id) as earnings FROM users u WHERE u.referred_by=(SELECT referral_code FROM users WHERE id=?)`, [req.userId, req.userId], (err, referrals) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(referrals || []);
  });
});

module.exports = router;
