/**
 * EstateLink - Frontend Application
 * Handles authentication, client-side SPA routing, property listing,
 * public browsing with pagination, seller property submission,
 * and admin verification workflows.
 */

import './bootstrap';

// Application State
const state = {
  token: localStorage.getItem('estatelink_token') || null,
  user: JSON.parse(localStorage.getItem('estatelink_user') || 'null'),
  theme: localStorage.getItem('estatelink_theme') || 'light',
  signInRole: 'user', // 'user' (Buyer/Seller) or 'admin'
  currentRoute: '/',
  sellForm: {
    selectedImages: [],   // Array of File objects
    existingImages: [],   // Array of {id, url, is_primary} when editing
    nidFile: null,
    propFile: null,
    editId: null
  },
  adminQueueTab: 'pending',
  profileProperties: [],
  profileSubmissionsTab: 'all',
  auctionPollingInterval: null,
  auctionCountdownInterval: null,
  activeAuctionData: null
};

// Initialize App on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initAuthSession();
  bindEventHandlers();
  initRouter();
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
   Client-Side SPA Routing
   ========================================================================== */
window.navigateTo = function (path) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
  handleRoute(path);
};

function initRouter() {
  window.addEventListener('popstate', () => {
    handleRoute(window.location.pathname);
  });
  handleRoute(window.location.pathname);
}

function handleRoute(path) {
  state.currentRoute = path;
  
  // Direct property link /properties/:id
  if (path.startsWith('/properties/')) {
    const id = path.split('/')[2];
    if (id && !isNaN(id)) {
      showView('view-properties');
      loadPublicProperties(1);
      openPropertyDetailModal(id);
      updateNavActiveState('/properties');
      return;
    }
  }

  // Update Nav Active states
  updateNavActiveState(path);

  switch (path) {
    case '/properties':
      showView('view-properties');
      loadPublicProperties(1);
      break;

    case '/sell-property':
      if (!state.token || !state.user) {
        showToast('Please sign in to list your property.', 'info');
        openAuthModal('login', 'user');
        navigateTo('/');
        return;
      }
      showView('view-sell-property');
      if (!state.sellForm.editId) {
        resetSellForm();
      }
      break;

    case '/my-properties':
      if (!state.token || !state.user) {
        showToast('Please sign in to view your listings.', 'info');
        openAuthModal('login', 'user');
        navigateTo('/');
        return;
      }
      showView('view-my-properties');
      loadMyProperties();
      break;

    case '/my-bids':
      if (!state.token || !state.user) {
        showToast('Please sign in to view your placed bids and auction portfolio.', 'info');
        openAuthModal('login', 'user');
        navigateTo('/');
        return;
      }
      showView('view-my-bids');
      loadMyBids();
      break;

    case '/profile':
      if (!state.token || !state.user) {
        showToast('Please sign in to view your profile.', 'info');
        openAuthModal('login', 'user');
        navigateTo('/');
        return;
      }
      showView('view-profile');
      loadProfilePage();
      break;

    case '/admin/properties':
      if (!state.token || !state.user || state.user.role !== 'admin') {
        showToast('Admin authorization required.', 'error');
        navigateTo('/');
        return;
      }
      showView('view-admin-properties');
      loadAdminQueue(state.adminQueueTab);
      break;

    case '/':
    default:
      showView('view-home');
      break;
  }
}

