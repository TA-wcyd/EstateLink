/**
 * Router Module - Client-side SPA Routing
 */
import { state } from '../state';
import { showToast } from '../utils';

export class Router {
  static navigateTo(path) {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    Router.handleRoute(path);
  }

  static initRouter() {
    window.addEventListener('popstate', () => {
      Router.handleRoute(window.location.pathname);
    });
    Router.handleRoute(window.location.pathname);
  }

  static handleRoute(path) {
    state.currentRoute = path;

    // If leaving the compare page, clear the selection state so cards reset
    if (!path.startsWith('/compare') && !path.startsWith('/properties/compare')) {
      if (window.clearCompareState) window.clearCompareState();
    }

    // Property comparison link /compare or /properties/compare
    if (path.startsWith('/compare') || path.startsWith('/properties/compare')) {
      Router.showView('view-compare');
      if (window.loadComparisonPage) window.loadComparisonPage();
      Router.updateNavActiveState('/compare');
      if (window.updateFloatingDock) window.updateFloatingDock();
      return;
    }

    // Direct property link /properties/:id
    if (path.startsWith('/properties/')) {
      const id = path.split('/')[2];
      if (id && !isNaN(id)) {
        Router.showView('view-properties');
        if (window.loadPublicProperties) window.loadPublicProperties(1);
        if (window.openPropertyDetailModal) window.openPropertyDetailModal(id);
        Router.updateNavActiveState('/properties');
        return;
      }
    }

    // Update Nav Active states
    Router.updateNavActiveState(path);

    switch (path) {
      case '/properties':
        Router.showView('view-properties');
        if (window.loadPublicProperties) window.loadPublicProperties(1);
        break;

      case '/compare':
      case '/properties/compare':
        Router.showView('view-compare');
        if (window.loadComparisonPage) window.loadComparisonPage();
        break;

      case '/sell-property':
        if (!state.token || !state.user) {
          showToast('Please sign in to list your property.', 'info');
          if (window.openAuthModal) window.openAuthModal('login', 'user');
          Router.navigateTo('/');
          return;
        }
        Router.showView('view-sell-property');
        if (!state.sellForm.editId && window.resetSellForm) {
          window.resetSellForm();
        }
        break;

      case '/my-properties':
        if (!state.token || !state.user) {
          showToast('Please sign in to view your listings.', 'info');
          if (window.openAuthModal) window.openAuthModal('login', 'user');
          Router.navigateTo('/');
          return;
        }
        Router.showView('view-my-properties');
        if (window.loadMyProperties) window.loadMyProperties();
        break;

      case '/my-bids':
        if (!state.token || !state.user) {
          showToast('Please sign in to view your placed bids and auction portfolio.', 'info');
          if (window.openAuthModal) window.openAuthModal('login', 'user');
          Router.navigateTo('/');
          return;
        }
        Router.showView('view-my-bids');
        if (window.loadMyBids) window.loadMyBids();
        break;

      case '/my-requests':
        if (!state.token || !state.user) {
          showToast('Please sign in to view your purchase requests.', 'info');
          if (window.openAuthModal) window.openAuthModal('login', 'user');
          Router.navigateTo('/');
          return;
        }
        Router.showView('view-my-requests');
        if (window.loadMyRequests) window.loadMyRequests();
        break;

      case '/profile':
        if (!state.token || !state.user) {
          showToast('Please sign in to view your profile.', 'info');
          if (window.openAuthModal) window.openAuthModal('login', 'user');
          Router.navigateTo('/');
          return;
        }
        Router.showView('view-profile');
        if (window.loadProfilePage) window.loadProfilePage();
        break;

      case '/admin/properties':
        if (!state.token || !state.user || state.user.role !== 'admin') {
          showToast('Admin authorization required.', 'error');
          Router.navigateTo('/');
          return;
        }
        Router.showView('view-admin-properties');
        if (window.loadAdminQueue) window.loadAdminQueue(state.adminQueueTab);
        break;

      case '/':
      default:
        Router.showView('view-home');
        if (window.loadHomeFeaturedProperties) window.loadHomeFeaturedProperties();
        break;
    }
  }

  static showView(viewId) {
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active');
    });
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  static updateNavActiveState(path) {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if (path === '/') document.getElementById('nav-link-home')?.classList.add('active');
    else if (path.startsWith('/compare')) document.getElementById('nav-link-compare')?.classList.add('active');
    else if (path.startsWith('/properties')) document.getElementById('nav-link-properties')?.classList.add('active');
    else if (path === '/sell-property') document.getElementById('nav-link-sell')?.classList.add('active');
    else if (path === '/my-properties') document.getElementById('nav-link-my-properties')?.classList.add('active');
    else if (path === '/my-bids') document.getElementById('nav-link-my-bids')?.classList.add('active');
    else if (path === '/my-requests') document.getElementById('nav-link-my-requests')?.classList.add('active');
    else if (path === '/profile') document.getElementById('nav-link-profile')?.classList.add('active');
    else if (path.startsWith('/admin')) document.getElementById('nav-link-admin-queue')?.classList.add('active');
  }
}
