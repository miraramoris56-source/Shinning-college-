/* ============================================
   FILE: script.js
   LOCATION: Root of repository
   ============================================ */

// ============ CONFIG ============
// Change this to your deployed backend URL when ready
const API_URL = 'http://localhost:5000/api';

// ============ STATE ============
let token = localStorage.getItem('ssc_token') || null;
let currentUser = null;

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  if (token) verifySession();
  setupForms();
});

// ============ SESSION ============
async function verifySession() {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      updateUIForAuth();
    } else {
      logout();
    }
  } catch {
    console.warn('Backend offline');
  }
}

function updateUIForAuth() {
  const authArea = document.getElementById('authArea');
  authArea.innerHTML = `
    <button class="btn btn-outline" onclick="openDashboard()">
      <i class="fas fa-user"></i> ${currentUser.name.split(' ')[0]}
    </button>
    <button class="btn btn-primary" onclick="logout()">Logout</button>
  `;
}

function logout() {
  localStorage.removeItem('ssc_token');
  token = null;
  currentUser = null;
  location.reload();
}

// ============ MODALS ============
function openModal(type) {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  document.getElementById(`${type}Modal`).classList.add('active');
}

function closeModal(type) {
  document.getElementById(`${type}Modal`).classList.remove('active');
}

function switchModal(type) {
  closeModal(type === 'login' ? 'register' : 'login');
  openModal(type);
}

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
});

// ============ ALERTS ============
function showAlert(id, message, type = 'error') {
  const el = document.getElementById(id);
  el.textContent = message;
  el.className = `alert show ${type}`;
  setTimeout(() => el.className = 'alert', 4000);
}

// ============ FORMS ============
function setupForms() {
  // Login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('ssc_token', token);
        showAlert('loginAlert', 'Login successful!', 'success');
        setTimeout(() => {
          closeModal('login');
          updateUIForAuth();
          e.target.reset();
        }, 800);
      } else {
        showAlert('loginAlert', data.message || 'Login failed');
      }
    } catch {
      showAlert('loginAlert', 'Cannot connect to server');
    }
  });

  // Register
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();

      if (data.success) {
        token = data.token;
        currentUser = data.user;
        localStorage.setItem('ssc_token', token);
        showAlert('registerAlert', 'Account created!', 'success');
        setTimeout(() => {
          closeModal('register');
          updateUIForAuth();
          e.target.reset();
        }, 800);
      } else {
        showAlert('registerAlert', data.message || 'Registration failed');
      }
    } catch {
      showAlert('registerAlert', 'Cannot connect to server');
    }
  });

  // Contact
  document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('contactName').value,
      email: document.getElementById('contactEmail').value,
      subject: document.getElementById('contactSubject').value,
      message: document.getElementById('contactMessage').value
    };

    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      alert(data.success ? '✅ Message sent successfully!' : '❌ Failed to send');
      if (data.success) e.target.reset();
    } catch {
      alert('❌ Cannot connect to server');
    }
  });
}

// ============ PROGRAM APPLICATION ============
async function applyProgram(program) {
  if (!token) {
    alert('Please login first to apply');
    openModal('login');
    return;
  }

  const nameParts = (currentUser.name || 'Student User').split(' ');

  const application = {
    firstName: nameParts[0] || 'Student',
    lastName: nameParts[1] || 'User',
    email: currentUser.email,
    phone: '000-000-0000',
    program: program,
    academicBackground: {
      highSchool: 'Not specified',
      graduationYear: new Date().getFullYear(),
      gpa: 3.5
    }
  };

  try {
    const res = await fetch(`${API_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(application)
    });
    const data = await res.json();
    alert(data.success ? `✅ Applied to ${program}!` : '❌ Application failed');
  } catch {
    alert('❌ Cannot connect to server');
  }
}

// ============ DASHBOARD ============
async function openDashboard() {
  openModal('dashboard');
  const content = document.getElementById('dashboardContent');
  content.innerHTML = '<p>Loading...</p>';

  try {
    const res = await fetch(`${API_URL}/applications/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.applications.length > 0) {
      content.innerHTML = `
        <h3 style="margin-bottom:1rem;">Welcome, ${currentUser.name}</h3>
        <h4 style="margin-bottom:0.8rem;">Your Applications</h4>
        ${data.applications.map(app => `
          <div class="app-item">
            <h4>${app.program}</h4>
            <span class="status ${app.status}">${app.status}</span>
            <small style="display:block;color:#64748b;margin-top:0.4rem;">
              Applied: ${new Date(app.appliedDate).toLocaleDateString()}
            </small>
          </div>
        `).join('')}
      `;
    } else {
      content.innerHTML = `
        <h3>Welcome, ${currentUser.name}</h3>
        <p style="color:#64748b;margin-top:1rem;">No applications yet. Browse our programs and apply!</p>
      `;
    }
  } catch {
    content.innerHTML = '<p>Failed to load dashboard</p>';
  }
}

// ============ MOBILE MENU ============
function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('active');
}

// ============ SMOOTH SCROLL ============
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('navLinks').classList.remove('active');
    }
  });
});
