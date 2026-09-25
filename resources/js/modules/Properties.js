/**
 * Properties Module - Public Property Catalog & Details Modal
 */
import { state } from '../state';
import { formatCurrency, escapeHtml, renderPagination, showToast } from '../utils';

export class PropertiesManager {
  static async loadPublicProperties(page = 1) {
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
  }

  static resetPublicFilters() {
    const searchInput = document.getElementById('filter-search');
    const typeSelect = document.getElementById('filter-type');
    const bedsSelect = document.getElementById('filter-bedrooms');
    const statusSelect = document.getElementById('filter-status');

    if (searchInput) searchInput.value = '';
    if (typeSelect) typeSelect.value = '';
    if (bedsSelect) bedsSelect.value = '';
    if (statusSelect) statusSelect.value = '';

    PropertiesManager.loadPublicProperties(1);
  }

  static async openPropertyDetailModal(id) {
    const modal = document.getElementById('modal-property-detail');
    const body = document.getElementById('property-detail-body');
    const titleEl = document.getElementById('detail-modal-title');
    if (!modal || !body) return;

    if (window.closeAllModals) window.closeAllModals();
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

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            ${(state.user && state.user.id !== p.user_id && (p.transaction_status === 'available' || !p.transaction_status)) ? `
              <button class="btn btn-primary" onclick="openPurchaseRequestModal(${p.id}, '${escapeHtml(p.title).replace(/'/g, "\\'")}', ${p.price}, '${escapeHtml(p.location).replace(/'/g, "\\'")}')">
                📝 Request Purchase / Inspection
              </button>
            ` : (!state.user && (p.transaction_status === 'available' || !p.transaction_status) ? `
              <button class="btn btn-primary" onclick="openAuthModal('login', 'user')">
                Sign In to Request Purchase
              </button>
            ` : '')}
            ${contactPhone ? `
              <a href="tel:${escapeHtml(contactPhone)}" class="btn btn-secondary">
                📞 Call ${escapeHtml(contactPhone)}
              </a>
            ` : `
              <button class="btn btn-secondary" onclick="showToast('Contact seller via EstateLink')">Contact Seller</button>
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
      if (window.loadLiveAuctionForDetail) {
        window.loadLiveAuctionForDetail(p.id, p);
      }

    } catch (error) {
      console.error('Property detail error:', error);
    }
  }
}
