document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  loadUserInfo(); loadDashboardStats(); loadRecentInvestments();
  setupNavigation(); setupForms(); loadInvestmentPlans(); loadMyInvestments();
});
async function loadUserInfo() {
  try { const p = await apiCall('/user/profile'); document.getElementById('user-name').textContent = p.full_name; window.userProfile = p; } catch(e) {}
}
async function loadDashboardStats() {
  try {
    const s = await apiCall('/user/dashboard');
    document.getElementById('stat-balance').textContent = formatCurrency(s.balance);
    document.getElementById('stat-invested').textContent = formatCurrency(s.total_invested);
    document.getElementById('stat-profit').textContent = formatCurrency(s.total_profit);
    document.getElementById('stat-active').textContent = s.active_investments;
    document.getElementById('withdraw-balance').textContent = formatCurrency(s.balance);
  } catch(e) {}
}
async function loadRecentInvestments() {
  try {
    const investments = await apiCall('/investment/list');
    const el = document.getElementById('recent-investments-list');
    if (!investments.length) { el.innerHTML = '<p class="no-data">No investments yet. Start investing today!</p>'; return; }
    el.innerHTML = investments.slice(0,5).map(inv => `<div class="investment-item"><div class="investment-info"><h4>${inv.plan_name.toUpperCase()} Plan</h4><p>${formatDate(inv.start_date)}</p></div><div class="investment-amount"><p>${formatCurrency(inv.amount)}</p><span class="status ${inv.status}">${inv.status}</span></div></div>`).join('');
  } catch(e) {}
}
function loadInvestmentPlans() {
  const plans = [
    {name:'starter',min:100,max:999,duration:'24 Hours',profit:5,referral:2},
    {name:'basic',min:1000,max:4999,duration:'48 Hours',profit:8,referral:3},
    {name:'standard',min:5000,max:19999,duration:'72 Hours',profit:12,referral:4,popular:true},
    {name:'premium',min:20000,max:49999,duration:'5 Days',profit:15,referral:5},
    {name:'gold',min:50000,max:99999,duration:'7 Days',profit:20,referral:7},
    {name:'platinum',min:100000,max:500000,duration:'14 Days',profit:30,referral:10}
  ];
  document.getElementById('plans-grid').innerHTML = plans.map(p => `
    <div class="plan-card ${p.popular?'popular':''}">
      ${p.popular?'<div class="popular-badge">POPULAR</div>':''}
      <h3>${p.name.toUpperCase()}</h3>
      <div class="plan-range"><p>$${p.min.toLocaleString()} - $${p.max.toLocaleString()}</p></div>
      <div class="plan-details">
        <div class="detail-item"><i class="fas fa-clock"></i><span>Duration: ${p.duration}</span></div>
        <div class="detail-item"><i class="fas fa-percentage"></i><span>Profit: ${p.profit}%</span></div>
        <div class="detail-item"><i class="fas fa-gift"></i><span>Referral: ${p.referral}%</span></div>
      </div>
      <button class="invest-btn" onclick="openInvestmentModal('${p.name}',${p.min},${p.max})">Invest Now</button>
    </div>`).join('');
}
async function loadMyInvestments() {
  try {
    const investments = await apiCall('/investment/list');
    const el = document.getElementById('investments-list');
    if (!investments.length) { el.innerHTML = '<p class="no-data">No investments yet.</p>'; return; }
    el.innerHTML = `<div class="table-responsive"><table class="data-table"><thead><tr><th>Plan</th><th>Amount</th><th>Profit</th><th>Duration</th><th>Status</th><th>Start Date</th></tr></thead><tbody>${investments.map(inv=>`<tr><td>${inv.plan_name.toUpperCase()}</td><td>${formatCurrency(inv.amount)}</td><td>${formatCurrency(inv.expected_profit)}</td><td>${inv.duration_hours}h</td><td><span class="status-badge ${inv.status}">${inv.status}</span></td><td>${formatDate(inv.start_date)}</td></tr>`).join('')}</tbody></table></div>`;
  } catch(e) {}
}
async function loadTransactions(filter='all') {
  try {
    const endpoint = filter==='all'?'/transaction/list':`/transaction/list?type=${filter}`;
    const transactions = await apiCall(endpoint);
    const el = document.getElementById('transactions-list');
    if (!transactions.length) { el.innerHTML = '<p class="no-data">No transactions found.</p>'; return; }
    el.innerHTML = `<div class="table-responsive"><table class="data-table"><thead><tr><th>Type</th><th>Amount</th><th>Status</th><th>Date</th><th>Description</th></tr></thead><tbody>${transactions.map(t=>`<tr><td><span class="type-badge ${t.type}">${t.type}</span></td><td>${formatCurrency(t.amount)}</td><td><span class="status-badge ${t.status}">${t.status}</span></td><td>${formatDate(t.created_at)}</td><td>${t.description||'N/A'}</td></tr>`).join('')}</tbody></table></div>`;
  } catch(e) {}
}
async function loadReferrals() {
  try {
    const profile = await apiCall('/user/profile');
    const dashboard = await apiCall('/user/dashboard');
    const referrals = await apiCall('/user/referrals');
    document.getElementById('referral-code').value = profile.referral_code;
    document.getElementById('total-referrals').textContent = referrals.length;
    document.getElementById('referral-earnings').textContent = formatCurrency(dashboard.referral_earnings);
    const el = document.getElementById('referrals-list');
    if (!referrals.length) { el.innerHTML = '<p class="no-data">No referrals yet. Share your code to earn!</p>'; return; }
    el.innerHTML = `<h3>Your Referrals</h3><div class="table-responsive"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Earnings</th></tr></thead><tbody>${referrals.map(r=>`<tr><td>${r.full_name}</td><td>${r.email}</td><td>${formatDate(r.created_at)}</td><td>${formatCurrency(r.earnings||0)}</td></tr>`).join('')}</tbody></table></div>`;
  } catch(e) {}
}
async function loadProfile() {
  try {
    const p = await apiCall('/user/profile');
    document.getElementById('profile-name').value = p.full_name;
    document.getElementById('profile-email').value = p.email;
    document.getElementById('profile-phone').value = p.phone||'';
    document.getElementById('profile-created').value = formatDate(p.created_at);
  } catch(e) {}
}
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const pages = document.querySelectorAll('.page-content');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.classList.contains('logout')) { logout(); return; }
      const pageName = item.dataset.page;
      navItems.forEach(n => n.classList.remove('active')); item.classList.add('active');
      pages.forEach(p => p.classList.add('hidden'));
      const sel = document.getElementById(`${pageName}-page`);
      if (sel) {
        sel.classList.remove('hidden');
        const titles = {overview:'Dashboard Overview',investments:'Investments',transactions:'Transactions',deposit:'Deposit Funds',withdraw:'Withdraw Funds',referrals:'Referral Program',profile:'My Profile'};
        document.getElementById('page-title').textContent = titles[pageName];
        if (pageName==='transactions') loadTransactions();
        if (pageName==='referrals') loadReferrals();
        if (pageName==='profile') loadProfile();
      }
    });
  });
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelector(`[data-page="${btn.dataset.page}"]`).click(); });
  });
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); loadTransactions(btn.dataset.filter); });
  });
  document.getElementById('copy-referral')?.addEventListener('click', () => {
    const code = document.getElementById('referral-code'); code.select(); document.execCommand('copy'); showNotification('Referral code copied!','success');
  });
  document.querySelector('.mobile-menu-toggle')?.addEventListener('click', () => { document.querySelector('.sidebar').classList.toggle('active'); });
}
function setupForms() {
  document.getElementById('deposit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('deposit-amount').value);
    const hash = document.getElementById('deposit-hash').value;
    try { await apiCall('/transaction/deposit','POST',{amount,transaction_hash:hash}); showNotification('Deposit request submitted!','success'); document.getElementById('deposit-form').reset(); loadDashboardStats(); } catch(error) { showNotification(error.message,'error'); }
  });
  document.getElementById('withdraw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    try { await apiCall('/transaction/withdraw','POST',{amount}); showNotification('Withdrawal request submitted!','success'); document.getElementById('withdraw-form').reset(); loadDashboardStats(); } catch(error) { showNotification(error.message,'error'); }
  });
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    try { await apiCall('/user/profile','PUT',{full_name,phone}); showNotification('Profile updated!','success'); loadUserInfo(); } catch(error) { showNotification(error.message,'error'); }
  });
}
function openInvestmentModal(planName,minAmount,maxAmount) {
  const modal = document.getElementById('investment-modal');
  document.getElementById('selected-plan-info').innerHTML = `<div class="plan-info-display"><h3>${planName.toUpperCase()} Plan</h3><p>Investment Range: $${minAmount.toLocaleString()} - $${maxAmount.toLocaleString()}</p></div>`;
  document.getElementById('investment-amount').min = minAmount;
  document.getElementById('investment-amount').max = maxAmount;
  document.getElementById('amount-hint').textContent = `Enter amount between $${minAmount.toLocaleString()} and $${maxAmount.toLocaleString()}`;
  modal.style.display='block'; window.selectedPlan = planName;
}
document.querySelector('.close')?.addEventListener('click', () => { document.getElementById('investment-modal').style.display='none'; });
document.getElementById('create-investment-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('investment-amount').value);
  try {
    await apiCall('/investment/create','POST',{plan_name:window.selectedPlan,amount});
    showNotification('Investment created successfully!','success');
    document.getElementById('investment-modal').style.display='none';
    document.getElementById('create-investment-form').reset();
    loadDashboardStats(); loadRecentInvestments(); loadMyInvestments();
  } catch(error) { showNotification(error.message,'error'); }
});
