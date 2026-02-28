const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

const PLANS = {
  starter: { min:100, max:999, duration:24, profit:5, referral:2 },
  basic: { min:1000, max:4999, duration:48, profit:8, referral:3 },
  standard: { min:5000, max:19999, duration:72, profit:12, referral:4 },
  premium: { min:20000, max:49999, duration:120, profit:15, referral:5 },
  gold: { min:50000, max:99999, duration:168, profit:20, referral:7 },
  platinum: { min:100000, max:500000, duration:336, profit:30, referral:10 }
};

router.post('/create', verifyToken, (req, res) => {
  const { plan_name, amount } = req.body;
  if (!plan_name || !amount) return res.status(400).json({ error: 'Plan name and amount are required' });
  const plan = PLANS[plan_name.toLowerCase()];
  if (!plan) return res.status(400).json({ error: 'Invalid investment plan' });
  if (amount < plan.min || amount > plan.max) return res.status(400).json({ error: `Amount must be between $${plan.min} and $${plan.max}` });
  db.get('SELECT balance,referred_by FROM users WHERE id=?', [req.userId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
    const expectedProfit = (amount * plan.profit) / 100;
    const endDate = new Date(Date.now() + plan.duration * 3600000);
    db.run(`INSERT INTO investments (user_id,plan_name,amount,duration_hours,profit_percentage,expected_profit,end_date) VALUES (?,?,?,?,?,?,?)`,
      [req.userId, plan_name, amount, plan.duration, plan.profit, expectedProfit, endDate],
      function(err) {
        if (err) return res.status(500).json({ error: 'Failed to create investment' });
        const investmentId = this.lastID;
        db.run('UPDATE users SET balance=balance-?,total_invested=total_invested+? WHERE id=?', [amount, amount, req.userId]);
        if (user.referred_by) {
          const referralBonus = (amount * plan.referral) / 100;
          db.get('SELECT id FROM users WHERE referral_code=?', [user.referred_by], (err, referrer) => {
            if (referrer) {
              db.run('UPDATE users SET balance=balance+? WHERE id=?', [referralBonus, referrer.id]);
              db.run('INSERT INTO referral_earnings (user_id,referred_user_id,amount,investment_id) VALUES (?,?,?,?)', [referrer.id, req.userId, referralBonus, investmentId]);
            }
          });
        }
        res.status(201).json({ message: 'Investment created successfully', investment: { id: investmentId, plan_name, amount, expected_profit: expectedProfit, end_date: endDate } });
      });
  });
});

router.get('/list', verifyToken, (req, res) => {
  db.all('SELECT * FROM investments WHERE user_id=? ORDER BY start_date DESC', [req.userId], (err, investments) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(investments || []);
  });
});

router.get('/:id', verifyToken, (req, res) => {
  db.get('SELECT * FROM investments WHERE id=? AND user_id=?', [req.params.id, req.userId], (err, inv) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!inv) return res.status(404).json({ error: 'Investment not found' });
    res.json(inv);
  });
});

module.exports = router;
