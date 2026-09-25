/**
 * Auth Module - Handles Authentication, Login, Register, Session Sync, Role Selection, Modals & Logout
 */
import { state } from '../state';
import { showToast } from '../utils';

export class AuthManager {
  static async initAuthSession() {
    const guestNav = document.getElementById('nav-guest-state');
    const userNav = document.getElementById('nav-user-state');
    const userNameEl = document.getElementById('nav-user-name');
    const userAvatarEl = document.getElementById('nav-user-avatar');

    const heroGuestActions = document.getElementById('hero-guest-actions');
    const heroUserActions = document.getElementById('hero-user-actions');
    const heroGuestBadge = document.getElementById('hero-guest-badge');
    const heroUserBadge = document.getElementById('hero-user-badge');
    const heroGreeting = document.getElementById('hero-user-greeting');
    const myListingsNav = document.getElementById('nav-link-my-properties');
    const myRequestsNav = document.getElementById('nav-link-my-requests');
    const adminQueueNav = document.getElementById('nav-link-admin-queue');
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
          AuthManager.logout(false);
          return;
        }
      } catch (error) {
        console.warn('Unable to sync profile with server:', error);
      }

      // --- LOGGED-IN STATE ---
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
      if (myListingsNav) myListingsNav.style.display = 'inline-flex';
      if (myRequestsNav) myRequestsNav.style.display = 'inline-flex';
      const myBidsNav = document.getElementById('nav-link-my-bids');
      if (myBidsNav) myBidsNav.style.display = 'inline-flex';
      const profileNav = document.getElementById('nav-link-profile');
      if (profileNav) profileNav.style.display = 'inline-flex';

      if (heroUserBadge) {
        heroUserBadge.style.display = 'inline-flex';
        const roleLabel = state.user.role === 'admin' ? 'Administrator' : (state.user.verification_status === 'verified' ? 'Verified Member' : 'Member');
        if (heroGreeting) heroGreeting.textContent = `Logged in as ${state.user.name} (${roleLabel})`;
      }

      if (adminQueueNav) {
        adminQueueNav.style.display = state.user.role === 'admin' ? 'inline-flex' : 'none';
        if (state.user.role === 'admin' && window.loadAdminPendingCount) {
          window.loadAdminPendingCount();
        }
      }

      if (showcaseTag) {
        showcaseTag.textContent = state.user.role === 'admin' ? '★ Admin Active' : '✓ Member Active';
      }
    } else {
      // --- GUEST STATE ---
      if (guestNav) guestNav.style.display = 'flex';
      if (userNav) userNav.style.display = 'none';

      if (heroGuestActions) heroGuestActions.style.display = 'flex';
      if (heroUserActions) heroUserActions.style.display = 'none';
      if (heroGuestBadge) heroGuestBadge.style.display = 'inline-flex';
      if (heroUserBadge) heroUserBadge.style.display = 'none';
      if (myListingsNav) myListingsNav.style.display = 'none';
      const myRequestsNav = document.getElementById('nav-link-my-requests');
      if (myRequestsNav) myRequestsNav.style.display = 'none';
      const myBidsNav = document.getElementById('nav-link-my-bids');
      if (myBidsNav) myBidsNav.style.display = 'none';
      const profileNav = document.getElementById('nav-link-profile');
      if (profileNav) profileNav.style.display = 'none';
      if (adminQueueNav) adminQueueNav.style.display = 'none';

      if (showcaseTag) {
        showcaseTag.textContent = '✓ Verified';
      }
    }
  }

  static openAuthModal(initialTab = 'login', initialRole = 'user') {
    AuthManager.closeAllModals();
    const modal = document.getElementById('modal-auth');
    if (modal) {
      modal.classList.add('active');
      AuthManager.switchAuthTab(initialTab);
      AuthManager.setSignInRole(initialRole);
    }
  }

  static switchAuthTab(tabName) {
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
  }

  static setSignInRole(role) {
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
  }

  static closeAllModals() {
    if (state.auctionPollingInterval) {
      clearInterval(state.auctionPollingInterval);
      state.auctionPollingInterval = null;
    }
    if (state.auctionCountdownInterval) {
      clearInterval(state.auctionCountdownInterval);
      state.auctionCountdownInterval = null;
    }
    document.querySelectorAll('.modal-backdrop').forEach(modal => modal.classList.remove('active'));
  }

  static async logout(notifyServer = true) {
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

    AuthManager.initAuthSession();
    AuthManager.closeAllModals();
    showToast('You have been signed out.');
    if (window.navigateTo) window.navigateTo('/');
  }

  static setupAuthFormHandlers() {
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

    // Tab buttons
    document.getElementById('tab-btn-login')?.addEventListener('click', () => AuthManager.switchAuthTab('login'));
    document.getElementById('tab-btn-register')?.addEventListener('click', () => AuthManager.switchAuthTab('register'));

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

            showToast(`Welcome back, ${data.user.name}!`);
            AuthManager.initAuthSession();
            AuthManager.closeAllModals();
            loginForm.reset();

            if (state.currentRoute === '/sell-property' && window.handleRoute) {
              window.handleRoute('/sell-property');
            }
          } else {
            const errorMessage = data.errors
              ? Object.values(data.errors).flat().join(', ')
              : (data.message || 'Incorrect email or password.');
            showToast(errorMessage, 'error');
          }
        } catch (error) {
          showToast('Unable to connect to the server.', 'error');
        } finally {
          submitBtn.disabled = false;
          AuthManager.setSignInRole(state.signInRole);
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

            showToast('Account registered successfully!');
            AuthManager.initAuthSession();
            AuthManager.closeAllModals();
            registerForm.reset();
          } else {
            const errorMessage = data.errors
              ? Object.values(data.errors).flat().join(', ')
              : (data.message || 'Registration could not be completed.');
            showToast(errorMessage, 'error');
          }
        } catch (error) {
          showToast('Unable to connect to the server.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Buyer / Seller Account';
        }
      });
    }
  }
}
