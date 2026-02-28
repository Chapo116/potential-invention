const API_CONFIG = { BASE_URL: '/api' };
async function apiCall(endpoint, method = 'GET', data = null) {
  const token = localStorage.getItem('apexbroker_token');
  const options = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  if (data && method !== 'GET') options.body = JSON.stringify(data);
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'API request failed');
    return result;
  } catch (error) { throw error; }
}
function isAuthenticated() { return !!localStorage.getItem('apexbroker_token'); }
function requireAuth() { if (!isAuthenticated()) window.location.href = '/'; }
function logout() { localStorage.removeItem('apexbroker_token'); localStorage.removeItem('apexbroker_user'); window.location.href = '/'; }
function formatCurrency(amount) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0); }
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function showNotification(message, type = 'info') {
  document.querySelectorAll('.notification').forEach(n => n.remove());
  const n = document.createElement('div');
  n.className = `notification ${type}`;
  n.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':type==='error'?'exclamation-circle':'info-circle'}"></i> ${message}`;
  document.body.appendChild(n);
  setTimeout(() => { n.style.opacity='0'; setTimeout(() => n.remove(), 300); }, 3000);
}
