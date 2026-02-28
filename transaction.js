const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.post('/deposit', verifyToken, (req, res) => {
  const { amount, transaction_hash } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  db.run(`INSERT INTO transactions (user_id,type,amount,transaction_hash,description) VALUES (?,'deposit',?,?,'Deposit request')`, [req.userId, amount, transaction_hash || null], function(err) {
    if (err) return res.status(500).json({ error: 'Failed to create transaction' });
    res.status(201).json({ message: 'Deposit request submitted. Awaiting confirmation.', transaction_id: this.lastID });
  });
});

router.post('/withdraw', verifyToken, (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  db.get('SELECT balance FROM users WHERE id=?', [req.userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
    db.run(`INSERT INTO transactions (user_id,type,amount,description) VALUES (?,'withdrawal',?,'Withdrawal request')`, [req.userId, amount], function(err) {
      if (err) return res.status(500).json({ error: 'Failed to create transaction' });
      db.run('UPDATE users SET balance=balance-? WHERE id=?', [amount, req.userId]);
      res.status(201).json({ message: 'Withdrawal request submitted. Awaiting processing.', transaction_id: this.lastID });
    });
  });
});

router.get('/list', verifyToken, (req, res) => {
  const { type, status } = req.query;
  let query = 'SELECT * FROM transactions WHERE user_id=?';
  let params = [req.userId];
  if (type) { query += ' AND type=?'; params.push(type); }
  if (status) { query += ' AND status=?'; params.push(status); }
  query += ' ORDER BY created_at DESC';
  db.all(query, params, (err, transactions) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(transactions || []);
  });
});

router.get('/:id', verifyToken, (req, res) => {
  db.get('SELECT * FROM transactions WHERE id=? AND user_id=?', [req.params.id, req.userId], (err, txn) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    res.json(txn);
  });
});

module.exports = router;
