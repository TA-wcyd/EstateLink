/**
 * EstateLink - Frontend Application
 * Handles theme toggling, authentication modal (Buyer/Seller vs Admin), and session state.
 */

import './bootstrap';

// Application State
const state = {
  token: localStorage.getItem('estatelink_token') || null,
  user: JSON.parse(localStorage.getItem('estatelink_user') || 'null'),
  theme: localStorage.getItem('estatelink_theme') || 'light',
  signInRole: 'user' // 'user' (Buyer/Seller) or 'admin'
};

// Initialize App on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuthSession();
  bindEventHandlers();
});

/* ==========================================================================
   Theme Management
   ========================================================================== */
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const themeButton = document.getElementById('theme-toggle-btn');
  if (themeButton) {
    themeButton.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    themeButton.title = state.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('estatelink_theme', state.theme);
  initTheme();
}

/* ==========================================================================
   Authentication & Session State Sync
   ========================================================================== */
async function initAuthSession() {
  const guestNav = document.getElementById('nav-guest-state');
  const userNav = document.getElementById('nav-user-state');
  const userNameEl = document.getElementById('nav-user-name');
  const userAvatarEl = document.getElementById('nav-user-avatar');

  const heroGuestActions = document.getElementById('hero-guest-actions');
  const heroUserActions = document.getElementById('hero-user-actions');
  const heroGuestBadge = document.getElementById('hero-guest-badge');
  const heroUserBadge = document.getElementById('hero-user-badge');
  const heroGreeting = document.getElementById('hero-user-greeting');
  const showcaseTag = document.getElementById('showcase-status-tag');

  if (state.token && state.user) {
    // Verify session with the backend API (/api/me)
    try {
      const response = await fetch('/api/me', {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        state.user = data.user;
        localStorage.setItem('estatelink_user', JSON.stringify(data.user));
      } else if (response.status === 401) {
        // Token has expired or been revoked
        logout(false);
        return;
      }
    } catch (error) {
      console.warn('Unable to sync profile with server:', error);
    }

    // --- LOGGED-IN STATE: All "Sign In" options are hidden ---
    if (guestNav) guestNav.style.display = 'none';
    if (userNav) userNav.style.display = 'flex';
    if (userNameEl) userNameEl.textContent = state.user.name;

    if (userAvatarEl) {
      const initials = state.user.name
        ? state.user.name.split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase()
        : 'U';
      userAvatarEl.textContent = initials;
    }

    if (heroGuestActions) heroGuestActions.style.display = 'none';
    if (heroUserActions) heroUserActions.style.display = 'flex';
    if (heroGuestBadge) heroGuestBadge.style.display = 'none';

    if (heroUserBadge) {
      heroUserBadge.style.display = 'inline-flex';
      const roleLabel = state.user.role === 'admin' ? 'Administrator' : (state.user.verification_status === 'verified' ? 'Verified Member' : 'Member');
      if (heroGreeting) heroGreeting.textContent = `Logged in as ${state.user.name} (${roleLabel})`;
    }

    if (showcaseTag) {
      showcaseTag.textContent = state.user.role === 'admin' ? '★ Admin Active' : '✓ Member Active';
    }
  } else {
    // --- GUEST STATE: Show Sign In options ---
    if (guestNav) guestNav.style.display = 'flex';
    if (userNav) userNav.style.display = 'none';

    if (heroGuestActions) heroGuestActions.style.display = 'flex';
    if (heroUserActions) heroUserActions.style.display = 'none';
    if (heroGuestBadge) heroGuestBadge.style.display = 'inline-flex';
    if (heroUserBadge) heroUserBadge.style.display = 'none';

    if (showcaseTag) {
      showcaseTag.textContent = '✓ Verified';
    }
  }
}

/* ==========================================================================
   Modal Controller & Role Segment Selector
   ========================================================================== */
window.openAuthModal = function (initialTab = 'login', initialRole = 'user') {
  closeAllModals();
  const modal = document.getElementById('modal-auth');
  if (modal) {
    modal.classList.add('active');
    switchAuthTab(initialTab);
    setSignInRole(initialRole);
  }
};

window.switchAuthTab = function (tabName) {
  const loginTab = document.getElementById('tab-btn-login');
  const registerTab = document.getElementById('tab-btn-register');
  const loginPane = document.getElementById('pane-login');
  const registerPane = document.getElementById('pane-register');

  if (tabName === 'login') {
    loginTab?.classList.add('active');
    registerTab?.classList.remove('active');
    if (loginPane) loginPane.style.display = 'block';
    if (registerPane) registerPane.style.display = 'none';
  } else {
    registerTab?.classList.add('active');
    loginTab?.classList.remove('active');
    if (loginPane) loginPane.style.display = 'none';
    if (registerPane) registerPane.style.display = 'block';
  }
};

window.setSignInRole = function (role) {
  state.signInRole = role;

  const btnUser = document.getElementById('role-btn-user');
  const btnAdmin = document.getElementById('role-btn-admin');
  const bannerUser = document.getElementById('banner-user-portal');
  const bannerAdmin = document.getElementById('banner-admin-portal');
  const submitBtn = document.getElementById('login-submit-btn');
  const emailInput = document.getElementById('login-email');
  const promptEl = document.getElementById('login-bottom-prompt');

  if (role === 'admin') {
    btnAdmin?.classList.add('active');
    btnUser?.classList.remove('active');

    if (bannerAdmin) bannerAdmin.style.display = 'flex';
    if (bannerUser) bannerUser.style.display = 'none';

    if (submitBtn) {
      submitBtn.textContent = 'Sign In as Administrator';
      submitBtn.className = 'btn btn-admin w-full';
    }
    if (emailInput) {
      emailInput.placeholder = 'admin@estatelink.com';
    }
    if (promptEl) {
      promptEl.style.display = 'none';
    }
  } else {
    btnUser?.classList.add('active');
    btnAdmin?.classList.remove('active');

    if (bannerUser) bannerUser.style.display = 'flex';
    if (bannerAdmin) bannerAdmin.style.display = 'none';

    if (submitBtn) {
      submitBtn.textContent = 'Sign In as Buyer / Seller';
      submitBtn.className = 'btn btn-primary w-full';
    }
    if (emailInput) {
      emailInput.placeholder = 'name@example.com';
    }
    if (promptEl) {
      promptEl.style.display = 'block';
    }
  }
};

window.openProfileModal = function () {
  if (!state.user) return;
  const user = state.user;
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const modalBody = document.getElementById('profile-modal-body');
  if (modalBody) {
    modalBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 18px;">
        <div class="user-avatar" style="width: 52px; height: 52px; font-size: 1.25rem; margin: 0 auto 10px; ${user.role === 'admin' ? 'background-color: #6366f1;' : ''}">
          ${initials}
        </div>
        <h3 style="font-size: 1.25rem; margin-bottom: 2px;">${user.name}</h3>
        <p style="color: var(--color-text-muted); font-size: 0.85rem;">${user.email}</p>
        <div style="margin-top: 6px;">
          <span style="font-size: 0.75rem; font-weight: 700; padding: 2px 10px; border-radius: 9999px; ${user.role === 'admin' ? 'background: rgba(99,102,241,0.15); color: #6366f1;' : 'background: rgba(15,118,110,0.15); color: #0f766e;'}">
            ${user.role === 'admin' ? '★ System Administrator' : (user.verification_status === 'verified' ? '✓ Verified Buyer / Seller' : '⏳ Pending NID Verification')}
          </span>
        </div>
      </div>

      <div style="background-color: var(--color-input); border-radius: var(--radius-md); padding: 14px; margin-bottom: 18px; font-size: 0.875rem; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--color-text-muted);">Account Type:</span>
          <strong style="text-transform: capitalize;">${user.role === 'admin' ? 'Administrator' : 'Buyer / Seller'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--color-text-muted);">National ID:</span>
          <strong>${user.national_id || 'N/A'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--color-text-muted);">Phone Number:</span>
          <strong>${user.phone || 'N/A'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--color-text-muted);">Company / Agency:</span>
          <strong>${user.company_name || 'Individual'}</strong>
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secondary w-full" onclick="closeAllModals()">Close</button>
        <button class="btn btn-primary w-full" onclick="logout(true)" style="background-color: #ef4444;">Sign Out</button>
      </div>
    `;

    closeAllModals();
    document.getElementById('modal-profile')?.classList.add('active');
  }
};

window.closeAllModals = function () {
  document.querySelectorAll('.modal-backdrop').forEach(modal => modal.classList.remove('active'));
};

/* ==========================================================================
   Event Bindings
   ========================================================================== */
function bindEventHandlers() {
  // Theme toggle button
  document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

  // Close modals on clicking overlay or close button
  document.querySelectorAll('.modal-close-btn, .modal-backdrop').forEach(element => {
    element.addEventListener('click', (event) => {
      if (event.target === element) closeAllModals();
    });
  });

  // Tab buttons (Sign In vs Register)
  document.getElementById('tab-btn-login')?.addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tab-btn-register')?.addEventListener('click', () => switchAuthTab('register'));

  // Quick fill demo admin credentials
  document.getElementById('fill-admin-btn')?.addEventListener('click', () => {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    if (emailInput && passwordInput) {
      emailInput.value = 'tamjid@gmail.com';
      passwordInput.value = 'tamjid123';
      showToast('Admin credentials filled');
    }
  });

  // Login Form Submission
  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('login-submit-btn');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Verifying credentials...';

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
          state.token = data.token;
          state.user = data.user;
          localStorage.setItem('estatelink_token', data.token);
          localStorage.setItem('estatelink_user', JSON.stringify(data.user));

          if (state.signInRole === 'admin' && data.user.role !== 'admin') {
            showToast(`Signed in as ${data.user.name} (Member account)`);
          } else {
            showToast(`Welcome back, ${data.user.name}!`);
          }

          initAuthSession();
          closeAllModals();
          loginForm.reset();
        } else {
          const errorMessage = data.errors
            ? Object.values(data.errors).flat().join(', ')
            : (data.message || 'Incorrect email or password.');
          showToast(errorMessage, 'error');
        }
      } catch (error) {
        showToast('Unable to connect to the server. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        setSignInRole(state.signInRole);
      }
    });
  }

  // Registration Form Submission
  const registerForm = document.getElementById('form-register');
  if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const phone = document.getElementById('register-phone').value.trim();
      const national_id = document.getElementById('register-nid').value.trim();
      const company_name = document.getElementById('register-company').value.trim();
      const password = document.getElementById('register-password').value;
      const password_confirmation = document.getElementById('register-password-confirm').value;
      const submitBtn = document.getElementById('register-submit-btn');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      try {
        const payload = {
          name,
          email,
          phone,
          national_id,
          password,
          password_confirmation
        };
        if (company_name) payload.company_name = company_name;

        const response = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          state.token = data.token;
          state.user = data.user;
          localStorage.setItem('estatelink_token', data.token);
          localStorage.setItem('estatelink_user', JSON.stringify(data.user));

          showToast('Buyer / Seller account registered successfully!');
          initAuthSession();
          closeAllModals();
          registerForm.reset();
        } else {
          const errorMessage = data.errors
            ? Object.values(data.errors).flat().join(', ')
            : (data.message || 'Registration could not be completed.');
          showToast(errorMessage, 'error');
        }
      } catch (error) {
        showToast('Unable to connect to the server. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Buyer / Seller Account';
      }
    });
  }
}

/* ==========================================================================
   Logout Helper
   ========================================================================== */
window.logout = async function (notifyServer = true) {
  if (notifyServer && state.token) {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });
    } catch (error) {
      console.warn('Logout notification error:', error);
    }
  }

  state.token = null;
  state.user = null;
  localStorage.removeItem('estatelink_token');
  localStorage.removeItem('estatelink_user');

  initAuthSession();
  closeAllModals();
  showToast('You have been signed out.');
};

/* ==========================================================================
   Toast Notification Helper
   ========================================================================== */
window.showToast = function (message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-box';
    document.body.appendChild(toastContainer);
  }

  const toastItem = document.createElement('div');
  toastItem.className = `toast-message ${type === 'error' ? 'error' : ''}`;
  toastItem.textContent = message;
  toastContainer.appendChild(toastItem);

  setTimeout(() => {
    toastItem.style.opacity = '0';
    toastItem.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toastItem.remove(), 300);
  }, 3500);
};
