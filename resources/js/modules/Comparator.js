/**
 * Comparator Module - Persistent Floating Dock, Comparison Matrix & Smart Decision Engine
 */
import { state } from '../state';
import { showToast, formatCurrency, escapeHtml } from '../utils';

const STORAGE_KEY = 'estatelink_compare_ids';
const MAX_COMPARE_LIMIT = 5;

export class ComparatorManager {
  // ─────────────────────────────────────────────────────────────────────────
  // Storage & State Helpers
  // ─────────────────────────────────────────────────────────────────────────

  static getCompareIds() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_COMPARE_LIMIT);
      }
    } catch (e) {
      console.error('Failed to parse compare IDs:', e);
    }
    return [];
  }

  static setCompareIds(ids) {
    const uniqueIds = Array.from(new Set(ids)).slice(0, MAX_COMPARE_LIMIT);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uniqueIds));
    } catch (e) {
      console.error('Failed to save compare IDs:', e);
    }
    ComparatorManager.updateFloatingDock();
    ComparatorManager.updateCardToggleButtons();
  }

  static toggleCompare(id) {
    const numId = Number(id);
    let ids = ComparatorManager.getCompareIds();
    const index = ids.indexOf(numId);

    if (index > -1) {
      ids.splice(index, 1);
      showToast('Removed from comparison list.', 'info');
    } else {
      if (ids.length >= MAX_COMPARE_LIMIT) {
        showToast(`You can compare up to ${MAX_COMPARE_LIMIT} properties at once.`, 'error');
        return;
      }
      ids.push(numId);
      showToast('Added to property comparison!', 'success');
    }

    ComparatorManager.setCompareIds(ids);

    // If currently on comparison page, reload table
    if (window.location.pathname.startsWith('/compare')) {
      ComparatorManager.loadComparisonPage(ids);
    }
  }

  static isInCompare(id) {
    const ids = ComparatorManager.getCompareIds();
    return ids.includes(Number(id));
  }

  static clearCompare() {
    ComparatorManager.setCompareIds([]);
    showToast('Comparison list cleared.', 'info');
    if (window.location.pathname.startsWith('/compare')) {
      ComparatorManager.loadComparisonPage([]);
    }
  }

  // Called when leaving the compare page — clears state silently
  static clearCompareState() {
    ComparatorManager.setCompareIds([]);
    ComparatorManager.updateCardToggleButtons();
  }

  static removeCompareItem(id) {
    let ids = ComparatorManager.getCompareIds();
    ids = ids.filter(i => Number(i) !== Number(id));
    ComparatorManager.setCompareIds(ids);
    if (window.location.pathname.startsWith('/compare')) {
      ComparatorManager.loadComparisonPage(ids);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Floating Dock Component Sync
  // ─────────────────────────────────────────────────────────────────────────

  static async updateFloatingDock() {
    const dock = document.getElementById('compare-floating-dock');
    if (!dock) return;

    const ids = ComparatorManager.getCompareIds();
    const countBadge = document.getElementById('dock-counter-badge');
    const btnCount = document.getElementById('dock-btn-count');
    const container = document.getElementById('dock-thumbnails-container');

    if (countBadge) countBadge.textContent = `${ids.length} / ${MAX_COMPARE_LIMIT} Selected`;
    if (btnCount) btnCount.textContent = ids.length;

    if (ids.length === 0) {
      dock.style.display = 'none';
      return;
    }

    // Hide dock on comparison page itself to avoid duplication
    if (window.location.pathname.startsWith('/compare')) {
      dock.style.display = 'none';
      return;
    }

    dock.style.display = 'block';

    if (!container) return;

    // Fetch details for floating dock thumbnails if needed
    try {
      const response = await fetch(`/api/properties/compare?ids=${ids.join(',')}`);
      if (!response.ok) return;
      const data = await response.json();
      const properties = data.properties || [];

      container.innerHTML = properties.map(p => `
        <div class="dock-thumbnail-item" title="${escapeHtml(p.title)}">
          <img src="${escapeHtml(p.main_image)}" alt="${escapeHtml(p.title)}" class="dock-thumb-img">
          <button type="button" class="dock-thumb-remove" onclick="window.removeCompareItem(${p.id})">&times;</button>
          <div class="dock-thumb-price">${escapeHtml(p.formatted_price)}</div>
        </div>
      `).join('');
    } catch (e) {
      console.error('Failed to update dock thumbnails:', e);
    }
  }

  static updateCardToggleButtons() {
    const ids = ComparatorManager.getCompareIds();
    document.querySelectorAll('.btn-compare-toggle').forEach(btn => {
      const propId = Number(btn.getAttribute('data-property-id'));
      if (ids.includes(propId)) {
        btn.classList.add('active');
        btn.innerHTML = '✓ Compared';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '+ Compare';
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Side-by-Side Comparison Matrix Table Render
  // ─────────────────────────────────────────────────────────────────────────

  static async loadComparisonPage(explicitIds = null) {
    const container = document.getElementById('compare-page-content');
    if (!container) return;

    let ids = [];
    if (explicitIds !== null) {
      ids = explicitIds;
    } else {
      // Parse query string /compare?ids=1,2,3
      const params = new URLSearchParams(window.location.search);
      const urlIds = params.get('ids');
      if (urlIds) {
        ids = urlIds.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n) && n > 0);
      } else {
        ids = ComparatorManager.getCompareIds();
      }
    }

    ids = Array.from(new Set(ids)).slice(0, MAX_COMPARE_LIMIT);

    // Sync state & URL
    ComparatorManager.setCompareIds(ids);
    const newUrl = ids.length > 0 ? `/compare?ids=${ids.join(',')}` : '/compare';
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.pushState({}, '', newUrl);
    }

    if (ids.length === 0) {
      ComparatorManager.renderEmptyState();
      return;
    }

    // Show loading state in table area
    const tableWrap = document.getElementById('compare-matrix-wrap');
    if (tableWrap) tableWrap.innerHTML = `<div style="text-align:center;padding:40px;"><div class="spinner"></div><p style="margin-top:12px;color:var(--color-text-muted);">Loading comparison data...</p></div>`;

    try {
      const response = await fetch(`/api/properties/compare?ids=${ids.join(',')}`);
      if (!response.ok) throw new Error('Failed to load comparison data.');
      const data = await response.json();
      const properties = data.properties || [];
      const extremes = data.extremes || {};

      if (properties.length === 0) {
        ComparatorManager.renderEmptyState();
        return;
      }

      ComparatorManager.renderMatrixTable(properties, extremes);
      ComparatorManager.renderDecisionAssistant(properties, extremes);

      // Show decision assistant container
      const da = document.getElementById('decision-assistant-container');
      if (da) da.style.display = 'block';

    } catch (err) {
      console.error('Error loading comparison:', err);
      showToast('Could not load property comparison data.', 'error');
    }
  }

  static renderEmptyState() {
    // Only update the table + assistant areas, leaving toolbar intact
    const tableWrap = document.getElementById('compare-matrix-wrap');
    if (tableWrap) {
      tableWrap.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 3.5rem; margin-bottom: 16px;">⚖️</div>
          <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 8px;">No Properties Selected for Comparison</h2>
          <p style="color: var(--color-text-muted); max-width: 500px; margin: 0 auto 24px;">
            Add up to 5 approved properties and compare them side-by-side with price metrics, legal proofs, and specs.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary btn-lg" onclick="window.navigateTo('/properties')">
              🔍 Browse Verified Properties
            </button>
            <button class="btn btn-secondary btn-lg" onclick="window.openAddToCompareModal()">
              + Add Property by Search
            </button>
          </div>
        </div>
      `;
    }
    const da = document.getElementById('decision-assistant-container');
    if (da) da.style.display = 'none';
  }

  static renderMatrixTable(properties, extremes) {
    const tableWrap = document.getElementById('compare-matrix-wrap');
    if (!tableWrap) return;

    const slotAvailable = properties.length < MAX_COMPARE_LIMIT;

    // Build the full table HTML fresh
    const headerCells = properties.map(p => `
      <th class="compare-col-header" id="col-property-${p.id}">
        <div class="property-header-card">
          <button type="button" class="remove-col-btn" onclick="window.removeCompareItem(${p.id})" title="Remove property">&times;</button>
          <div class="header-img-wrapper">
            <img src="${escapeHtml(p.main_image || '/images/hero_building.jpg')}" alt="${escapeHtml(p.title)}" class="header-card-img" onerror="this.src='/images/hero_building.jpg'">
            <span class="verified-badge-tag">✓ Verified</span>
          </div>
          <h4 class="header-card-title">${escapeHtml(p.title)}</h4>
          <p class="header-card-location">📍 ${escapeHtml(p.location)}</p>
          <div class="header-card-price">${escapeHtml(p.formatted_price)}</div>
        </div>
      </th>
    `).join('');

    const slotCell = slotAvailable ? `
      <th class="compare-col-header slot-header">
        <div class="add-property-slot-card" onclick="window.openAddToCompareModal()">
          <div class="slot-plus-icon">+</div>
          <div class="slot-title">Add Property</div>
          <div class="slot-desc">${MAX_COMPARE_LIMIT - properties.length} slot(s) remaining</div>
        </div>
      </th>
    ` : '';

    // Helper that builds a full data row
    const buildRow = (rowId, labelText, getValueFn, getExtremeBadgeFn = null) => {
      const dataCells = properties.map(p => {
        const val = getValueFn(p);
        const badge = getExtremeBadgeFn ? getExtremeBadgeFn(p, extremes) : '';
        return `
          <td class="compare-cell col-property-${p.id}">
            ${badge ? `<div class="extreme-badge">${badge}</div>` : ''}
            <div class="cell-value">${val}</div>
          </td>
        `;
      }).join('');
      const slotTd = slotAvailable ? `<td class="compare-cell slot-cell">—</td>` : '';
      return `<tr id="${rowId}"><td class="sticky-label-col">${labelText}</td>${dataCells}${slotTd}</tr>`;
    };

    const buildSection = (label) =>
      `<tr class="section-divider-row"><td colspan="${properties.length + 2}">${label}</td></tr>`;

    const tableHtml = `
      <div class="table-responsive-container">
        <table class="compare-matrix-table" id="compare-matrix-table">
          <thead>
            <tr id="matrix-row-headers">
              <th class="sticky-label-col">Property Details</th>
              ${headerCells}
              ${slotCell}
            </tr>
          </thead>
          <tbody>
            ${buildSection('💰 Financial & Value Metrics')}
            ${buildRow('row-metric-price', 'Listing Price', p => p.formatted_price,
              (p, ext) => p.id === ext.lowest_price_id ? '🏆 Lowest Price' : p.id === ext.highest_price_id ? '💎 Premium' : '')}
            ${buildRow('row-metric-delta', 'Price Delta (vs Lowest)', p => p.formatted_price_delta,
              (p, ext) => p.id === ext.lowest_price_id ? '⭐ Baseline' : '')}
            ${buildRow('row-metric-price-sqft', 'Price / Sq. Ft.', p => p.formatted_price_sqft,
              (p, ext) => p.id === ext.best_price_per_sqft_id ? '📊 Best Value/SqFt' : '')}

            ${buildSection('📐 Property Specifications')}
            ${buildRow('row-spec-type', 'Property Type', p => p.property_type)}
            ${buildRow('row-spec-size', 'Living Area (SqFt)', p => p.formatted_size,
              (p, ext) => p.id === ext.largest_area_id ? '🏰 Largest Area' : '')}
            ${buildRow('row-spec-bedrooms', 'Bedrooms', p => p.bedrooms !== null ? `${p.bedrooms} Beds` : '—',
              (p, ext) => p.id === ext.most_bedrooms_id ? '🛏️ Most Bedrooms' : '')}
            ${buildRow('row-spec-bathrooms', 'Bathrooms', p => p.bathrooms !== null ? `${p.bathrooms} Baths` : '—',
              (p, ext) => p.id === ext.most_bathrooms_id ? '🛁 Most Bathrooms' : '')}

            ${buildSection('📍 Location & Neighborhood')}
            ${buildRow('row-loc-area', 'City / Area', p => escapeHtml(p.city || p.location || '—'))}
            ${buildRow('row-loc-address', 'Full Address', p => escapeHtml(p.street_address || p.address || p.location || '—'))}

            ${buildSection('🛡️ Legal Verification & Trust Audit')}
            ${buildRow('row-legal-status', 'Verification Status', p => `<span style="color:var(--color-success);font-weight:700;">✓ ${escapeHtml(p.verification_badge || 'Approved')}</span>`)}
            ${buildRow('row-legal-deed', 'Deed Audit', p => `<span style="color:var(--color-brand);font-weight:700;">🛡️ ${escapeHtml(p.deed_audited_badge || 'Audited')}</span>`)}
            ${buildRow('row-legal-docs', 'Legal Proofs', p => `
              <div class="legal-docs-list">
                ${(p.approved_documents || []).map(doc => `<span class="legal-doc-chip">✓ ${escapeHtml(doc)}</span>`).join('') || '<span style="color:var(--color-text-muted)">—</span>'}
              </div>
            `)}

            ${buildSection('👤 Seller Profile')}
            ${buildRow('row-seller-name', 'Verified Seller', p => `
              <strong>${escapeHtml(p.seller?.name || 'N/A')}</strong>
              ${p.seller?.company_name ? `<div style="font-size:0.78rem;color:var(--color-text-muted);">${escapeHtml(p.seller.company_name)}</div>` : ''}
            `)}
            ${buildRow('row-seller-member', 'Member Since', p => `Member since ${p.seller?.member_since || '—'}`)}

            ${buildSection('⚡ Direct Actions')}
            <tr id="row-actions">
              <td class="sticky-label-col">Next Steps</td>
              ${properties.map(p => `
                <td class="compare-cell col-property-${p.id}">
                  <div class="action-cell-buttons">
                    <button type="button" class="btn btn-primary btn-sm w-full" onclick="window.openPropertyDetailModal(${p.id})">👁️ View Details</button>
                    <button type="button" class="btn btn-secondary btn-sm w-full" onclick="window.removeCompareItem(${p.id})">✕ Remove</button>
                  </div>
                </td>
              `).join('')}
              ${slotAvailable ? `<td class="compare-cell slot-cell">—</td>` : ''}
            </tr>
          </tbody>
        </table>
      </div>
    `;

    tableWrap.innerHTML = tableHtml;

    // Apply difference highlighting check
    ComparatorManager.checkRowDifferences(properties);

  }

  static checkRowDifferences(properties) {
    const table = document.getElementById('compare-matrix-table');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr:not(.section-divider-row)');
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td:not(.sticky-label-col):not(.slot-cell)'));
      if (cells.length < 2) return;

      const firstText = cells[0].textContent.trim();
      const isDifferent = cells.some(cell => cell.textContent.trim() !== firstText);

      if (isDifferent) {
        row.classList.add('row-different');
      } else {
        row.classList.remove('row-different');
      }
    });
  }

  static toggleHighlightDifferences(enabled) {
    const table = document.getElementById('compare-matrix-table');
    if (!table) return;

    if (enabled) {
      table.classList.add('highlight-diffs');
    } else {
      table.classList.remove('highlight-diffs');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Smart Buyer Decision Assistant ("If This, Then That") Engine
  // ─────────────────────────────────────────────────────────────────────────

  static renderDecisionAssistant(properties, extremes) {
    const container = document.getElementById('decision-cards-grid');
    if (!container || properties.length === 0) return;

    const getProp = id => properties.find(p => p.id === id);

    const lowestPriceP    = getProp(extremes.lowest_price_id);
    const bestValueP      = getProp(extremes.best_price_per_sqft_id);
    const largestP        = getProp(extremes.largest_area_id);
    const mostBedsP       = getProp(extremes.most_bedrooms_id);
    const mostBathsP      = getProp(extremes.most_bathrooms_id);

    const cards = [
      {
        category: 'budget',
        icon: '💵',
        ifText: 'IF Lowest Price / Strict Budget is your top priority',
        thenText: 'THEN Choose',
        targetProperty: lowestPriceP,
        highlightValue: lowestPriceP ? lowestPriceP.formatted_price : '',
        reason: 'Offers the absolute lowest entry listing price among all compared properties.'
      },
      {
        category: 'value',
        icon: '📊',
        ifText: 'IF Best Value ($/sqft) is your top priority',
        thenText: 'THEN Choose',
        targetProperty: bestValueP,
        highlightValue: bestValueP ? bestValueP.formatted_price_sqft : '',
        reason: 'Delivers the maximum living space per Taka spent.'
      },
      {
        category: 'space',
        icon: '📐',
        ifText: 'IF Maximum Square Footage & Space is your top priority',
        thenText: 'THEN Choose',
        targetProperty: largestP,
        highlightValue: largestP ? largestP.formatted_size : '',
        reason: 'Features the largest overall interior floor plan layout.'
      },
      {
        category: 'bedrooms',
        icon: '🛏️',
        ifText: 'IF Maximum Bedroom Count for family is your top priority',
        thenText: 'THEN Choose',
        targetProperty: mostBedsP,
        highlightValue: mostBedsP ? `${mostBedsP.bedrooms} Bedrooms` : '',
        reason: 'Offers the highest number of separate bedroom quarters.'
      },
      {
        category: 'bathrooms',
        icon: '🛁',
        ifText: 'IF Maximum Bathroom Convenience is your top priority',
        thenText: 'THEN Choose',
        targetProperty: mostBathsP,
        highlightValue: mostBathsP ? `${mostBathsP.bathrooms} Bathrooms` : '',
        reason: 'Includes the most private & attached bathroom facilities.'
      }
    ];

    container.innerHTML = cards.map(card => {
      if (!card.targetProperty) return '';
      const p = card.targetProperty;
      return `
        <div class="decision-card" data-category="${card.category}" data-property-id="${p.id}"
             onmouseenter="window.highlightCompareColumn(${p.id}, true)"
             onmouseleave="window.highlightCompareColumn(${p.id}, false)">
          <div class="decision-card-icon">${card.icon}</div>
          <div class="decision-if-rule">${escapeHtml(card.ifText)}</div>
          <div class="decision-then-recommendation">
            <span class="then-label">${card.thenText}:</span>
            <strong class="rec-title">${escapeHtml(p.title)}</strong>
          </div>
          <div class="decision-highlight-val">${escapeHtml(card.highlightValue)}</div>
          <p class="decision-reason">${escapeHtml(card.reason)}</p>
          <div class="decision-card-actions">
            <button type="button" class="btn btn-sm btn-primary" onclick="window.openPropertyDetailModal(${p.id})">
              View Recommended Property
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  static filterDecisionAssistant(category, btnElement) {
    // Update active pill styling
    const pills = document.querySelectorAll('#decision-filter-pills .pill-btn');
    pills.forEach(p => p.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    // Filter cards
    const cards = document.querySelectorAll('#decision-cards-grid .decision-card');
    cards.forEach(card => {
      if (category === 'all' || card.getAttribute('data-category') === category) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  static highlightCompareColumn(propertyId, highlight) {
    const cols = document.querySelectorAll(`.col-property-${propertyId}`);
    const header = document.getElementById(`col-property-${propertyId}`);

    if (highlight) {
      if (header) header.classList.add('column-highlighted');
      cols.forEach(cell => cell.classList.add('column-highlighted'));
    } else {
      if (header) header.classList.remove('column-highlighted');
      cols.forEach(cell => cell.classList.remove('column-highlighted'));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Interactive Tools (Share Link, Print, Modal Search)
  // ─────────────────────────────────────────────────────────────────────────

  static copyComparisonShareLink() {
    const ids = ComparatorManager.getCompareIds();
    if (ids.length === 0) {
      showToast('No properties selected to share.', 'warning');
      return;
    }
    const shareUrl = `${window.location.origin}/compare?ids=${ids.join(',')}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast('Comparison link copied to clipboard!', 'success');
    }).catch(err => {
      console.error('Failed to copy link:', err);
      showToast('Failed to copy link.', 'error');
    });
  }

  static printComparisonSheet() {
    window.print();
  }

  static openAddToCompareModal() {
    const modal = document.getElementById('modal-add-to-compare');
    if (!modal) return;
    modal.classList.add('active');
    ComparatorManager.searchApprovedPropertiesForModal('');
  }

  static async searchApprovedPropertiesForModal(query) {
    const container = document.getElementById('modal-search-results-container');
    if (!container) return;

    const currentIds = ComparatorManager.getCompareIds();

    try {
      const response = await fetch(`/api/properties/approved-search?q=${encodeURIComponent(query)}&exclude_ids=${currentIds.join(',')}`);
      if (!response.ok) return;
      const data = await response.json();
      const properties = data.properties || [];

      if (properties.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--color-text-muted); padding: 20px;">No additional approved properties found matching query.</p>`;
        return;
      }

      container.innerHTML = properties.map(p => `
        <div class="quick-add-item">
          <img src="${escapeHtml(p.main_image)}" alt="${escapeHtml(p.title)}" class="quick-add-img">
          <div class="quick-add-info">
            <h4 class="quick-add-title">${escapeHtml(p.title)}</h4>
            <div class="quick-add-meta">📍 ${escapeHtml(p.location)} • ${p.bedrooms} Beds • ${p.size} sqft</div>
            <div class="quick-add-price">${escapeHtml(p.formatted_price)}</div>
          </div>
          <button type="button" class="btn btn-sm btn-primary" onclick="window.toggleCompare(${p.id}); window.closeAllModals();">
            + Add to Compare
          </button>
        </div>
      `).join('');
    } catch (e) {
      console.error('Failed to search properties for modal:', e);
    }
  }

  static navigateToComparePage() {
    const ids = ComparatorManager.getCompareIds();
    if (ids.length === 0) {
      showToast('Select at least one property to compare.', 'info');
      return;
    }
    window.navigateTo(`/compare?ids=${ids.join(',')}`);
  }
}