function showView(viewId) {
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active');
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function updateNavActiveState(path) {
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  if (path === '/') document.getElementById('nav-link-home')?.classList.add('active');
  else if (path.startsWith('/properties')) document.getElementById('nav-link-properties')?.classList.add('active');
  else if (path === '/sell-property') document.getElementById('nav-link-sell')?.classList.add('active');
  else if (path === '/my-properties') document.getElementById('nav-link-my-properties')?.classList.add('active');
  else if (path === '/my-bids') document.getElementById('nav-link-my-bids')?.classList.add('active');
  else if (path === '/profile') document.getElementById('nav-link-profile')?.classList.add('active');
  else if (path.startsWith('/admin')) document.getElementById('nav-link-admin-queue')?.classList.add('active');
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
  const myListingsNav = document.getElementById('nav-link-my-properties');
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
        logout(false);
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
      if (state.user.role === 'admin') {
        loadAdminPendingCount();
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

/* ==========================================================================
   PUBLIC PROPERTIES PAGE LOGIC (GET /api/properties)
   ========================================================================== */
window.loadPublicProperties = async function (page = 1) {
  const container = document.getElementById('public-properties-container');
  const pagination = document.getElementById('public-pagination-container');
  if (!container) return;

  container.innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <p>Loading verified properties...</p>
    </div>
  `;
  if (pagination) pagination.innerHTML = '';

  const search = document.getElementById('filter-search')?.value.trim() || '';
  const type = document.getElementById('filter-type')?.value || '';
  const bedrooms = document.getElementById('filter-bedrooms')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';

  const queryParams = new URLSearchParams({
    page: page,
    per_page: 9
  });
  if (search) queryParams.append('search', search);
  if (type) queryParams.append('property_type', type);
  if (bedrooms) queryParams.append('bedrooms', bedrooms);
  if (status) queryParams.append('transaction_status', status);

  try {
    const response = await fetch(`/api/properties?${queryParams.toString()}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error('Failed to load properties');

    const result = await response.json();
    const properties = result.data || [];

    if (properties.length === 0) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🏢</div>
          <h3 style="font-size: 1.2rem; margin-bottom: 6px;">No Verified Properties Found</h3>
          <p style="margin-bottom: 16px;">There are no approved listings matching your current search criteria.</p>
          <button class="btn btn-secondary btn-sm" onclick="resetPublicFilters()">Reset Filters</button>
        </div>
      `;
      return;
    }

    // Render Grid Cards
    let html = '<div class="properties-grid">';
    properties.forEach(p => {
      const fallbackImage = '/images/hero_building.jpg';
      const imageUrl = p.main_image || fallbackImage;
      const formattedPrice = formatCurrency(p.price);
      const statusLabel = (p.transaction_status || 'available').replace(/_/g, ' ');
      const auction = p.live_auction;
      const isLiveAuction = auction && auction.is_active;
      const isAwaitingConfirm = auction && auction.status === 'awaiting_seller_confirmation';

      // Compute a short human-readable countdown for cards
      let auctionCountdownHtml = '';
      if (isLiveAuction && auction.end_time) {
        const secsLeft = Math.max(0, Math.floor((new Date(auction.end_time) - Date.now()) / 1000));
        const h = Math.floor(secsLeft / 3600);
        const m = Math.floor((secsLeft % 3600) / 60);
        const s = secsLeft % 60;
        const timeStr = h > 0
          ? `${h}h ${m}m left`
          : m > 0
          ? `${m}m ${s}s left`
          : `${s}s left`;
        auctionCountdownHtml = `
          <div class="card-auction-strip">
            <span class="card-auction-dot"></span>
            <span class="card-auction-strip-label">LIVE AUCTION</span>
            <span class="card-auction-strip-timer">${timeStr}</span>
            <span class="card-auction-strip-bids">${auction.total_bids} bid${auction.total_bids !== 1 ? 's' : ''}</span>
          </div>`;
      } else if (isAwaitingConfirm) {
        auctionCountdownHtml = `
          <div class="card-auction-strip card-auction-strip--ended">
            <span>⏳</span>
            <span class="card-auction-strip-label">AUCTION ENDED</span>
            <span class="card-auction-strip-bids">Awaiting seller decision</span>
          </div>`;
      }

      html += `
        <div class="property-card${isLiveAuction ? ' card--live-auction' : ''}">
          <div class="card-image-wrap">
            <img src="${imageUrl}" alt="${escapeHtml(p.title)}" class="card-image" onerror="this.src='${fallbackImage}'">
            <div class="card-badges">
              <span class="status-chip chip-type">${escapeHtml(p.property_type)}</span>
              <span class="status-chip chip-${p.transaction_status || 'available'}">${escapeHtml(statusLabel)}</span>
            </div>
            ${isLiveAuction ? `
              <div class="card-live-badge">
                <span class="live-pulse-dot"></span>
                <span>🔴 LIVE BIDDING</span>
              </div>
            ` : ''}
          </div>
          ${auctionCountdownHtml}
          <div class="card-body">
            <div class="card-price">
              ${formattedPrice}
              ${isLiveAuction && auction.total_bids > 0 ? `<span style="font-size:0.7rem;font-weight:600;color:var(--color-brand);margin-left:6px;opacity:0.8;">Top bid active</span>` : ''}
            </div>
            <h3 class="card-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</h3>
            <div class="card-location">
              <span>📍</span> ${escapeHtml(p.location)}
            </div>
            <div class="card-specs">
              <span class="spec-item">📐 ${p.size} sqft</span>
              ${p.bedrooms !== null ? `<span class="spec-item">🛏️ ${p.bedrooms} Beds</span>` : ''}
              ${p.bathrooms !== null ? `<span class="spec-item">🚿 ${p.bathrooms} Baths</span>` : ''}
            </div>
            <div class="card-footer">
              <div class="seller-mini">
                <div class="seller-avatar-mini">✓</div>
                <div>
                  <strong>${escapeHtml(p.seller?.name || 'Verified Seller')}</strong>
                  ${p.seller?.company_name ? `<div style="font-size: 0.72rem; color: var(--color-text-muted);">${escapeHtml(p.seller.company_name)}</div>` : ''}
                </div>
              </div>
              <button class="btn btn-sm ${isLiveAuction ? 'btn-bid-now' : 'btn-primary'}" onclick="openPropertyDetailModal(${p.id})">
                ${isLiveAuction ? '⚡ Bid Now' : 'View Details'}
              </button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;

    // Render Pagination
    renderPagination(result, pagination, 'loadPublicProperties');

  } catch (error) {
    console.error('Properties load error:', error);
    container.innerHTML = `
      <div class="state-box">
        <div class="state-icon">⚠️</div>
        <h3>Unable to load properties</h3>
        <p>Please check your internet connection or server status.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="loadPublicProperties(${page})">Try Again</button>
      </div>
    `;
  }
};

window.resetPublicFilters = function () {
  const searchInput = document.getElementById('filter-search');
  const typeSelect = document.getElementById('filter-type');
  const bedsSelect = document.getElementById('filter-bedrooms');
  const statusSelect = document.getElementById('filter-status');

  if (searchInput) searchInput.value = '';
  if (typeSelect) typeSelect.value = '';
  if (bedsSelect) bedsSelect.value = '';
  if (statusSelect) statusSelect.value = '';

  loadPublicProperties(1);
};

/* ==========================================================================
   PUBLIC PROPERTY DETAIL MODAL (GET /api/properties/{id})
   ========================================================================== */
window.openPropertyDetailModal = async function (id) {
  const modal = document.getElementById('modal-property-detail');
  const body = document.getElementById('property-detail-body');
  const titleEl = document.getElementById('detail-modal-title');
  if (!modal || !body) return;

  closeAllModals();
  modal.classList.add('active');
  body.innerHTML = `
    <div class="state-box" style="padding: 40px 0;">
      <div class="spinner"></div>
      <p>Loading property details...</p>
    </div>
  `;

  try {
    const response = await fetch(`/api/properties/${id}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      body.innerHTML = `
        <div class="state-box">
          <h3>Property Not Available</h3>
          <p>This property may not exist or is currently awaiting admin verification.</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 12px;" onclick="closeAllModals()">Close</button>
        </div>
      `;
      return;
    }

    const data = await response.json();
    const p = data.property;

    if (titleEl) titleEl.textContent = p.title;

    const fallbackImage = '/images/hero_building.jpg';
    const mainImg = p.main_image || fallbackImage;
    const imagesList = p.images && p.images.length > 0 ? p.images : [{ id: 0, url: mainImg }];
    const contactPhone = p.phone || p.seller?.phone;

    body.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="position: relative; height: 340px; border-radius: var(--radius-lg); overflow: hidden; background: #0f172a; margin-bottom: 12px;">
          <img id="detail-main-img" src="${mainImg}" alt="${escapeHtml(p.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${fallbackImage}'">
          <div style="position: absolute; top: 12px; left: 12px; display: flex; gap: 8px;">
            <span class="status-chip chip-type">${escapeHtml(p.property_type)}</span>
            <span class="status-chip chip-${p.transaction_status || 'available'}">${escapeHtml((p.transaction_status || 'available').replace(/_/g, ' '))}</span>
          </div>
        </div>

        ${imagesList.length > 1 ? `
          <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
            ${imagesList.map(img => `
              <img src="${img.url}" style="width: 70px; height: 55px; object-fit: cover; border-radius: var(--radius-md); cursor: pointer; border: 2px solid var(--color-border);" onclick="document.getElementById('detail-main-img').src='${img.url}'" onerror="this.src='${fallbackImage}'">
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-size: 1.45rem; font-weight: 800; margin-bottom: 4px;">${escapeHtml(p.title)}</h2>
          <div style="color: var(--color-text-muted); font-size: 0.9rem;">📍 ${escapeHtml(p.address || p.location)}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.6rem; font-weight: 800; color: var(--color-brand);">${formatCurrency(p.price)}</div>
          <span style="font-size: 0.8rem; color: var(--color-text-muted);">Verified Listing</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; background: var(--color-input); padding: 14px; border-radius: var(--radius-md); margin-bottom: 20px;">
        <div><span style="color: var(--color-text-muted); font-size: 0.75rem; display: block;">SIZE</span><strong>${p.size} Sq. Ft</strong></div>
        ${p.bedrooms !== null ? `<div><span style="color: var(--color-text-muted); font-size: 0.75rem; display: block;">BEDROOMS</span><strong>${p.bedrooms} Beds</strong></div>` : ''}
        ${p.bathrooms !== null ? `<div><span style="color: var(--color-text-muted); font-size: 0.75rem; display: block;">BATHROOMS</span><strong>${p.bathrooms} Baths</strong></div>` : ''}
        <div><span style="color: var(--color-text-muted); font-size: 0.75rem; display: block;">PROPERTY TYPE</span><strong style="text-transform: capitalize;">${p.property_type}</strong></div>
      </div>

      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 8px;">Description</h4>
        <p style="color: var(--color-text-muted); line-height: 1.6; font-size: 0.95rem; white-space: pre-line;">${escapeHtml(p.description)}</p>
      </div>

      <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="user-avatar" style="width: 44px; height: 44px; font-size: 1.1rem;">
            ${(p.seller?.name || 'S')[0].toUpperCase()}
          </div>
          <div>
            <h4 style="font-size: 1rem; margin-bottom: 2px;">${escapeHtml(p.seller?.name || 'Verified Owner')}</h4>
            <div style="font-size: 0.8rem; color: var(--color-text-muted);">
              ${p.seller?.company_name ? escapeHtml(p.seller.company_name) + ' • ' : ''}
              <span style="color: var(--color-success); font-weight: 700;">✓ Verified Seller</span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          ${contactPhone ? `
            <a href="tel:${escapeHtml(contactPhone)}" class="btn btn-primary">
              📞 Call ${escapeHtml(contactPhone)}
            </a>
          ` : `
            <button class="btn btn-primary" onclick="showToast('Contact seller via EstateLink')">Contact Seller</button>
          `}
        </div>
      </div>

      <!-- Live Auction & Bidding Section Container -->
      <div id="property-auction-container" style="margin-top: 22px;">
        <div class="state-box" style="padding: 20px 0;">
          <div class="spinner"></div>
          <p style="font-size: 0.85rem; color: var(--color-text-muted);">Checking auction status...</p>
        </div>
      </div>
    `;

    // Load live auction stream & start real-time polling
    loadLiveAuctionForDetail(p.id, p);

  } catch (error) {
    console.error('Property detail error:', error);
  }
};

/* ==========================================================================
   SELL PROPERTY FORM WORKFLOW (POST /api/properties)
   ========================================================================== */
window.handlePropertyTypeChange = function () {
  const type = document.getElementById('prop-type')?.value;
  const bedsRow = document.getElementById('row-beds-baths');
  if (bedsRow) {
    if (type === 'land' || type === 'commercial') {
      bedsRow.style.display = 'none';
    } else {
      bedsRow.style.display = 'grid';
    }
  }
};

window.addSelectedImages = function (fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;

  const validFiles = files.filter(file => {
    if (!file.type.startsWith('image/')) {
      showToast(`File "${file.name}" is not a recognized image.`, 'error');
      return false;
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast(`Image "${file.name}" exceeds 20MB limit.`, 'error');
      return false;
    }
    return true;
  });

  if (validFiles.length > 0) {
    state.sellForm.selectedImages.push(...validFiles);
    renderImagePreviews();
  }
};

window.handleImageSelection = function (event) {
  if (event.target.files) {
    addSelectedImages(event.target.files);
  }
  event.target.value = '';
};

function renderImagePreviews() {
  const container = document.getElementById('image-previews-container');
  if (!container) return;

  container.innerHTML = '';

  // Render existing images if editing
  state.sellForm.existingImages.forEach((img, idx) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.innerHTML = `
      <img src="${img.url}" class="preview-img">
      <button type="button" class="preview-remove-btn" onclick="removeExistingImage(${img.id})">&times;</button>
      ${img.is_primary ? '<span class="preview-primary-badge">PRIMARY COVER</span>' : ''}
    `;
    container.appendChild(item);
  });

  // Render newly selected images
  state.sellForm.selectedImages.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    const objectUrl = URL.createObjectURL(file);

    const isPrimary = (state.sellForm.existingImages.length === 0 && idx === 0);

    item.innerHTML = `
      <img src="${objectUrl}" class="preview-img" alt="${escapeHtml(file.name)}">
      <button type="button" class="preview-remove-btn" onclick="removeSelectedImage(${idx})">&times;</button>
      ${isPrimary ? '<span class="preview-primary-badge">PRIMARY COVER</span>' : ''}
    `;
    container.appendChild(item);
  });
}

window.removeSelectedImage = function (index) {
  state.sellForm.selectedImages.splice(index, 1);
  renderImagePreviews();
};

window.removeExistingImage = async function (imageId) {
  if (!state.sellForm.editId) return;
  try {
    const response = await fetch(`/api/my-properties/${state.sellForm.editId}/images/${imageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });
    if (response.ok) {
      state.sellForm.existingImages = state.sellForm.existingImages.filter(img => img.id !== imageId);
      renderImagePreviews();
      showToast('Image removed.');
    }
  } catch (error) {
    showToast('Failed to remove image', 'error');
  }
};

window.handleDocFile = function (file, type) {
  if (!file) return;

  if (file.size > 20 * 1024 * 1024) {
    showToast(`Document "${file.name}" exceeds 20MB limit.`, 'error');
    return;
  }

  if (type === 'nid') {
    state.sellForm.nidFile = file;
    const nameEl = document.getElementById('nid-file-name');
    const statusBox = document.getElementById('nid-file-status');
    if (nameEl) nameEl.textContent = `🪪 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    if (statusBox) statusBox.style.display = 'flex';
  } else {
    state.sellForm.propFile = file;
    const nameEl = document.getElementById('prop-file-name');
    const statusBox = document.getElementById('prop-file-status');
    if (nameEl) nameEl.textContent = `📑 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    if (statusBox) statusBox.style.display = 'flex';
  }
};

window.handleDocSelection = function (event, type) {
  const file = event.target.files && event.target.files[0];
  if (file) {
    handleDocFile(file, type);
  }
};

window.clearDocSelection = function (type) {
  if (type === 'nid') {
    state.sellForm.nidFile = null;
    document.getElementById('input-nid-doc').value = '';
    document.getElementById('nid-file-status').style.display = 'none';
  } else {
    state.sellForm.propFile = null;
    document.getElementById('input-prop-doc').value = '';
    document.getElementById('prop-file-status').style.display = 'none';
  }
};

function resetSellForm() {
  state.sellForm = {
    selectedImages: [],
    existingImages: [],
    nidFile: null,
    propFile: null,
    editId: null
  };
  document.getElementById('form-sell-property')?.reset();
  document.getElementById('edit-property-id').value = '';
  document.getElementById('sell-form-main-title').textContent = 'List Your Property on EstateLink';
  document.getElementById('submit-property-btn').textContent = '🚀 Submit Property for Verification';
  document.getElementById('nid-file-status').style.display = 'none';
  document.getElementById('prop-file-status').style.display = 'none';

  // Auto-fill phone with user's registered phone
  const phoneInput = document.getElementById('prop-phone');
  if (phoneInput && state.user?.phone) {
    phoneInput.value = state.user.phone;
  }

  renderImagePreviews();
}

/* ==========================================================================
   SELLER MY PROPERTIES DASHBOARD (GET /api/my-properties)
   ========================================================================== */
window.loadMyProperties = async function () {
  const container = document.getElementById('my-properties-list-container');
  if (!container || !state.token) return;

  container.innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <p>Loading your listed properties...</p>
    </div>
  `;

  try {
    const response = await fetch('/api/my-properties', {
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to load listings');

    const data = await response.json();
    const properties = data.properties || [];
    const summary = data.summary || { total: 0, approved: 0, pending: 0, rejected: 0 };

    // Update Stats
    document.getElementById('stat-total').textContent = summary.total;
    document.getElementById('stat-approved').textContent = summary.approved;
    document.getElementById('stat-pending').textContent = summary.pending;
    document.getElementById('stat-rejected').textContent = summary.rejected;

    if (properties.length === 0) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🏠</div>
          <h3 style="font-size: 1.2rem; margin-bottom: 6px;">You haven't listed any properties yet</h3>
          <p style="margin-bottom: 16px;">Submit your first property for Admin verification to connect with verified buyers.</p>
          <button class="btn btn-primary btn-sm" onclick="navigateTo('/sell-property')">+ List Your Property</button>
        </div>
      `;
      return;
    }

    let html = '';
    properties.forEach(p => {
      const fallbackImage = '/images/hero_building.jpg';
      const imageUrl = p.main_image || fallbackImage;

      let statusBadge = '';
      if (p.verification_status === 'approved') {
        statusBadge = '<span class="status-chip chip-approved">✓ Live & Approved</span>';
      } else if (p.verification_status === 'pending') {
        statusBadge = '<span class="status-chip chip-pending">⏳ Pending Admin Verification</span>';
      } else if (p.verification_status === 'rejected') {
        statusBadge = '<span class="status-chip chip-rejected">❌ Verification Rejected</span>';
      }

      html += `
        <div class="my-property-card">
          <div>
            <img src="${imageUrl}" class="my-prop-img" onerror="this.src='${fallbackImage}'">
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
              ${statusBadge}
              <span class="status-chip chip-type">${escapeHtml(p.property_type)}</span>
              <span style="font-size: 0.8rem; color: var(--color-text-muted);">Deal Status: <strong>${escapeHtml(p.transaction_status || 'available')}</strong></span>
            </div>
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px;">${escapeHtml(p.title)}</h3>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--color-brand); margin-bottom: 4px;">
              ${formatCurrency(p.price)}
            </div>
            <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 8px;">
              📍 ${escapeHtml(p.location)} • ${p.size} sqft • Contact: <strong>${escapeHtml(p.phone || 'N/A')}</strong>
            </div>

            ${p.verification_status === 'rejected' && p.rejection_reason ? `
              <div class="rejection-banner">
                <strong>Admin Rejection Note:</strong> ${escapeHtml(p.rejection_reason)}
              </div>
            ` : ''}

            ${p.verification_status === 'pending' ? `
              <div style="font-size: 0.8rem; color: #d97706; margin-top: 6px;">
                ℹ️ Submitted on ${new Date(p.submitted_at || p.created_at).toLocaleDateString()}. Admin is reviewing your NID and documents.
              </div>
            ` : ''}
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; min-width: 140px;">
            ${p.verification_status === 'approved' ? `
              <button class="btn btn-secondary btn-sm w-full" onclick="openPropertyDetailModal(${p.id})">Public View</button>
              ${p.transaction_status !== 'sold' ? `
                <button class="btn btn-primary btn-sm w-full" onclick="openBiddingRequestModal(${p.id}, ${p.price})" style="background: linear-gradient(135deg, var(--color-brand), var(--color-admin)); color: #fff;">
                  🚀 Request Auction
                </button>
              ` : ''}
            ` : ''}

            ${p.verification_status === 'rejected' ? `
              <button class="btn btn-primary btn-sm w-full" onclick="editProperty(${p.id})">✏️ Edit & Resubmit</button>
              <button class="btn btn-secondary btn-sm w-full" onclick="resubmitProperty(${p.id})">Direct Resubmit</button>
            ` : `
              <button class="btn btn-secondary btn-sm w-full" onclick="editProperty(${p.id})">Edit Listing</button>
            `}

            <button class="btn btn-secondary btn-sm w-full" style="color: #ef4444;" onclick="deleteProperty(${p.id})">Delete</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

  } catch (error) {
    console.error('My properties load error:', error);
  }
};

window.editProperty = async function (id) {
  try {
    const response = await fetch(`/api/my-properties/${id}`, {
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch property');

    const data = await response.json();
    const p = data.property;

    state.sellForm.editId = p.id;
    state.sellForm.existingImages = p.images || [];
    state.sellForm.selectedImages = [];

    document.getElementById('edit-property-id').value = p.id;
    document.getElementById('prop-title').value = p.title;
    document.getElementById('prop-type').value = p.property_type;
    document.getElementById('prop-price').value = p.price;
    document.getElementById('prop-size').value = p.size;
    document.getElementById('prop-bedrooms').value = p.bedrooms ?? '';
    document.getElementById('prop-bathrooms').value = p.bathrooms ?? '';
    document.getElementById('prop-location').value = p.location;
    document.getElementById('prop-address').value = p.address;
    document.getElementById('prop-phone').value = p.phone || state.user?.phone || '';
    document.getElementById('prop-description').value = p.description;

    document.getElementById('sell-form-main-title').textContent = `Edit Listing: #${p.id} ${p.title}`;
    document.getElementById('submit-property-btn').textContent = '💾 Update & Submit for Verification';

    handlePropertyTypeChange();
    renderImagePreviews();
    navigateTo('/sell-property');

  } catch (error) {
    showToast('Unable to edit property', 'error');
  }
};

window.resubmitProperty = async function (id) {
  if (!confirm('Resubmit this property for Admin verification?')) return;
  try {
    const response = await fetch(`/api/my-properties/${id}/resubmit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    if (response.ok) {
      showToast(data.message || 'Property resubmitted for verification!', 'success');
      loadMyProperties();
    } else {
      showToast(data.message || 'Failed to resubmit', 'error');
    }
  } catch (error) {
    showToast('Failed to resubmit', 'error');
  }
};

window.deleteProperty = async function (id) {
  if (!confirm('Are you sure you want to delete this property listing? This action cannot be undone.')) return;

  try {
    const response = await fetch(`/api/my-properties/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      showToast('Property deleted successfully.');
      loadMyProperties();
    } else {
      showToast('Failed to delete property.', 'error');
    }
  } catch (error) {
    showToast('Unable to delete property.', 'error');
  }
};

/* ==========================================================================
   ADMIN VERIFICATION QUEUE & DOSSIER LOGIC
   ========================================================================== */
window.loadAdminPendingCount = async function () {
  if (!state.token || !state.user || state.user.role !== 'admin') return;

  try {
    const response = await fetch('/api/admin/properties/pending', {
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });
    if (response.ok) {
      const data = await response.json();
      const count = data.total || (data.data ? data.data.length : 0);
      const badge = document.getElementById('admin-pending-badge');
      const countSpan = document.getElementById('admin-pending-count');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
      }
      if (countSpan) countSpan.textContent = count;
    }
  } catch (error) {
    console.warn('Unable to load admin pending count:', error);
  }
};

window.loadAdminQueue = async function (tab = 'pending', page = 1) {
  state.adminQueueTab = tab;
  const container = document.getElementById('admin-queue-container');
  const pagination = document.getElementById('admin-pagination-container');
  const btnPending = document.getElementById('btn-admin-tab-pending');
  const btnBidding = document.getElementById('btn-admin-tab-bidding');
  const btnAll = document.getElementById('btn-admin-tab-all');

  if (!container || !state.token) return;

  btnPending?.classList.remove('btn-primary');
  btnPending?.classList.add('btn-secondary');
  btnBidding?.classList.remove('btn-primary');
  btnBidding?.classList.add('btn-secondary');
  btnAll?.classList.remove('btn-primary');
  btnAll?.classList.add('btn-secondary');

  if (tab === 'pending') {
    btnPending?.classList.remove('btn-secondary');
    btnPending?.classList.add('btn-primary');
  } else if (tab === 'bidding_requests') {
    btnBidding?.classList.remove('btn-secondary');
    btnBidding?.classList.add('btn-primary');
    return loadAdminBiddingRequests(page);
  } else {
    btnAll?.classList.remove('btn-secondary');
    btnAll?.classList.add('btn-primary');
  }

  container.innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <p>Loading verification queue...</p>
    </div>
  `;
  if (pagination) pagination.innerHTML = '';

  const endpoint = tab === 'pending'
    ? `/api/admin/properties/pending?page=${page}`
    : `/api/admin/properties/all?page=${page}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Admin queue fetch failed');

    const result = await response.json();
    const properties = result.data || [];

    loadAdminPendingCount();

    if (properties.length === 0) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🛡️</div>
          <h3>${tab === 'pending' ? 'Verification Queue is Clear!' : 'No Properties Found'}</h3>
          <p>${tab === 'pending' ? 'All submitted properties have been reviewed by administrators.' : 'No property records exist yet.'}</p>
        </div>
      `;
      return;
    }

    let html = '';
    properties.forEach(p => {
      const fallbackImage = '/images/hero_building.jpg';
      const mainImg = (p.images && p.images[0]) ? p.images[0].url || p.images[0].image_path : fallbackImage;

      let statusChip = '';
      if (p.verification_status === 'approved') statusChip = '<span class="status-chip chip-approved">Approved</span>';
      else if (p.verification_status === 'pending') statusChip = '<span class="status-chip chip-pending">⏳ Pending Review</span>';
      else statusChip = '<span class="status-chip chip-rejected">Rejected</span>';

      html += `
        <div class="admin-queue-card">
          <div>
            <img src="${mainImg}" style="width: 100%; height: 100px; object-fit: cover; border-radius: var(--radius-md);" onerror="this.src='${fallbackImage}'">
          </div>
          <div>
            <div style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center;">
              ${statusChip}
              <span class="status-chip chip-type">${escapeHtml(p.property_type)}</span>
              <strong style="color: var(--color-brand); font-size: 1.1rem;">${formatCurrency(p.price)}</strong>
            </div>
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 2px;">#${p.id} ${escapeHtml(p.title)}</h3>
            <div style="font-size: 0.825rem; color: var(--color-text-muted); margin-bottom: 6px;">
              📍 ${escapeHtml(p.location)} • ${p.size} sqft • Phone: <strong>${escapeHtml(p.phone || p.user?.phone || 'N/A')}</strong>
            </div>
            <div style="font-size: 0.8rem; background: var(--color-input); padding: 6px 10px; border-radius: var(--radius-sm); display: inline-block;">
              👤 Seller: <strong>${escapeHtml(p.user?.name || 'N/A')}</strong> • NID: <strong>${escapeHtml(p.user?.national_id || 'N/A')}</strong> • Email: <strong>${escapeHtml(p.user?.email || 'N/A')}</strong>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; min-width: 130px;">
            <button class="btn btn-admin btn-sm w-full" onclick="openAdminReviewModal(${p.id})">
              🔍 Audit & Verify
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    renderPagination(result, pagination, (p) => loadAdminQueue(tab, p));

  } catch (error) {
    console.error('Admin queue error:', error);
  }
};

window.openAdminReviewModal = async function (id) {
  const modal = document.getElementById('modal-admin-review');
  const body = document.getElementById('admin-review-body');
  if (!modal || !body) return;

  closeAllModals();
  modal.classList.add('active');
  body.innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <p>Loading complete verification dossier...</p>
    </div>
  `;

  try {
    const response = await fetch(`/api/admin/properties/${id}/verification`, {
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Verification dossier fetch failed');

    const data = await response.json();
    const p = data.property;
    const docs = data.documents || [];

    const fallbackImage = '/images/hero_building.jpg';

    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- Left: Seller Verification Info -->
        <div style="background: var(--color-input); padding: 16px; border-radius: var(--radius-md);">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--color-admin); margin-bottom: 10px;">👤 Seller Identity Dossier</h4>
          <div style="font-size: 0.85rem; display: flex; flex-direction: column; gap: 6px;">
            <div><strong>Full Name:</strong> ${escapeHtml(p.user?.name || 'N/A')}</div>
            <div><strong>Email:</strong> ${escapeHtml(p.user?.email || 'N/A')}</div>
            <div><strong>Registered Phone:</strong> ${escapeHtml(p.user?.phone || 'N/A')}</div>
            <div><strong>Listing Contact Phone:</strong> <span style="font-weight: 700; color: var(--color-brand);">${escapeHtml(p.phone || p.user?.phone || 'N/A')}</span></div>
            <div><strong>National ID (NID):</strong> <span style="background: rgba(99,102,241,0.15); padding: 2px 6px; border-radius: 4px; font-weight: 700;">${escapeHtml(p.user?.national_id || 'N/A')}</span></div>
            <div><strong>Company:</strong> ${escapeHtml(p.user?.company_name || 'Individual')}</div>
            <div><strong>Account Status:</strong> <span style="text-transform: capitalize; font-weight: 600;">${escapeHtml(p.user?.verification_status || 'pending')}</span></div>
          </div>
        </div>

        <!-- Right: Property Specs -->
        <div style="background: var(--color-input); padding: 16px; border-radius: var(--radius-md);">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--color-brand); margin-bottom: 10px;">🏢 Property Details</h4>
          <div style="font-size: 0.85rem; display: flex; flex-direction: column; gap: 6px;">
            <div><strong>Price:</strong> ${formatCurrency(p.price)}</div>
            <div><strong>Type:</strong> <span style="text-transform: capitalize;">${p.property_type}</span></div>
            <div><strong>Size:</strong> ${p.size} sqft</div>
            <div><strong>Location:</strong> ${escapeHtml(p.location)}</div>
            <div><strong>Address:</strong> ${escapeHtml(p.address)}</div>
            <div><strong>Submitted:</strong> ${new Date(p.submitted_at || p.created_at).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 6px;">Description</h4>
        <p style="font-size: 0.85rem; color: var(--color-text-muted); background: var(--color-input); padding: 12px; border-radius: var(--radius-md);">${escapeHtml(p.description)}</p>
      </div>

      <!-- Uploaded Verification Documents -->
      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px;">📑 Uploaded Verification Documents (Private)</h4>
        ${docs.length === 0 ? `
          <div style="padding: 12px; background: rgba(239,68,68,0.08); border-radius: var(--radius-md); font-size: 0.85rem; color: #ef4444;">
            ⚠️ No verification documents uploaded by seller!
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${docs.map((d, index) => {
              const token = state.token || localStorage.getItem('estatelink_token') || '';
              const viewUrl = `/api/admin/properties/${p.id}/documents/${d.id}/download?view=1&token=${encodeURIComponent(token)}`;
              const safeName = escapeHtml(d.original_name);
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); flex-wrap: wrap; gap: 8px;">
                  <div>
                    <span style="font-weight: 700; text-transform: uppercase; font-size: 0.75rem; background: var(--color-brand-soft); color: var(--color-brand); padding: 2px 8px; border-radius: 4px; margin-right: 6px;">
                      ${escapeHtml(d.document_type)}
                    </span>
                    <span style="font-size: 0.9rem; font-weight: 600;">${safeName}</span>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <a href="${viewUrl}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                      👁️ View Document
                    </a>
                    <button type="button" class="btn btn-primary btn-sm" onclick="downloadAdminDocument(${p.id}, ${d.id})" style="display: inline-flex; align-items: center; gap: 4px;">
                      📥 Download
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Photo Gallery (Shows ALL photos uploaded by seller) -->
      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px;">
          📸 All Uploaded Property Photos (${(p.images && p.images.length) || 0})
        </h4>
        ${!p.images || p.images.length === 0 ? `
          <p style="font-size: 0.85rem; color: var(--color-text-muted);">No property images uploaded.</p>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;">
            ${p.images.map((img, idx) => `
              <div style="position: relative; height: 110px; border-radius: var(--radius-md); overflow: hidden; border: 2px solid ${img.is_primary ? 'var(--color-brand)' : 'var(--color-border)'}; cursor: pointer;" onclick="window.open('${img.url}', '_blank')">
                <img src="${img.url}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='${fallbackImage}'">
                ${img.is_primary ? '<span style="position: absolute; bottom: 4px; left: 4px; background: var(--color-brand); color: #fff; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">COVER (1st)</span>' : ''}
                <span style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.65); color: #fff; font-size: 0.65rem; padding: 1px 6px; border-radius: 4px;">#${idx + 1}</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Admin Action Bar -->
      <div style="border-top: 1px solid var(--color-border); padding-top: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          Current Verification: <strong>${escapeHtml(p.verification_status).toUpperCase()}</strong>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-danger" onclick="openAdminRejectModal(${p.id})">
            ❌ Reject Listing
          </button>
          <button class="btn btn-success" onclick="adminApproveProperty(${p.id})">
            ✓ Approve & Publish Listing
          </button>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Admin review error:', error);
  }
};

/* Secure Admin Document Viewing / Downloading with Bearer Token & Fallback */
window.viewAdminDocument = function (propertyId, documentId) {
  const token = state.token || localStorage.getItem('estatelink_token') || '';
  const url = `/api/admin/properties/${propertyId}/documents/${documentId}/download?view=1&token=${encodeURIComponent(token)}`;
  window.open(url, '_blank');
};

window.downloadAdminDocument = async function (propertyId, documentId, optionalFilename) {
  try {
    showToast('Downloading document...', 'info');
    const token = state.token || localStorage.getItem('estatelink_token') || '';
    const downloadUrl = `/api/admin/properties/${propertyId}/documents/${documentId}/download?token=${encodeURIComponent(token)}`;

    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Download failed (HTTP ${response.status})`);
    }

    // Try to extract original filename from Content-Disposition header
    let filename = optionalFilename;
    const disposition = response.headers.get('content-disposition');
    if (!filename && disposition && disposition.indexOf('filename=') !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || `document_${documentId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    showToast('Document downloaded successfully!', 'success');
  } catch (err) {
    console.error('Download error:', err);
    showToast(err.message || 'Failed to download document.', 'error');
  }
};

window.adminApproveProperty = async function (id) {
  if (!confirm(`Are you sure you want to APPROVE property #${id}? It will become immediately visible on the public listing.`)) return;

  try {
    const response = await fetch(`/api/admin/properties/${id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    if (response.ok) {
      showToast(data.message || 'Property approved successfully!', 'success');
      closeAllModals();
      loadAdminQueue(state.adminQueueTab);
    } else {
      showToast(data.message || 'Approval failed', 'error');
    }
  } catch (error) {
    showToast('Unable to approve property', 'error');
  }
};

window.openAdminRejectModal = function (id) {
  closeAllModals();
  const modal = document.getElementById('modal-admin-reject');
  const idInput = document.getElementById('reject-property-id');
  const reasonInput = document.getElementById('reject-reason');
  if (modal && idInput) {
    idInput.value = id;
    if (reasonInput) reasonInput.value = '';
    modal.classList.add('active');
  }
};

/* ==========================================================================
   Helper Functions (Pagination, Modals, Formatters)
   ========================================================================== */
function renderPagination(paginatorData, container, handlerName) {
  if (!container || !paginatorData || paginatorData.last_page <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  const current = paginatorData.current_page;
  const last = paginatorData.last_page;

  let html = '';
  const handlerFn = typeof handlerName === 'string' ? handlerName : 'loadPublicProperties';

  html += `<button class="page-btn" ${current === 1 ? 'disabled' : ''} onclick="${handlerFn}(${current - 1})">‹ Prev</button>`;

  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || (i >= current - 1 && i <= current + 1)) {
      html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="${handlerFn}(${i})">${i}</button>`;
    } else if (i === current - 2 || i === current + 2) {
      html += `<span style="padding: 0 4px; color: var(--color-text-muted);">...</span>`;
    }
  }

  html += `<button class="page-btn" ${current === last ? 'disabled' : ''} onclick="${handlerFn}(${current + 1})">Next ›</button>`;
  container.innerHTML = html;
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return 'Tk 0';
  return 'Tk ' + Number(amount).toLocaleString('en-IN');
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  navigateTo('/profile');
};

window.closeAllModals = function () {
  if (state.auctionPollingInterval) {
    clearInterval(state.auctionPollingInterval);
    state.auctionPollingInterval = null;
  }
  if (state.auctionCountdownInterval) {
    clearInterval(state.auctionCountdownInterval);
    state.auctionCountdownInterval = null;
  }
  document.querySelectorAll('.modal-backdrop').forEach(modal => modal.classList.remove('active'));
};

/* ==========================================================================
   USER PROFILE PAGE & SUBMISSIONS MANAGEMENT (/profile)
   ========================================================================== */
window.loadProfilePage = async function () {
  if (!state.token || !state.user) {
    navigateTo('/');
    return;
  }

  // Refresh user data from API (/api/me)
  try {
    const res = await fetch('/api/me', {
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });
    if (res.ok) {
      const data = await res.json();
      state.user = data.user;
      localStorage.setItem('estatelink_user', JSON.stringify(data.user));
    }
  } catch (err) {
    console.warn('Could not sync user profile', err);
  }

  const user = state.user;
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  // Render Profile View Card
  const avatarEl = document.getElementById('profile-page-avatar');
  if (avatarEl) {
    avatarEl.textContent = initials;
    if (user.role === 'admin') {
      avatarEl.classList.add('avatar-admin');
    } else {
      avatarEl.classList.remove('avatar-admin');
    }
  }

  const nameEl = document.getElementById('profile-page-name');
  if (nameEl) nameEl.textContent = user.name || 'User';

  const emailEl = document.getElementById('profile-page-email');
  if (emailEl) emailEl.textContent = user.email || '';

  const badgeWrap = document.getElementById('profile-page-badge-wrap');
  if (badgeWrap) {
    if (user.role === 'admin') {
      badgeWrap.innerHTML = '<span class="status-chip chip-approved" style="background: rgba(99,102,241,0.15); color: #6366f1; border-color: rgba(99,102,241,0.3);">★ System Administrator</span>';
    } else if (user.verification_status === 'verified') {
      badgeWrap.innerHTML = '<span class="status-chip chip-approved">✓ Verified Buyer / Seller</span>';
    } else if (user.verification_status === 'rejected') {
      badgeWrap.innerHTML = '<span class="status-chip chip-rejected">❌ Verification Flagged</span>';
    } else {
      badgeWrap.innerHTML = '<span class="status-chip chip-pending">⏳ Pending NID Verification</span>';
    }
  }

  // Account Type Label
  const accountTypeLabel = user.role === 'admin'
    ? 'Administrator'
    : (user.company_name ? 'Real Estate Agency / Agent' : 'Buyer / Seller');

  const typeEl = document.getElementById('profile-page-type');
  if (typeEl) typeEl.textContent = accountTypeLabel;

  const nidEl = document.getElementById('profile-page-nid');
  if (nidEl) nidEl.textContent = user.national_id || 'N/A';

  const phoneEl = document.getElementById('profile-page-phone');
  if (phoneEl) phoneEl.textContent = user.phone || 'N/A';

  const companyEl = document.getElementById('profile-page-company');
  if (companyEl) companyEl.textContent = user.company_name || 'Individual';

  const fbEl = document.getElementById('profile-page-facebook');
  if (fbEl) {
    if (user.facebook_url) {
      fbEl.innerHTML = `<a href="${escapeHtml(user.facebook_url)}" target="_blank" rel="noopener" style="color: var(--color-brand); text-decoration: underline;">${escapeHtml(user.facebook_url)}</a>`;
    } else {
      fbEl.textContent = 'Not provided';
    }
  }

  const statusEl = document.getElementById('profile-page-status');
  if (statusEl) {
    if (user.role === 'admin') statusEl.textContent = 'Admin Pre-verified';
    else if (user.verification_status === 'verified') statusEl.textContent = 'Verified Identity';
    else if (user.verification_status === 'rejected') statusEl.textContent = 'Rejected / Needs Fix';
    else statusEl.textContent = 'Pending Admin Audit';
  }

  // Pre-fill Edit Form Inputs
  const editName = document.getElementById('edit-profile-name');
  if (editName) editName.value = user.name || '';

  const editNid = document.getElementById('edit-profile-nid');
  if (editNid) editNid.value = user.national_id || '';

  const editPhone = document.getElementById('edit-profile-phone');
  if (editPhone) editPhone.value = user.phone || '';

  const editCompany = document.getElementById('edit-profile-company');
  if (editCompany) editCompany.value = user.company_name || '';

  const editFb = document.getElementById('edit-profile-facebook');
  if (editFb) editFb.value = user.facebook_url || '';

  const accountTypeSelect = document.getElementById('edit-profile-account-type');
  if (accountTypeSelect) {
    if (user.company_name) {
      accountTypeSelect.value = 'Real Estate Agent / Realtor';
    } else {
      accountTypeSelect.value = 'Buyer / Seller';
    }
  }

  // Ensure View Mode is visible initially
  toggleProfileEdit(false);

  // If user is Admin, setup Admin Command Center & Queue Hub
  if (user.role === 'admin') {
    setupAdminProfileHub();
  } else {
    setupStandardProfileHub();
    await loadProfileSubmissions();
  }
};

function setupStandardProfileHub() {
  const titleEl = document.getElementById('prof-col-title');
  const subEl = document.getElementById('prof-col-subtitle');
  const actionsEl = document.getElementById('prof-header-actions');
  const statsWrap = document.getElementById('prof-stats-grid');
  const tabsWrap = document.getElementById('prof-tabs-wrap');
  const paginEl = document.getElementById('profile-pagination-container');

  if (titleEl) titleEl.textContent = 'My Property Posts & Verification Status';
  if (subEl) subEl.textContent = 'Monitor admin acceptance, audit feedback, and rejection notes in real-time.';
  if (actionsEl) {
    actionsEl.innerHTML = `
      <button class="btn btn-primary btn-sm" onclick="navigateTo('/sell-property')">
        + List New Property
      </button>
    `;
  }
  if (paginEl) paginEl.innerHTML = '';

  if (statsWrap) {
    statsWrap.innerHTML = `
      <div class="profile-stat-box" onclick="filterProfileProperties('all')" style="cursor: pointer;">
        <div class="profile-stat-val" id="prof-stat-total" style="color: var(--color-brand);">0</div>
        <div class="profile-stat-lbl">Total Posts</div>
      </div>
      <div class="profile-stat-box stat-approved" onclick="filterProfileProperties('approved')" style="cursor: pointer;">
        <div class="profile-stat-val" id="prof-stat-approved" style="color: var(--color-success);">0</div>
        <div class="profile-stat-lbl">✓ Approved</div>
      </div>
      <div class="profile-stat-box stat-pending" onclick="filterProfileProperties('pending')" style="cursor: pointer;">
        <div class="profile-stat-val" id="prof-stat-pending" style="color: var(--color-warning);">0</div>
        <div class="profile-stat-lbl">⏳ Pending Review</div>
      </div>
      <div class="profile-stat-box stat-rejected" onclick="filterProfileProperties('rejected')" style="cursor: pointer;">
        <div class="profile-stat-val" id="prof-stat-rejected" style="color: var(--color-danger);">0</div>
        <div class="profile-stat-lbl">❌ Rejected</div>
      </div>
    `;
  }

  if (tabsWrap) {
    tabsWrap.innerHTML = `
      <button class="sub-tab-btn active" id="prof-tab-all" onclick="filterProfileProperties('all')">All Posts (<span id="count-prof-all">0</span>)</button>
      <button class="sub-tab-btn" id="prof-tab-approved" onclick="filterProfileProperties('approved')">✓ Approved (<span id="count-prof-approved">0</span>)</button>
      <button class="sub-tab-btn" id="prof-tab-pending" onclick="filterProfileProperties('pending')">⏳ Pending Review (<span id="count-prof-pending">0</span>)</button>
      <button class="sub-tab-btn" id="prof-tab-rejected" onclick="filterProfileProperties('rejected')">❌ Rejected / Needs Fix (<span id="count-prof-rejected">0</span>)</button>
    `;
  }
}

async function setupAdminProfileHub() {
  const titleEl = document.getElementById('prof-col-title');
  const subEl = document.getElementById('prof-col-subtitle');
  const actionsEl = document.getElementById('prof-header-actions');
  const statsWrap = document.getElementById('prof-stats-grid');
  const tabsWrap = document.getElementById('prof-tabs-wrap');

  if (titleEl) titleEl.textContent = '🛡️ Administrator Auditing & Auction Hub';
  if (subEl) subEl.textContent = 'Review pending property submissions, verify seller deeds, and approve live bidding requests directly from your admin profile.';
  if (actionsEl) {
    actionsEl.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="navigateTo('/admin/properties')">
        🏛️ Dedicated Admin Workspace
      </button>
      <button class="btn btn-primary btn-sm" onclick="navigateTo('/sell-property')">
        + List Property
      </button>
    `;
  }

  if (statsWrap) {
    statsWrap.innerHTML = `
      <div class="profile-stat-box stat-pending" onclick="loadProfileAdminTab('pending')" style="cursor: pointer;">
        <div class="profile-stat-val" id="prof-adm-stat-pending" style="color: var(--color-warning);">0</div>
        <div class="profile-stat-lbl">⏳ Pending Properties</div>
      </div>
      <div class="profile-stat-box" onclick="loadProfileAdminTab('bidding_requests')" style="cursor: pointer; border-left: 3px solid #6366f1;">
        <div class="profile-stat-val" id="prof-adm-stat-bidding" style="color: #6366f1;">0</div>
        <div class="profile-stat-lbl">🏛️ Bidding Requests</div>
      </div>
      <div class="profile-stat-box stat-approved" onclick="loadProfileAdminTab('all')" style="cursor: pointer;">
        <div class="profile-stat-val" id="prof-adm-stat-all" style="color: var(--color-success);">0</div>
        <div class="profile-stat-lbl">📋 All System Listings</div>
      </div>
      <div class="profile-stat-box" onclick="loadProfileAdminTab('my_properties')" style="cursor: pointer;">
        <div class="profile-stat-val" id="prof-adm-stat-my" style="color: var(--color-brand);">0</div>
        <div class="profile-stat-lbl">📁 My Own Posts</div>
      </div>
    `;
  }

  if (tabsWrap) {
    tabsWrap.innerHTML = `
      <button class="sub-tab-btn active" id="prof-adm-tab-pending" onclick="loadProfileAdminTab('pending')">⏳ Pending Properties (<span id="prof-adm-cnt-pending">0</span>)</button>
      <button class="sub-tab-btn" id="prof-adm-tab-bidding" onclick="loadProfileAdminTab('bidding_requests')">🏛️ Bidding Requests (<span id="prof-adm-cnt-bidding">0</span>)</button>
      <button class="sub-tab-btn" id="prof-adm-tab-all" onclick="loadProfileAdminTab('all')">📋 All Properties</button>
      <button class="sub-tab-btn" id="prof-adm-tab-my" onclick="loadProfileAdminTab('my_properties')">📁 My Personal Posts</button>
    `;
  }

  // Load Admin Counters asynchronously
  loadAdminProfileCounters();

  // Load default tab
  const currentTab = state.profileAdminTab || 'pending';
  await loadProfileAdminTab(currentTab, 1);
}

async function loadAdminProfileCounters() {
  if (!state.token) return;
  try {
    const [pendingRes, biddingRes, allRes, myRes] = await Promise.all([
      fetch('/api/admin/properties/pending', { headers: { 'Authorization': `Bearer ${state.token}`, 'Accept': 'application/json' } }),
      fetch('/api/admin/bidding-requests', { headers: { 'Authorization': `Bearer ${state.token}`, 'Accept': 'application/json' } }),
      fetch('/api/admin/properties/all', { headers: { 'Authorization': `Bearer ${state.token}`, 'Accept': 'application/json' } }),
      fetch('/api/my-properties', { headers: { 'Authorization': `Bearer ${state.token}`, 'Accept': 'application/json' } })
    ]);

    if (pendingRes.ok) {
      const pData = await pendingRes.json();
      const pCount = pData.total || (pData.data ? pData.data.length : 0);
      const statEl = document.getElementById('prof-adm-stat-pending');
      const cntEl = document.getElementById('prof-adm-cnt-pending');
      if (statEl) statEl.textContent = pCount;
      if (cntEl) cntEl.textContent = pCount;
    }

    if (biddingRes.ok) {
      const bData = await biddingRes.json();
      const bRequests = bData.data || [];
      const bCount = bRequests.filter(r => r.status === 'pending').length;
      const statEl = document.getElementById('prof-adm-stat-bidding');
      const cntEl = document.getElementById('prof-adm-cnt-bidding');
      if (statEl) statEl.textContent = bCount;
      if (cntEl) cntEl.textContent = bCount;
    }

    if (allRes.ok) {
      const aData = await allRes.json();
      const aCount = aData.total || (aData.data ? aData.data.length : 0);
      const statEl = document.getElementById('prof-adm-stat-all');
      if (statEl) statEl.textContent = aCount;
    }

    if (myRes.ok) {
      const mData = await myRes.json();
      const mCount = (mData.properties || []).length;
      const statEl = document.getElementById('prof-adm-stat-my');
      if (statEl) statEl.textContent = mCount;
    }
  } catch (err) {
    console.warn('Failed to sync admin profile counters:', err);
  }
}

window.loadProfileAdminTab = async function (tab = 'pending', page = 1) {
  state.profileAdminTab = tab;
  const container = document.getElementById('profile-properties-container');
  const pagination = document.getElementById('profile-pagination-container');
  if (!container || !state.token) return;

  // Active tab styling
  document.querySelectorAll('#prof-tabs-wrap .sub-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`prof-adm-tab-${tab === 'bidding_requests' ? 'bidding' : (tab === 'my_properties' ? 'my' : tab)}`)?.classList.add('active');

  if (pagination) pagination.innerHTML = '';

  if (tab === 'my_properties') {
    return loadProfileSubmissions();
  }

  container.innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <p>Loading admin queue (${tab.replace('_', ' ')})...</p>
    </div>
  `;

  if (tab === 'bidding_requests') {
    try {
      const res = await fetch(`/api/admin/bidding-requests?page=${page}`, {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });

      if (!res.ok) throw new Error('Failed to load bidding requests');

      const result = await res.json();
      const requests = result.data || [];

      if (requests.length === 0) {
        container.innerHTML = `
          <div class="state-box">
            <div class="state-icon">🏛️</div>
            <h3>No Bidding Requests</h3>
            <p>There are no live auction requests pending review.</p>
          </div>
        `;
        return;
      }

      let html = '';
      requests.forEach(r => {
        const p = r.property || {};
        const seller = r.user || {};
        const fallbackImage = '/images/hero_building.jpg';
        const mainImg = (p.primary_image && p.primary_image.image_path) ? p.primary_image.image_path : fallbackImage;

        let statusBadge = '';
        if (r.status === 'pending') statusBadge = '<span class="status-chip chip-pending">⏳ Pending Review</span>';
        else if (r.status === 'approved') statusBadge = '<span class="status-chip chip-approved">✓ Approved & Live</span>';
        else statusBadge = '<span class="status-chip chip-rejected">❌ Rejected</span>';

        html += `
          <div class="admin-queue-card" style="border-left: 4px solid ${r.status === 'pending' ? 'var(--color-warning)' : (r.status === 'approved' ? 'var(--color-success)' : 'var(--color-danger)')}; margin-bottom: 14px;">
            <div>
              <img src="${mainImg}" style="width: 100%; height: 110px; object-fit: cover; border-radius: var(--radius-md);" onerror="this.src='${fallbackImage}'">
            </div>
            <div>
              <div style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center; flex-wrap: wrap;">
                ${statusBadge}
                <span class="status-chip chip-type">Duration: ${r.duration_hours}h</span>
                <strong style="color: var(--color-brand); font-size: 1.1rem;">Opening: ${formatCurrency(r.start_price)}</strong>
                <span style="font-size: 0.8rem; color: var(--color-text-muted);">(Min Inc: +${formatCurrency(r.min_increment)})</span>
              </div>

              <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px;">Property #${p.id || 'N/A'}: ${escapeHtml(p.title || 'Untitled')}</h3>
              <div style="font-size: 0.825rem; color: var(--color-text-muted); margin-bottom: 6px;">
                📍 ${escapeHtml(p.location || 'N/A')} • Requested: ${new Date(r.requested_at || r.created_at).toLocaleString()}
              </div>

              <div style="font-size: 0.825rem; background: var(--color-input); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 6px;">
                👤 Seller: <strong>${escapeHtml(seller.name || 'N/A')}</strong> • NID: <strong>${escapeHtml(seller.national_id || 'N/A')}</strong> • Phone: <strong>${escapeHtml(seller.phone || 'N/A')}</strong>
              </div>

              ${r.admin_note ? `
                <div style="font-size: 0.8rem; color: var(--color-text-muted); background: rgba(0,0,0,0.03); padding: 6px 10px; border-radius: 4px;">
                  <strong>Admin Note:</strong> ${escapeHtml(r.admin_note)}
                </div>
              ` : ''}
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; min-width: 140px;">
              <button class="btn btn-secondary btn-sm w-full" onclick="openPropertyDetailModal(${p.id})">
                👁️ View Listing
              </button>

              ${r.status === 'pending' ? `
                <button class="btn btn-success btn-sm w-full" onclick="adminApproveBidding(${r.id})">
                  ✓ Approve & Start
                </button>
                <button class="btn btn-danger btn-sm w-full" onclick="openAdminBiddingRejectModal(${r.id})">
                  ❌ Reject Request
                </button>
              ` : ''}
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
      renderPagination(result, pagination, (p) => loadProfileAdminTab('bidding_requests', p));
    } catch (err) {
      console.error('Admin profile bidding error:', err);
      container.innerHTML = `
        <div class="state-box">
          <p style="color: var(--color-danger);">Failed to load bidding requests.</p>
          <button class="btn btn-secondary btn-sm" onclick="loadProfileAdminTab('bidding_requests')">Retry</button>
        </div>
      `;
    }
    return;
  }

  // Properties pending or all
  const endpoint = tab === 'pending'
    ? `/api/admin/properties/pending?page=${page}`
    : `/api/admin/properties/all?page=${page}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Admin queue fetch failed');

    const result = await response.json();
    const properties = result.data || [];

    if (properties.length === 0) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🛡️</div>
          <h3>${tab === 'pending' ? 'Verification Queue is Clear!' : 'No Properties Found'}</h3>
          <p>${tab === 'pending' ? 'All submitted properties have been reviewed by administrators.' : 'No property records exist.'}</p>
        </div>
      `;
      return;
    }

    let html = '';
    properties.forEach(p => {
      const fallbackImage = '/images/hero_building.jpg';
      const mainImg = (p.images && p.images[0]) ? p.images[0].url || p.images[0].image_path : fallbackImage;
      const owner = p.user || {};

      let statusBadge = '';
      if (p.verification_status === 'pending') statusBadge = '<span class="status-chip chip-pending">⏳ Pending Audit</span>';
      else if (p.verification_status === 'approved') statusBadge = '<span class="status-chip chip-approved">✓ Approved</span>';
      else statusBadge = '<span class="status-chip chip-rejected">❌ Rejected</span>';

      html += `
        <div class="admin-queue-card" style="border-left: 4px solid ${p.verification_status === 'pending' ? 'var(--color-warning)' : (p.verification_status === 'approved' ? 'var(--color-success)' : 'var(--color-danger)')}; margin-bottom: 14px;">
          <div>
            <img src="${mainImg}" style="width: 100%; height: 110px; object-fit: cover; border-radius: var(--radius-md);" onerror="this.src='${fallbackImage}'">
          </div>
          <div>
            <div style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center; flex-wrap: wrap;">
              ${statusBadge}
              <span class="status-chip chip-type">${escapeHtml(p.property_type)}</span>
              <strong style="color: var(--color-brand); font-size: 1.1rem;">${formatCurrency(p.price)}</strong>
            </div>

            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px;">#${p.id}: ${escapeHtml(p.title)}</h3>
            <div style="font-size: 0.825rem; color: var(--color-text-muted); margin-bottom: 6px;">
              📍 ${escapeHtml(p.location)} • Submitted: ${new Date(p.submitted_at || p.created_at).toLocaleDateString()}
            </div>

            <div style="font-size: 0.825rem; background: var(--color-input); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 6px;">
              👤 Seller: <strong>${escapeHtml(owner.name || 'N/A')}</strong> • NID: <strong>${escapeHtml(owner.national_id || 'N/A')}</strong> • Phone: <strong>${escapeHtml(owner.phone || 'N/A')}</strong>
            </div>

            ${p.admin_feedback ? `
              <div style="font-size: 0.8rem; color: var(--color-text-muted); background: rgba(0,0,0,0.03); padding: 6px 10px; border-radius: 4px;">
                <strong>Admin Feedback:</strong> ${escapeHtml(p.admin_feedback)}
              </div>
            ` : ''}
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; min-width: 140px;">
            <button class="btn btn-secondary btn-sm w-full" onclick="openAdminVerificationModal(${p.id})">
              🔍 Audit & Verify Deeds
            </button>

            ${p.verification_status === 'pending' ? `
              <button class="btn btn-success btn-sm w-full" onclick="adminApproveProperty(${p.id})">
                ✓ Approve
              </button>
              <button class="btn btn-danger btn-sm w-full" onclick="openAdminRejectModal(${p.id})">
                ❌ Reject
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    renderPagination(result, pagination, (p) => loadProfileAdminTab(tab, p));
  } catch (err) {
    console.error('Admin profile properties error:', err);
    container.innerHTML = `
      <div class="state-box">
        <p style="color: var(--color-danger);">Failed to load properties.</p>
        <button class="btn btn-secondary btn-sm" onclick="loadProfileAdminTab('${tab}')">Retry</button>
      </div>
    `;
  }
};

window.toggleProfileEdit = function (isEditing) {
  const viewCard = document.getElementById('profile-view-card');
  const editCard = document.getElementById('profile-edit-card');
  if (viewCard && editCard) {
    if (isEditing) {
      viewCard.style.display = 'none';
      editCard.style.display = 'block';
    } else {
      viewCard.style.display = 'block';
      editCard.style.display = 'none';
    }
  }
};

window.handleProfileUpdate = async function (event) {
  event.preventDefault();
  const saveBtn = document.getElementById('btn-save-profile');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }

  const name = document.getElementById('edit-profile-name').value.trim();
  const national_id = document.getElementById('edit-profile-nid').value.trim();
  const phone = document.getElementById('edit-profile-phone').value.trim();
  const company_name = document.getElementById('edit-profile-company').value.trim();
  const facebook_url = document.getElementById('edit-profile-facebook').value.trim();

  try {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name,
        national_id,
        phone,
        company_name: company_name || null,
        facebook_url: facebook_url || null
      })
    });

    const data = await response.json();

    if (response.ok) {
      state.user = data.user;
      localStorage.setItem('estatelink_user', JSON.stringify(data.user));
      showToast('Profile updated successfully!', 'success');
      initAuthSession();
      loadProfilePage();
    } else {
      const errorMsg = data.errors 
        ? Object.values(data.errors).flat().join(' ') 
        : (data.message || 'Failed to update profile.');
      showToast(errorMsg, 'error');
    }
  } catch (error) {
    showToast('Network error while updating profile.', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Save Changes';
    }
  }
};

window.loadProfileSubmissions = async function () {
  const container = document.getElementById('profile-properties-container');
  if (!container || !state.token) return;

  container.innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <p>Loading your property submissions...</p>
    </div>
  `;

  try {
    const response = await fetch('/api/my-properties', {
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Could not load properties');

    const data = await response.json();
    state.profileProperties = data.properties || [];
    const summary = data.summary || { total: 0, approved: 0, pending: 0, rejected: 0 };

    // Update Counters
    const totalEl = document.getElementById('prof-stat-total');
    if (totalEl) totalEl.textContent = summary.total;
    const appEl = document.getElementById('prof-stat-approved');
    if (appEl) appEl.textContent = summary.approved;
    const penEl = document.getElementById('prof-stat-pending');
    if (penEl) penEl.textContent = summary.pending;
    const rejEl = document.getElementById('prof-stat-rejected');
    if (rejEl) rejEl.textContent = summary.rejected;

    const countAll = document.getElementById('count-prof-all');
    if (countAll) countAll.textContent = summary.total;
    const countApp = document.getElementById('count-prof-approved');
    if (countApp) countApp.textContent = summary.approved;
    const countPen = document.getElementById('count-prof-pending');
    if (countPen) countPen.textContent = summary.pending;
    const countRej = document.getElementById('count-prof-rejected');
    if (countRej) countRej.textContent = summary.rejected;

    renderProfileSubmissionsList();
  } catch (error) {
    container.innerHTML = `
      <div class="state-box">
        <p style="color: var(--color-danger);">Failed to load your submissions.</p>
        <button class="btn btn-secondary btn-sm" onclick="loadProfileSubmissions()">Retry</button>
      </div>
    `;
  }
};

window.filterProfileProperties = function (filter) {
  state.profileSubmissionsTab = filter;
  document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`prof-tab-${filter}`)?.classList.add('active');
  renderProfileSubmissionsList();
};

function renderProfileSubmissionsList() {
  const container = document.getElementById('profile-properties-container');
  if (!container) return;

  let list = state.profileProperties || [];
  const filter = state.profileSubmissionsTab || 'all';

  if (filter !== 'all') {
    list = list.filter(p => p.verification_status === filter);
  }

  if (list.length === 0) {
    let emptyMsg = 'No property submissions found in this category.';
    if (filter === 'approved') emptyMsg = 'No approved properties yet.';
    else if (filter === 'pending') emptyMsg = 'No properties currently awaiting verification.';
    else if (filter === 'rejected') emptyMsg = 'No rejected properties. All clear!';

    container.innerHTML = `
      <div class="state-box">
        <div class="state-icon">🏡</div>
        <h4 style="font-size: 1.1rem; margin-bottom: 6px;">${emptyMsg}</h4>
        <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 14px;">
          Submit your property with NID and Deed documents for immediate Admin review.
        </p>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('/sell-property')">+ List New Property</button>
      </div>
    `;
    return;
  }

  const fallbackImage = '/images/hero_building.jpg';

  let html = '';
  list.forEach(p => {
    const imageUrl = p.main_image || fallbackImage;
    const submittedDate = p.submitted_at || p.created_at ? new Date(p.submitted_at || p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently';
    const reviewedDate = p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;

    let statusChip = '';
    let statusCallout = '';

    if (p.verification_status === 'approved') {
      statusChip = '<span class="status-chip chip-approved">✓ Approved & Live</span>';
      statusCallout = `
        <div class="admin-status-banner banner-approved">
          <div>
            <strong>✓ Verification Approved:</strong> Listing verified by EstateLink Admin${reviewedDate ? ` on ${reviewedDate}` : ''}. It is live and visible to buyers.
          </div>
          ${p.transaction_status !== 'sold' ? `
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(16, 185, 129, 0.3); font-size: 0.825rem; color: var(--color-brand); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
              <span>🚀 <strong>Eligible for Live Auction:</strong> Open competitive bidding on this verified listing to maximize buyer offers.</span>
            </div>
          ` : ''}
        </div>
      `;
    } else if (p.verification_status === 'pending') {
      statusChip = '<span class="status-chip chip-pending">⏳ Pending Admin Audit</span>';
      statusCallout = `
        <div class="admin-status-banner banner-pending">
          <div>
            <strong>⏳ Verification in Progress:</strong> Submitted on ${submittedDate}. EstateLink Admins are auditing your National ID & ownership deed documents.
          </div>
        </div>
      `;
    } else if (p.verification_status === 'rejected') {
      statusChip = '<span class="status-chip chip-rejected">❌ Rejected by Admin</span>';
      statusCallout = `
        <div class="admin-status-banner banner-rejected">
          <div style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
            <span>❌ Submission Rejected by Admin</span>
          </div>
          <div class="admin-rejection-content">
            <strong>📩 Message / Reason from Admin:</strong><br>
            ${escapeHtml(p.rejection_reason || 'Verification documents were unreadable or information requires correction.')}
          </div>
          <div style="font-size: 0.8rem; margin-top: 6px;">
            💡 <em>Click <strong>"✏️ Edit & Resubmit"</strong> below to update your photos, documents, or details according to the Admin note.</em>
          </div>
        </div>
      `;
    }

    html += `
      <div class="profile-prop-card">
        <div>
          <img src="${imageUrl}" class="profile-prop-img" onerror="this.src='${fallbackImage}'" alt="${escapeHtml(p.title)}">
        </div>
        
        <div class="profile-prop-body">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            ${statusChip}
            <span class="status-chip chip-type">${escapeHtml(p.property_type)}</span>
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">Deal: <strong>${escapeHtml((p.transaction_status || 'available').replace(/_/g, ' '))}</strong></span>
          </div>

          <h3 class="profile-prop-title">${escapeHtml(p.title)}</h3>
          <div class="profile-prop-price">${formatCurrency(p.price)}</div>

          <div class="profile-prop-meta">
            📍 ${escapeHtml(p.location)} • 📐 ${p.size} Sq.Ft ${p.bedrooms ? `• 🛏️ ${p.bedrooms} Beds` : ''} • 📞 ${escapeHtml(p.phone || 'N/A')}
          </div>

          ${statusCallout}
        </div>

        <div class="profile-prop-actions">
          ${p.verification_status === 'approved' ? `
            <button class="btn btn-secondary btn-sm w-full" onclick="openPropertyDetailModal(${p.id})">🔍 Public View</button>
            ${p.transaction_status !== 'sold' ? `
              <button class="btn btn-primary btn-sm w-full" onclick="openBiddingRequestModal(${p.id}, ${p.price})" style="background: linear-gradient(135deg, var(--color-brand), var(--color-admin)); color: #fff; font-weight: 700; box-shadow: var(--shadow-subtle);">
                🚀 Request Live Auction
              </button>
            ` : ''}
          ` : ''}

          ${p.verification_status === 'rejected' ? `
            <button class="btn btn-primary btn-sm w-full" onclick="editProperty(${p.id})">✏️ Edit & Resubmit</button>
          ` : `
            <button class="btn btn-secondary btn-sm w-full" onclick="editProperty(${p.id})">✏️ Edit Listing</button>
          `}

          <button class="btn btn-secondary btn-sm w-full" style="color: var(--color-danger);" onclick="deleteProperty(${p.id})">🗑️ Delete</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function setupDropzones() {
  // Photos dropzone
  const imgZone = document.getElementById('images-dropzone');
  if (imgZone) {
    ['dragenter', 'dragover'].forEach(name => {
      imgZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        imgZone.style.borderColor = 'var(--color-brand)';
        imgZone.style.backgroundColor = 'rgba(99, 102, 241, 0.08)';
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      imgZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        imgZone.style.borderColor = '';
        imgZone.style.backgroundColor = '';
      });
    });

    imgZone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files) {
        addSelectedImages(e.dataTransfer.files);
      }
    });
  }

  // NID document dropzone
  const nidZone = document.getElementById('nid-dropzone');
  if (nidZone) {
    ['dragenter', 'dragover'].forEach(name => {
      nidZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        nidZone.style.borderColor = 'var(--color-brand)';
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      nidZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        nidZone.style.borderColor = '';
      });
    });

    nidZone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleDocFile(e.dataTransfer.files[0], 'nid');
      }
    });
  }

  // Ownership document dropzone
  const propZone = document.getElementById('prop-doc-dropzone');
  if (propZone) {
    ['dragenter', 'dragover'].forEach(name => {
      propZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        propZone.style.borderColor = 'var(--color-brand)';
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      propZone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        propZone.style.borderColor = '';
      });
    });

    propZone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleDocFile(e.dataTransfer.files[0], 'prop');
      }
    });
  }
}

/* ==========================================================================
   Event Bindings & Form Handlers
   ========================================================================== */
function bindEventHandlers() {
  // Initialize drag & drop zones
  setupDropzones();

  // Theme toggle button
  document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

  // Profile Edit Form Submission
  document.getElementById('form-edit-profile')?.addEventListener('submit', handleProfileUpdate);

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

  // Search input enter key
  document.getElementById('filter-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      loadPublicProperties(1);
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

          showToast(`Welcome back, ${data.user.name}!`);
          initAuthSession();
          closeAllModals();
          loginForm.reset();

          if (state.currentRoute === '/sell-property') {
            handleRoute('/sell-property');
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

          showToast('Account registered successfully!');
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
        showToast('Unable to connect to the server.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Buyer / Seller Account';
      }
    });
  }

  // Sell Property Form Submission
  const sellForm = document.getElementById('form-sell-property');
  if (sellForm) {
    sellForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!state.token) {
        showToast('Please sign in before submitting.', 'error');
        openAuthModal('login', 'user');
        return;
      }

      const editId = document.getElementById('edit-property-id').value;
      const title = document.getElementById('prop-title').value.trim();
      const property_type = document.getElementById('prop-type').value;
      const price = document.getElementById('prop-price').value;
      const size = document.getElementById('prop-size').value;
      const bedrooms = document.getElementById('prop-bedrooms').value;
      const bathrooms = document.getElementById('prop-bathrooms').value;
      const location = document.getElementById('prop-location').value.trim();
      const address = document.getElementById('prop-address').value.trim();
      const phone = document.getElementById('prop-phone').value.trim();
      const description = document.getElementById('prop-description').value.trim();
      const submitBtn = document.getElementById('submit-property-btn');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Uploading details & documents...';

      const formData = new FormData();
      formData.append('title', title);
      formData.append('property_type', property_type);
      formData.append('price', price);
      formData.append('size', size);
      if (bedrooms) formData.append('bedrooms', bedrooms);
      if (bathrooms) formData.append('bathrooms', bathrooms);
      formData.append('location', location);
      formData.append('address', address);
      if (phone) formData.append('phone', phone);
      formData.append('description', description);

      // Append image files
      state.sellForm.selectedImages.forEach(file => {
        formData.append('images[]', file);
      });

      // Append documents
      if (state.sellForm.nidFile) {
        formData.append('nid_document', state.sellForm.nidFile);
      }
      if (state.sellForm.propFile) {
        formData.append('property_document', state.sellForm.propFile);
      }

      const url = editId ? `/api/my-properties/${editId}` : '/api/properties';

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Accept': 'application/json'
          },
          body: formData
        });

        if (response.status === 401) {
          logout(false);
          openAuthModal('login', 'user');
          showToast('Your session has expired. Please sign in again.', 'error');
          return;
        }

        const data = await response.json();

        if (response.ok) {
          showToast(data.message || 'Your property has been submitted and is waiting for Admin verification.', 'success');
          resetSellForm();
          navigateTo('/my-properties');
        } else {
          const errorMessage = data.errors
            ? Object.values(data.errors).flat().join(', ')
            : (data.message || 'Submission failed. Please check form inputs.');
          showToast(errorMessage, 'error');
        }
      } catch (error) {
        console.error('Submission error:', error);
        showToast('Error during submission. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = editId ? '💾 Update & Submit for Verification' : '🚀 Submit Property for Verification';
      }
    });
  }

  // Admin Rejection Form Submission
  const adminRejectForm = document.getElementById('form-admin-reject');
  if (adminRejectForm) {
    adminRejectForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const id = document.getElementById('reject-property-id').value;
      const rejection_reason = document.getElementById('reject-reason').value.trim();

      if (!id || !rejection_reason) return;

      try {
        const response = await fetch(`/api/admin/properties/${id}/reject`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ rejection_reason })
        });

        const data = await response.json();
        if (response.ok) {
          showToast('Property rejected and seller notified with reason.');
          closeAllModals();
          loadAdminQueue(state.adminQueueTab);
        } else {
          showToast(data.message || 'Rejection failed', 'error');
        }
      } catch (error) {
        showToast('Error rejecting property', 'error');
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
  navigateTo('/');
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
  toastItem.className = `toast-message ${type}`;
  toastItem.textContent = message;
  toastContainer.appendChild(toastItem);

  setTimeout(() => {
    toastItem.style.opacity = '0';
    toastItem.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toastItem.remove(), 300);
  }, 3500);
};

/* ==========================================================================
   LIVE AUCTION & BIDDING WORKFLOWS
   ========================================================================== */

/**
 * Loads live auction stream & starts polling every 3.5 seconds
 */
window.loadLiveAuctionForDetail = async function (propertyId, propertyData) {
  const container = document.getElementById('property-auction-container');
  if (!container) return;

  // Clear existing polling intervals
  if (state.auctionPollingInterval) {
    clearInterval(state.auctionPollingInterval);
    state.auctionPollingInterval = null;
  }
  if (state.auctionCountdownInterval) {
    clearInterval(state.auctionCountdownInterval);
    state.auctionCountdownInterval = null;
  }

  async function fetchAndRender() {
    try {
      const headers = { 'Accept': 'application/json' };
      if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

      const res = await fetch(`/api/properties/${propertyId}/auction`, { headers });
      if (!res.ok) {
        container.innerHTML = `
          <div style="background: var(--color-input); border-radius: var(--radius-md); padding: 14px 18px; font-size: 0.85rem; color: var(--color-text-muted);">
            📋 Standard Verified Listing — Fixed Price & Direct Inquiries Available.
          </div>
        `;
        return;
      }

      const data = await res.json();
      state.activeAuctionData = data;
      renderAuctionSection(container, data, propertyData || data.property);
    } catch (err) {
      console.warn('Auction polling fetch error:', err);
      container.innerHTML = `
        <div style="background: var(--color-input); border-radius: var(--radius-md); padding: 14px 18px; font-size: 0.85rem; color: var(--color-text-muted);">
          📋 Standard Verified Listing — Fixed Price & Direct Inquiries Available.
        </div>
      `;
    }
  }

  // Initial fetch
  await fetchAndRender();

  // Active polling if modal is still open
  state.auctionPollingInterval = setInterval(() => {
    const modal = document.getElementById('modal-property-detail');
    if (modal && modal.classList.contains('active')) {
      fetchAndRender();
    } else {
      clearInterval(state.auctionPollingInterval);
      state.auctionPollingInterval = null;
    }
  }, 3500);
};

function renderAuctionSection(container, data, prop) {
  if (!container) return;

  const property = prop || data?.property || {};
  const viewer = data?.viewer || {};
  const isOwner = state.user && (
    state.user.id === property.user_id || 
    state.user.id === property.user?.id || 
    state.user.id === property.seller?.id ||
    viewer.is_seller === true
  );

  // Case 1: No auction exists for this property
  if (!data || !data.has_auction) {
    if (data && data.has_pending_request) {
      container.innerHTML = `
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: var(--radius-md); padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-weight: 700; color: #d97706; font-size: 0.95rem;">⏳ Auction Request Pending Admin Review</div>
            <div style="font-size: 0.825rem; color: var(--color-text-muted); margin-top: 2px;">
              The seller has requested a live auction for this property. Competitive bidding will open upon administrator approval.
            </div>
          </div>
          <span class="status-chip chip-pending">In Review</span>
        </div>
      `;
    } else if (isOwner && property.verification_status === 'approved' && property.transaction_status !== 'sold') {
      container.innerHTML = `
        <div style="background: var(--color-surface); border: 2px dashed var(--color-brand); border-radius: var(--radius-lg); padding: 18px; text-align: center;">
          <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--color-brand); margin-bottom: 6px;">
            🚀 Open Live Competitive Bidding
          </h4>
          <p style="font-size: 0.85rem; color: var(--color-text-muted); max-width: 500px; margin: 0 auto 14px auto;">
            Maximize your property value through EstateLink's real-time verified auction platform with automated incremental bidding and fraud prevention.
          </p>
          <button class="btn btn-primary" onclick="openBiddingRequestModal(${property.id || prop?.id}, ${property.price || prop?.price || 1000000})">
            Request Auction for this Property
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="background: var(--color-input); border-radius: var(--radius-md); padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-weight: 700; font-size: 0.92rem;">📋 Standard Listing — Direct Purchase & Inquiries</div>
            <div style="font-size: 0.825rem; color: var(--color-text-muted); margin-top: 2px;">
              This verified property is listed under standard fixed-price terms. Interested buyers can directly contact the owner above.
            </div>
          </div>
          <span class="status-chip chip-available">Standard Listing</span>
        </div>
      `;
    }
    return;
  }

  const a = data.auction;
  const bids = data.bids || [];

  // Countdown timer logic
  if (a.is_active && a.end_time) {
    startAuctionCountdown(a.end_time);
  } else if (state.auctionCountdownInterval) {
    clearInterval(state.auctionCountdownInterval);
  }

  let statusHeader = '';
  if (a.is_active) {
    statusHeader = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <span class="auction-header-badge">🔴 Live Auction Active</span>
        <span style="font-size: 0.8rem; color: var(--color-text-muted);">
          ⚡ Live Server Stream (${data.viewer?.is_seller ? 'Seller Mode' : (data.viewer?.is_admin ? 'Admin Mode' : 'Masked Anonymity')})
        </span>
      </div>
    `;
  } else if (a.status === 'awaiting_seller_confirmation') {
    statusHeader = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <span style="background: rgba(99, 102, 241, 0.15); color: #4f46e5; border: 1px solid rgba(99, 102, 241, 0.4); padding: 4px 12px; border-radius: 9999px; font-weight: 800; font-size: 0.8rem;">
          ⏳ Auction Ended — Awaiting Seller Decision
        </span>
      </div>
    `;
  } else if (a.status === 'sold') {
    statusHeader = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <span style="background: #10b981; color: #fff; padding: 4px 14px; border-radius: 9999px; font-weight: 800; font-size: 0.82rem;">
          🏆 Property SOLD at Auction
        </span>
      </div>
    `;
  } else {
    statusHeader = `
      <span style="background: var(--color-input); color: var(--color-text-muted); padding: 4px 10px; border-radius: 9999px; font-size: 0.8rem; text-transform: uppercase; font-weight: 700;">
        Auction Status: ${escapeHtml(a.status)}
      </span>
    `;
  }

  container.innerHTML = `
    <div class="auction-live-card">
      ${statusHeader}

      <!-- Countdown Timer -->
      ${a.is_active ? `
        <div class="auction-countdown-wrap">
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--color-text-muted); margin-right: 4px;">ENDS IN:</div>
          <div class="countdown-box"><div class="countdown-box-val" id="timer-hours">00</div><div class="countdown-box-lbl">Hours</div></div>
          <div style="font-weight: 800; font-size: 1.2rem; color: var(--color-brand);">:</div>
          <div class="countdown-box"><div class="countdown-box-val" id="timer-mins">00</div><div class="countdown-box-lbl">Mins</div></div>
          <div style="font-weight: 800; font-size: 1.2rem; color: var(--color-brand);">:</div>
          <div class="countdown-box"><div class="countdown-box-val" id="timer-secs">00</div><div class="countdown-box-lbl">Secs</div></div>
        </div>
      ` : ''}

      <!-- Metrics Grid -->
      <div class="auction-metrics-grid">
        <div class="auction-metric-box">
          <div class="auction-metric-title">Opening Floor Price</div>
          <div class="auction-metric-val" style="color: var(--color-text-muted); font-size: 1.05rem;">
            ${formatCurrency(a.start_price)}
          </div>
        </div>

        <div class="auction-metric-box">
          <div class="auction-metric-title">Current Top Bid</div>
          <div class="auction-metric-val" style="color: var(--color-brand);">
            ${a.top_bid_amount ? formatCurrency(a.top_bid_amount) : 'No Bids Yet'}
          </div>
        </div>

        <div class="auction-metric-box">
          <div class="auction-metric-title">Min Required Next Bid</div>
          <div class="auction-metric-val" style="color: #6366f1;">
            ${formatCurrency(a.next_min_bid)}
          </div>
        </div>

        <div class="auction-metric-box">
          <div class="auction-metric-title">Total Bids Placed</div>
          <div class="auction-metric-val">
            ${a.total_bids}
          </div>
        </div>
      </div>

      <!-- Seller Decision Action Controls -->
      ${(viewer.is_seller && a.status === 'awaiting_seller_confirmation') ? `
        <div style="background: var(--color-surface); border: 2px solid var(--color-brand); border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;">
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 4px; color: var(--color-brand);">
            👑 Seller Action Required: Finalize Winning Bid
          </h4>
          <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 12px;">
            The auction has closed. The top bid is <strong>${formatCurrency(a.top_bid_amount)}</strong>. You may accept this bid to mark the property SOLD and generate a transaction deed, or decline to cancel and keep the listing.
          </p>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-success" onclick="acceptWinningBid(${a.id})">
              ✓ Accept Winning Bid (${formatCurrency(a.top_bid_amount)})
            </button>
            <button class="btn btn-secondary" style="color: var(--color-danger);" onclick="declineWinningBid(${a.id})">
              ✕ Decline Winning Bid
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Buyer Live Bid Form (Only when Active and Viewer is not Seller) -->
      ${(a.is_active && !viewer.is_seller) ? `
        <div class="auction-bid-form">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="font-size: 0.9rem; font-weight: 700;">Place Your Live Bid</label>
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">
              Min Increment: +${formatCurrency(a.min_increment)}
            </span>
          </div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
              <input type="number" id="input-bid-amount" min="${a.next_min_bid}" step="any" value="${a.next_min_bid}" style="width: 100%; font-size: 1.1rem; font-weight: 700; color: var(--color-brand);" required>
            </div>
            <button class="btn btn-primary" onclick="placeLiveBid(${a.id})" id="btn-place-bid" style="font-weight: 700;">
              ⚡ Submit Bid
            </button>
          </div>

          <!-- Quick Increment Buttons -->
          <div class="quick-bid-buttons">
            <span style="font-size: 0.75rem; color: var(--color-text-muted); align-self: center;">Quick Add:</span>
            <button type="button" class="btn-quick-bid" onclick="quickAdjustBid(10000)">+৳10,000</button>
            <button type="button" class="btn-quick-bid" onclick="quickAdjustBid(50000)">+৳50,000</button>
            <button type="button" class="btn-quick-bid" onclick="quickAdjustBid(100000)">+৳1,00,000</button>
            <button type="button" class="btn-quick-bid" onclick="quickAdjustBid(500000)">+৳5,00,000</button>
          </div>

          ${viewer.user_top_bid ? `
            <div style="font-size: 0.825rem; margin-top: 6px; padding: 6px 10px; border-radius: var(--radius-sm); ${viewer.is_highest_bidder ? 'background: rgba(16,185,129,0.12); color: #059669;' : 'background: rgba(245,158,11,0.12); color: #d97706;'}">
              ${viewer.is_highest_bidder
                ? `🎉 <strong>You currently hold the highest bid</strong> at ${formatCurrency(viewer.user_top_bid)}!`
                : `⚠️ <strong>You have been outbid!</strong> Your previous highest bid was ${formatCurrency(viewer.user_top_bid)}.`}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Masked Real-time Bid Ledger -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h5 style="font-size: 0.88rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-muted);">
            📜 Bid Ledger & Activity Log (${bids.length})
          </h5>
          <span style="font-size: 0.75rem; color: var(--color-text-muted);">
            🔒 Identity Masked for Buyer Privacy
          </span>
        </div>

        <div class="auction-bids-ledger">
          ${bids.length === 0 ? `
            <div style="text-align: center; padding: 20px; color: var(--color-text-muted); font-size: 0.85rem;">
              No bids have been placed yet. Be the first to open with <strong>${formatCurrency(a.start_price)}</strong>!
            </div>
          ` : bids.map((b, idx) => `
            <div class="ledger-bid-item ${idx === 0 ? 'is-top-bid' : ''} ${b.is_you ? 'is-you' : ''}">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.75rem; color: var(--color-text-muted); min-width: 20px;">#${bids.length - idx}</span>
                <span style="font-weight: ${b.is_you || idx === 0 ? '700' : '600'};">
                  ${escapeHtml(b.bidder_label)}
                </span>
                ${idx === 0 ? '<span style="background: var(--color-brand); color: #fff; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">TOP BID</span>' : ''}
                ${b.is_you ? '<span style="background: rgba(99,102,241,0.2); color: #6366f1; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px;">YOU</span>' : ''}
              </div>
              <div style="text-align: right;">
                <strong style="color: var(--color-brand); font-size: 0.95rem;">${formatCurrency(b.amount)}</strong>
                <div style="font-size: 0.7rem; color: var(--color-text-muted);">
                  ${b.placed_at ? new Date(b.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function startAuctionCountdown(endTimeStr) {
  if (state.auctionCountdownInterval) {
    clearInterval(state.auctionCountdownInterval);
  }

  function update() {
    const end = new Date(endTimeStr).getTime();
    const now = Date.now();
    const diff = Math.max(0, end - now);

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const hEl = document.getElementById('timer-hours');
    const mEl = document.getElementById('timer-mins');
    const sEl = document.getElementById('timer-secs');

    if (hEl) hEl.textContent = String(hours).padStart(2, '0');
    if (mEl) mEl.textContent = String(mins).padStart(2, '0');
    if (sEl) sEl.textContent = String(secs).padStart(2, '0');

    if (diff <= 0) {
      clearInterval(state.auctionCountdownInterval);
    }
  }

  update();
  state.auctionCountdownInterval = setInterval(update, 1000);
}

window.quickAdjustBid = function (delta) {
  const input = document.getElementById('input-bid-amount');
  if (!input) return;
  const current = parseFloat(input.value) || 0;
  input.value = current + delta;
};

window.placeLiveBid = async function (auctionId) {
  if (!state.token || !state.user) {
    showToast('Please sign in to place a bid.', 'info');
    openAuthModal('login', 'user');
    return;
  }

  const input = document.getElementById('input-bid-amount');
  const btn = document.getElementById('btn-place-bid');
  if (!input) return;

  const amount = parseFloat(input.value);
  if (!amount || isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid bid amount.', 'error');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Submitting...';
  }

  try {
    const response = await fetch(`/api/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ amount })
    });

    const result = await response.json();

    if (!response.ok) {
      const msg = result.message || (result.errors && Object.values(result.errors).flat().join(', ')) || 'Bid submission failed.';
      showToast(msg, 'error');
    } else {
      showToast(result.message || 'Bid placed successfully!', 'success');
      // Instantly refresh auction detail view
      if (state.activeAuctionData?.auction?.property_id) {
        loadLiveAuctionForDetail(state.activeAuctionData.auction.property_id);
      }
    }
  } catch (error) {
    console.error('Bid placement error:', error);
    showToast('Network error while submitting bid.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⚡ Submit Bid';
    }
  }
};

window.openBiddingRequestModal = function (propertyId, suggestedPrice = 1000000) {
  if (!state.token || !state.user) {
    showToast('Please sign in to request an auction.', 'info');
    openAuthModal('login', 'user');
    return;
  }

  const propIdInput = document.getElementById('bidding-property-id');
  const startPriceInput = document.getElementById('bidding-start-price');
  if (propIdInput) propIdInput.value = propertyId;
  if (startPriceInput) startPriceInput.value = suggestedPrice;

  const modal = document.getElementById('modal-bidding-request');
  if (modal) {
    modal.classList.add('active');
  }
};

window.handleBiddingRequestSubmit = async function (e) {
  e.preventDefault();
  const propertyId = document.getElementById('bidding-property-id')?.value;
  const startPrice = document.getElementById('bidding-start-price')?.value;
  const minIncrement = document.getElementById('bidding-min-increment')?.value;
  const durationHours = document.getElementById('bidding-duration-hours')?.value;
  const submitBtn = document.getElementById('btn-submit-bidding-request');

  if (!propertyId) return;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Request...';
  }

  try {
    const response = await fetch(`/api/my-properties/${propertyId}/bidding-request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        start_price: parseFloat(startPrice),
        min_increment: parseFloat(minIncrement),
        duration_hours: parseInt(durationHours, 10)
      })
    });

    const result = await response.json();

    if (!response.ok) {
      const msg = result.message || (result.errors && Object.values(result.errors).flat().join(', ')) || 'Request submission failed.';
      showToast(msg, 'error');
    } else {
      showToast('Bidding request submitted! EstateLink admins will review and start your live auction.', 'success');
      closeAllModals();
      loadMyProperties();
    }
  } catch (error) {
    console.error('Bidding request submit error:', error);
    showToast('Network error while requesting auction.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Request for Admin Approval';
    }
  }
};

/* ==========================================================================
   ADMIN AUCTION / BIDDING REQUEST WORKFLOWS
   ========================================================================== */

window.loadAdminBiddingRequests = async function (page = 1) {
  const container = document.getElementById('admin-queue-container');
  const pagination = document.getElementById('admin-pagination-container');
  if (!container || !state.token) return;

  container.innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <p>Loading live bidding requests...</p>
    </div>
  `;
  if (pagination) pagination.innerHTML = '';

  try {
    const res = await fetch(`/api/admin/bidding-requests?page=${page}`, {
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) throw new Error('Failed to load bidding requests');

    const result = await res.json();
    const requests = result.data || [];

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const countSpan = document.getElementById('admin-bidding-count');
    if (countSpan) countSpan.textContent = pendingCount;

    if (requests.length === 0) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🏛️</div>
          <h3>No Bidding Requests</h3>
          <p>There are no auction requests submitted by sellers yet.</p>
        </div>
      `;
      return;
    }

    let html = '';
    requests.forEach(r => {
      const p = r.property || {};
      const seller = r.user || {};
      const fallbackImage = '/images/hero_building.jpg';
      const mainImg = (p.primary_image && p.primary_image.image_path) ? p.primary_image.image_path : fallbackImage;

      let statusBadge = '';
      if (r.status === 'pending') statusBadge = '<span class="status-chip chip-pending">⏳ Pending Review</span>';
      else if (r.status === 'approved') statusBadge = '<span class="status-chip chip-approved">✓ Approved & Live</span>';
      else statusBadge = '<span class="status-chip chip-rejected">❌ Rejected</span>';

      html += `
        <div class="admin-queue-card" style="border-left: 4px solid ${r.status === 'pending' ? 'var(--color-warning)' : (r.status === 'approved' ? 'var(--color-success)' : 'var(--color-danger)')};">
          <div>
            <img src="${mainImg}" style="width: 100%; height: 110px; object-fit: cover; border-radius: var(--radius-md);" onerror="this.src='${fallbackImage}'">
          </div>
          <div>
            <div style="display: flex; gap: 8px; margin-bottom: 4px; align-items: center; flex-wrap: wrap;">
              ${statusBadge}
              <span class="status-chip chip-type">Duration: ${r.duration_hours}h</span>
              <strong style="color: var(--color-brand); font-size: 1.1rem;">Opening: ${formatCurrency(r.start_price)}</strong>
              <span style="font-size: 0.8rem; color: var(--color-text-muted);">(Min Inc: +${formatCurrency(r.min_increment)})</span>
            </div>

            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px;">Property #${p.id || 'N/A'}: ${escapeHtml(p.title || 'Untitled')}</h3>
            <div style="font-size: 0.825rem; color: var(--color-text-muted); margin-bottom: 6px;">
              📍 ${escapeHtml(p.location || 'N/A')} • Requested: ${new Date(r.requested_at || r.created_at).toLocaleString()}
            </div>

            <div style="font-size: 0.825rem; background: var(--color-input); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 6px;">
              👤 Seller: <strong>${escapeHtml(seller.name || 'N/A')}</strong> • NID: <strong>${escapeHtml(seller.national_id || 'N/A')}</strong> • Phone: <strong>${escapeHtml(seller.phone || 'N/A')}</strong>
            </div>

            ${r.admin_note ? `
              <div style="font-size: 0.8rem; color: var(--color-text-muted); background: rgba(0,0,0,0.03); padding: 6px 10px; border-radius: 4px;">
                <strong>Admin Note:</strong> ${escapeHtml(r.admin_note)}
              </div>
            ` : ''}
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; min-width: 140px;">
            <button class="btn btn-secondary btn-sm w-full" onclick="openPropertyDetailModal(${p.id})">
              👁️ View Listing
            </button>

            ${r.status === 'pending' ? `
              <button class="btn btn-success btn-sm w-full" onclick="adminApproveBidding(${r.id})">
                ✓ Approve & Start
              </button>
              <button class="btn btn-danger btn-sm w-full" onclick="openAdminBiddingRejectModal(${r.id})">
                ❌ Reject Request
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    renderPagination(result, pagination, (p) => loadAdminBiddingRequests(p));
  } catch (err) {
    console.error('Admin bidding requests error:', err);
  }
};

window.adminApproveBidding = async function (requestId) {
  if (!confirm('Are you sure you want to APPROVE this bidding request? The live auction will start immediately.')) return;

  try {
    const res = await fetch(`/api/admin/bidding-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ admin_note: 'Approved and started by administrator.' })
    });

    const result = await res.json();

    if (!res.ok) {
      showToast(result.message || 'Approval failed.', 'error');
    } else {
      showToast(result.message || 'Bidding request approved! Live auction started.', 'success');
      if (document.getElementById('view-profile')?.classList.contains('active')) {
        loadAdminProfileCounters();
        loadProfileAdminTab(state.profileAdminTab || 'bidding_requests');
      } else {
        loadAdminBiddingRequests();
      }
    }
  } catch (err) {
    console.error('Bidding approval error:', err);
    showToast('Network error during bidding approval.', 'error');
  }
};

window.openAdminBiddingRejectModal = function (requestId) {
  const reqIdInput = document.getElementById('reject-bidding-request-id');
  if (reqIdInput) reqIdInput.value = requestId;
  const modal = document.getElementById('modal-admin-bidding-reject');
  if (modal) modal.classList.add('active');
};

window.handleAdminBiddingRejectSubmit = async function (e) {
  e.preventDefault();
  const requestId = document.getElementById('reject-bidding-request-id')?.value;
  const note = document.getElementById('admin-bidding-reject-note')?.value;
  const btn = document.getElementById('btn-confirm-bidding-reject');

  if (!requestId || !note) return;

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Rejecting...';
  }

  try {
    const res = await fetch(`/api/admin/bidding-requests/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ admin_note: note })
    });

    const result = await res.json();

    if (!res.ok) {
      showToast(result.message || 'Rejection failed.', 'error');
    } else {
      showToast('Bidding request rejected.', 'success');
      closeAllModals();
      if (document.getElementById('view-profile')?.classList.contains('active')) {
        loadAdminProfileCounters();
        loadProfileAdminTab(state.profileAdminTab || 'bidding_requests');
      } else {
        loadAdminBiddingRequests();
      }
    }
  } catch (err) {
    console.error('Bidding reject error:', err);
    showToast('Network error during rejection.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Reject Request';
    }
  }
};

/* ==========================================================================
   SELLER AUCTION DECISION WORKFLOWS
   ========================================================================== */

window.acceptWinningBid = async function (auctionId) {
  if (!confirm('Are you sure you want to ACCEPT the winning bid? This will conclude the auction, mark the property as SOLD, and generate an official transaction record.')) return;

  try {
    const res = await fetch(`/api/auctions/${auctionId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ notes: 'Seller accepted winning auction bid.' })
    });

    const result = await res.json();

    if (!res.ok) {
      showToast(result.message || 'Acceptance failed.', 'error');
    } else {
      showToast(result.message || 'Winning bid accepted and property marked SOLD!', 'success');
      if (state.activeAuctionData?.auction?.property_id) {
        loadLiveAuctionForDetail(state.activeAuctionData.auction.property_id);
      }
    }
  } catch (err) {
    console.error('Accept winning bid error:', err);
    showToast('Network error while accepting winning bid.', 'error');
  }
};

window.declineWinningBid = async function (auctionId) {
  const reason = prompt('Please state the reason for declining this winning bid:');
  if (!reason || reason.trim().length < 5) {
    if (reason !== null) showToast('A clear reason (at least 5 characters) is required to decline.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/auctions/${auctionId}/decline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ seller_notes: reason.trim() })
    });

    const result = await res.json();

    if (!res.ok) {
      showToast(result.message || 'Decline failed.', 'error');
    } else {
      showToast(result.message || 'Winning bid declined and auction cancelled.', 'success');
      if (state.activeAuctionData?.auction?.property_id) {
        loadLiveAuctionForDetail(state.activeAuctionData.auction.property_id);
      }
    }
  } catch (err) {
    console.error('Decline winning bid error:', err);
    showToast('Network error while declining winning bid.', 'error');
  }
};

/* ==========================================================================
   BUYER BID HISTORY VIEW (/my-bids)
   ========================================================================== */

window.loadMyBids = async function () {
  const container = document.getElementById('my-bids-list-container');
  if (!container || !state.token) return;

  container.innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <p>Loading your auction activity & bids history...</p>
    </div>
  `;

  try {
    const res = await fetch('/api/my-bids', {
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to load your bids history');
    }

    const result = await res.json();
    const history = result.bids_history || [];

    if (history.length === 0) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-icon">🎯</div>
          <h3>No Bids Placed Yet</h3>
          <p>Explore verified properties currently in live auction and place your opening bids.</p>
          <button class="btn btn-primary" style="margin-top: 14px;" onclick="navigateTo('/properties')">
            Browse Live Properties
          </button>
        </div>
      `;
      return;
    }

    let html = '';
    history.forEach(item => {
      const p = item.property || {};
      const fallbackImage = '/images/hero_building.jpg';
      const mainImg = (p.primary_image && p.primary_image.image_path) ? p.primary_image.image_path : fallbackImage;

      let badgeClass = 'badge-lost';
      if (item.badge_status === 'winning') badgeClass = 'badge-winning';
      else if (item.badge_status === 'outbid') badgeClass = 'badge-outbid';
      else if (item.badge_status === 'won') badgeClass = 'badge-won';
      else if (item.badge_status === 'pending_confirmation') badgeClass = 'badge-pending';

      html += `
        <div class="auction-history-card">
          <div>
            <img src="${mainImg}" style="width: 100%; height: 100px; object-fit: cover; border-radius: var(--radius-md);" onerror="this.src='${fallbackImage}'">
          </div>

          <div>
            <div style="display: flex; gap: 8px; margin-bottom: 6px; align-items: center; flex-wrap: wrap;">
              <span class="status-chip ${badgeClass}">${escapeHtml(item.badge_label)}</span>
              <span class="status-chip chip-type">Auction #${item.auction_id}</span>
              <span style="font-size: 0.8rem; color: var(--color-text-muted);">
                State: <strong>${escapeHtml(item.auction_status)}</strong>
              </span>
            </div>

            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px;">${escapeHtml(p.title || 'Untitled Property')}</h3>
            <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 8px;">
              📍 ${escapeHtml(p.location || 'N/A')} • Seller: <strong>${escapeHtml(item.seller?.name || 'Verified Owner')}</strong>
            </div>

            <div style="display: flex; gap: 16px; flex-wrap: wrap; background: var(--color-input); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.85rem;">
              <div>Your Highest Bid: <strong style="color: var(--color-brand);">${formatCurrency(item.user_highest_bid)}</strong></div>
              <div>Current Top Bid: <strong style="color: #6366f1;">${formatCurrency(item.current_top_amount)}</strong></div>
              <div>Bids Placed: <strong>${item.user_bids_count}</strong></div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; min-width: 130px;">
            <button class="btn btn-secondary btn-sm w-full" onclick="openPropertyDetailModal(${p.id})">
              🔍 Live Room
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.error('My bids load error:', err);
    container.innerHTML = `
      <div class="state-box">
        <p style="color: var(--color-danger);">Failed to load your bids (${escapeHtml(err.message)}).</p>
        <button class="btn btn-secondary btn-sm" onclick="loadMyBids()">Retry</button>
      </div>
    `;
  }
};

