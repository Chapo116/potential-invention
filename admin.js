const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const router = express.Router();
router.use(verifyToken); router.use(verifyAdmin);

router.get('/users', (req, res) => {
  db.all(`SELECT id,email,full_name,phone,balance,total_invested,total_profit,status,is_admin,created_at FROM users ORDER BY created_at DESC`, [], (err, users) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(users || []);
  });
});

router.get('/users/:id', (req, res) => {
  db.get(`SELECT id,email,full_name,phone,balance,total_invested,total_profit,referral_code,referred_by,status,is_admin,created_at FROM users WHERE id=?`, [req.params.id], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

router.put('/users/:id/balance', (req, res) => {
  const { amount, type } = req.body;
  if (!amount || !type) return res.status(400).json({ error: 'Amount and type are required' });
  const op = type === 'add' ? '+' : '-';
  db.run(`UPDATE users SET balance=balance${op}?,updated_at=CURRENT_TIMESTAMP WHERE id=?`, [amount, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update balance' });
    db.run(`INSERT INTO transactions (user_id,type,amount,status,description) VALUES (?,?,?,'completed',?)`, [req.params.id, type==='add'?'deposit':'withdrawal', amount, `Admin ${type} balance`]);
    res.json({ message: 'Balance updated successfully' });
  });
});

router.put('/users/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status || !['active','suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.run('UPDATE users SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [status, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to update status' });
    res.json({ message: 'User status updated successfully' });
  });
});

router.get('/investments', (req, res) => {
  db.all(`SELECT i.*,u.email,u.full_name FROM investments i JOIN users u ON i.user_id=u.id ORDER BY i.start_date DESC`, [], (err, investments) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(investments || []);
  });
});

router.put('/investments/:id/complete', (req, res) => {
  db.get('SELECT * FROM investments WHERE id=?', [req.params.id], (err, inv) => {
    if (err || !inv) return res.status(404).json({ error: 'Investment not found' });
    if (inv.status !== 'active') return res.status(400).json({ error: 'Investment is not active' });
    db.run(`UPDATE investments SET status='completed',completed_date=CURRENT_TIMESTAMP WHERE id=?`, [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: 'Failed to complete investment' });
      const totalReturn = inv.amount + inv.expected_profit;
      db.run(`UPDATE users SET balance=balance+?,total_profit=total_profit+? WHERE id=?`, [totalReturn, inv.expected_profit, inv.user_id]);
      res.json({ message: 'Investment completed successfully' });
    });
  });
});

router.get('/transactions', (req, res) => {
  db.all(`SELECT t.*,u.email,u.full_name FROM transactions t JOIN users u ON t.user_id=u.id ORDER BY t.created_at DESC`, [], (err, transactions) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(transactions || []);
  });
});

router.put('/transactions/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status || !['approved','rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.get('SELECT * FROM transactions WHERE id=?', [req.params.id], (err, txn) => {
    if (err || !txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.status !== 'pending') return res.status(400).json({ error: 'Transaction already processed' });
    db.run('UPDATE transactions SET status=? WHERE id=?', [status, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: 'Failed to update transaction' });
      if (status === 'approved' && txn.type === 'deposit') db.run('UPDATE users SET balance=balance+? WHERE id=?', [txn.amount, txn.user_id]);
      if (status === 'rejected' && txn.type === 'withdrawal') db.run('UPDATE users SET balance=balance+? WHERE id=?', [txn.amount, txn.user_id]);
      res.json({ message: 'Transaction status updated successfully' });
    });
  });
});

router.get('/stats', (req, res) => {
  const stats = {};
  db.get('SELECT COUNT(*) as count FROM users', (err, r) => {
    stats.total_users = r ? r.count : 0;
    db.get('SELECT COUNT(*) as count,SUM(amount) as total FROM investments', (err, r) => {
      stats.total_investments = r ? r.count : 0;
      stats.total_investment_amount = r && r.total ? r.total : 0;
      db.get(`SELECT COUNT(*) as count FROM investments WHERE status='active'`, (err, r) => {
        stats.active_investments = r ? r.count : 0;
        db.get('SELECT COUNT(*) as count FROM transactions', (err, r) => {
          stats.total_transactions = r ? r.count : 0;
          db.get(`SELECT COUNT(*) as count FROM transactions WHERE status='pending'`, (err, r) => {
            stats.pending_transactions = r ? r.count : 0;
            res.json(stats);
          });
        });
      });
    });
  });
});

router.post('/create-admin', async (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password || !full_name) return res.status(400).json({ error: 'All fields are required' });
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (email,password,full_name,is_admin) VALUES (?,?,?,1)', [email, hashedPassword, full_name], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to create admin user' });
    res.status(201).json({ message: 'Admin user created successfully', id: this.lastID });
  });
});

module.exports = router;
