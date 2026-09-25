/**
 * PropertyRequests Module - Buyer Purchase Requests & Seller Request Inquiries
 */
import { state } from '../state';
import { formatCurrency, escapeHtml, showToast } from '../utils';

export class PropertyRequestsManager {
  static openPurchaseRequestModal(propId, title, price, location) {
    if (!state.token || !state.user) {
      showToast('Please sign in to submit a purchase request.', 'info');
      if (window.openAuthModal) window.openAuthModal('login', 'user');
      return;
    }

    const modal = document.getElementById('modal-purchase-request');
    if (!modal) return;

    document.getElementById('request-property-id').value = propId;
    document.getElementById('request-prop-title').textContent = title;
    document.getElementById('request-prop-price').textContent = formatCurrency(price);
    document.getElementById('request-prop-loc').textContent = location;

    const offeredInput = document.getElementById('request-offered-amount');
    if (offeredInput) offeredInput.value = price;

    const dateInput = document.getElementById('request-preferred-date');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 3);
      dateInput.value = nextDate.toISOString().split('T')[0];
    }

    const notesInput = document.getElementById('request-buyer-notes');
    if (notesInput) notesInput.value = '';

    if (window.closeAllModals) window.closeAllModals();
    modal.classList.add('active');
  }

  static async handlePurchaseRequestSubmit(e) {
    e.preventDefault();
    const propId = document.getElementById('request-property-id').value;
    const offeredAmount = document.getElementById('request-offered-amount').value;
    const preferredDate = document.getElementById('request-preferred-date').value;
    const buyerNotes = document.getElementById('request-buyer-notes').value;
    const submitBtn = document.getElementById('btn-submit-purchase-request');

    if (!propId || !offeredAmount || !preferredDate) {
      showToast('Please fill in the offered amount and preferred date.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Request...';
    }

    try {
      const response = await fetch(`/api/properties/${propId}/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          offered_amount: parseFloat(offeredAmount),
          preferred_date: preferredDate,
          buyer_notes: buyerNotes || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Purchase request submitted successfully!', 'success');
        if (window.closeAllModals) window.closeAllModals();
        if (window.navigateTo) window.navigateTo('/my-requests');
      } else {
        showToast(data.message || 'Failed to submit purchase request.', 'error');
      }
    } catch (err) {
      console.error('Purchase request submission error:', err);
      showToast('Unable to submit request. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Request';
      }
    }
  }

  static async loadMyRequests(page = 1) {
    const container = document.getElementById('my-requests-list-container');
    if (!container || !state.token) return;

    container.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <p>Loading your purchase requests...</p>
      </div>
    `;

    try {
      const response = await fetch(`/api/buyer/requests?page=${page}`, {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to load purchase requests');

      const result = await response.json();
      const requests = result.data || [];

      if (requests.length === 0) {
        container.innerHTML = `
          <div class="state-box">
            <div class="state-icon">📑</div>
            <h3 style="font-size: 1.2rem; margin-bottom: 6px;">No Purchase Requests Yet</h3>
            <p style="margin-bottom: 16px;">Browse verified properties and submit an offer and inspection request.</p>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('/properties')">🔍 Browse Properties</button>
          </div>
        `;
        return;
      }

      let html = '<div style="display: flex; flex-direction: column; gap: 14px;">';
      requests.forEach(req => {
        let statusChip = '';
        if (req.status === 'pending_seller_approval') {
          statusChip = '<span class="status-chip chip-pending">⏳ Awaiting Seller Approval</span>';
        } else if (req.status === 'declined_by_seller') {
          statusChip = '<span class="status-chip chip-rejected">❌ Declined by Seller</span>';
        } else if (req.status === 'forwarded_to_admin') {
          statusChip = '<span class="status-chip" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">🛡️ In Admin Queue</span>';
        } else if (req.status === 'schedule_fixed') {
          statusChip = '<span class="status-chip" style="background: rgba(147, 51, 234, 0.15); color: #9333ea;">📅 Inspection Scheduled</span>';
        } else if (req.status === 'inspection_completed') {
          statusChip = '<span class="status-chip" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">📋 Inspection Completed</span>';
        } else if (req.status === 'sale_confirmed') {
          statusChip = '<span class="status-chip chip-approved">🎉 Sale Confirmed & Finalized</span>';
        } else if (req.status === 'cancelled') {
          statusChip = '<span class="status-chip chip-rejected">❌ Deal Cancelled</span>';
        }

        html += `
          <div class="my-property-card" style="align-items: flex-start;">
            <div>
              <img src="${req.property_image || '/images/hero_building.jpg'}" class="my-prop-img" onerror="this.src='/images/hero_building.jpg'">
            </div>

            <div style="flex: 1;">
              <div style="display: flex; gap: 8px; margin-bottom: 6px; align-items: center; flex-wrap: wrap;">
                ${statusChip}
                <span class="status-chip chip-type">Request #${req.id}</span>
                <span style="font-size: 0.8rem; color: var(--color-text-muted);">
                  Preferred Date: <strong>${escapeHtml(req.preferred_date || 'N/A')}</strong>
                </span>
              </div>

              <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px;">${escapeHtml(req.property_title || 'Untitled Property')}</h3>
              <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 8px;">
                📍 ${escapeHtml(req.property_location || 'N/A')} • Verified Seller: <strong>${escapeHtml(req.seller?.name || 'Seller')}</strong>
              </div>

              <div style="display: flex; gap: 16px; flex-wrap: wrap; background: var(--color-input); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 8px;">
                <div>Asking Price: <strong>${formatCurrency(req.property_price)}</strong></div>
                <div>Your Offer: <strong style="color: var(--color-brand); font-size: 0.95rem;">${formatCurrency(req.offered_amount)}</strong></div>
              </div>

              ${req.buyer_notes ? `
                <div style="font-size: 0.82rem; color: var(--color-text-muted); margin-bottom: 6px;">
                  <strong>Your Notes:</strong> ${escapeHtml(req.buyer_notes)}
                </div>
              ` : ''}

              ${req.seller_notes ? `
                <div style="font-size: 0.82rem; background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 6px 10px; margin-top: 6px;">
                  <strong>Seller Feedback:</strong> ${escapeHtml(req.seller_notes)}
                </div>
              ` : ''}

              ${req.inspection_scheduled_at ? `
                <div style="font-size: 0.85rem; background: rgba(99, 102, 241, 0.08); border-left: 3px solid #6366f1; padding: 8px 12px; margin-top: 6px; border-radius: 4px;">
                  <strong>📅 Physical Inspection Schedule:</strong> ${new Date(req.inspection_scheduled_at).toLocaleString()}
                  ${req.inspection_notes ? `<div style="font-size: 0.8rem; margin-top: 2px;">Notes: ${escapeHtml(req.inspection_notes)}</div>` : ''}
                </div>
              ` : ''}

              ${req.inspection_findings ? `
                <div style="font-size: 0.85rem; background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; padding: 8px 12px; margin-top: 6px; border-radius: 4px;">
                  <strong>📋 Verified Inspection Findings:</strong> ${escapeHtml(req.inspection_findings)}
                </div>
              ` : ''}

              ${req.cancellation_reason ? `
                <div style="font-size: 0.85rem; background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; padding: 8px 12px; margin-top: 6px; border-radius: 4px;">
                  <strong>Cancellation Reason:</strong> ${escapeHtml(req.cancellation_reason)}
                </div>
              ` : ''}
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; min-width: 130px;">
              <button class="btn btn-secondary btn-sm w-full" onclick="openPropertyDetailModal(${req.property_id})">
                View Property
              </button>
            </div>
          </div>
        `;
      });
      html += '</div>';

      container.innerHTML = html;
    } catch (err) {
      console.error('Buyer requests load error:', err);
      container.innerHTML = `
        <div class="state-box">
          <p style="color: var(--color-danger);">Failed to load your purchase requests (${escapeHtml(err.message)}).</p>
          <button class="btn btn-secondary btn-sm" onclick="loadMyRequests()">Retry</button>
        </div>
      `;
    }
  }

  static async openSellerRequestsModal(propId, propTitle) {
    const modal = document.getElementById('modal-seller-requests');
    const body = document.getElementById('seller-requests-modal-body');
    if (!modal || !body) return;

    if (window.closeAllModals) window.closeAllModals();
    modal.classList.add('active');

    body.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h4 style="font-size: 1.1rem; color: var(--color-brand);">${escapeHtml(propTitle)}</h4>
        <p style="font-size: 0.82rem; color: var(--color-text-muted);">
          Review incoming purchase offers and preferred inspection dates from genuine buyers.
          <br><strong>Locking Rule:</strong> You can forward ONE request to Admin for physical inspection at a time.
        </p>
      </div>
      <div class="state-box">
        <div class="spinner"></div>
        <p>Loading incoming requests...</p>
      </div>
    `;

    try {
      const response = await fetch(`/api/seller/requests?property_id=${propId}`, {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to load incoming requests');

      const result = await response.json();
      const requests = result.data || [];

      if (requests.length === 0) {
        body.innerHTML = `
          <div style="margin-bottom: 16px;">
            <h4 style="font-size: 1.1rem; color: var(--color-brand);">${escapeHtml(propTitle)}</h4>
          </div>
          <div class="state-box">
            <div class="state-icon">📭</div>
            <h3>No purchase requests received yet</h3>
            <p>When buyers submit an offer and inspection date, they will appear here for your approval.</p>
          </div>
        `;
        return;
      }

      const hasLockedRequest = requests.some(r => ['forwarded_to_admin', 'schedule_fixed', 'inspection_completed'].includes(r.status));

      let html = `
        <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <div>
            <h4 style="font-size: 1.1rem; color: var(--color-brand);">${escapeHtml(propTitle)}</h4>
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">${requests.length} total request(s) received</span>
          </div>
          ${hasLockedRequest ? `
            <span style="font-size: 0.78rem; background: rgba(99, 102, 241, 0.12); color: #6366f1; padding: 4px 10px; border-radius: 999px; font-weight: 600;">
              🔒 A request is currently with Admin for inspection
            </span>
          ` : ''}
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
      `;

      requests.forEach(r => {
        let statusBadge = '';
        if (r.status === 'pending_seller_approval') {
          statusBadge = '<span class="status-chip chip-pending">⏳ Needs Your Decision</span>';
        } else if (r.status === 'forwarded_to_admin') {
          statusBadge = '<span class="status-chip" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">🛡️ Forwarded to Admin</span>';
        } else if (r.status === 'schedule_fixed') {
          statusBadge = '<span class="status-chip" style="background: rgba(147, 51, 234, 0.15); color: #9333ea;">📅 Inspection Scheduled</span>';
        } else if (r.status === 'inspection_completed') {
          statusBadge = '<span class="status-chip" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">📋 Inspection Conducted</span>';
        } else if (r.status === 'sale_confirmed') {
          statusBadge = '<span class="status-chip chip-approved">🎉 Sale Confirmed</span>';
        } else if (r.status === 'declined_by_seller') {
          statusBadge = '<span class="status-chip chip-rejected">Declined</span>';
        } else if (r.status === 'cancelled') {
          statusBadge = '<span class="status-chip chip-rejected">Cancelled</span>';
        }

        html += `
          <div style="border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 14px; background: var(--color-surface);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
              <div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <strong style="font-size: 0.98rem;">${escapeHtml(r.buyer?.name || 'Verified Buyer')}</strong>
                  ${statusBadge}
                </div>
                <span style="font-size: 0.78rem; color: var(--color-text-muted);">
                  Requested Date: <strong>${escapeHtml(r.preferred_date || 'N/A')}</strong> • Submitted: ${new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.15rem; font-weight: 800; color: var(--color-brand);">${formatCurrency(r.offered_amount)}</div>
                <span style="font-size: 0.75rem; color: var(--color-text-muted);">Offered Amount</span>
              </div>
            </div>

            ${r.buyer_notes ? `
              <div style="font-size: 0.85rem; color: var(--color-text-muted); background: var(--color-input); padding: 8px 10px; border-radius: 6px; margin-bottom: 10px;">
                <strong>Buyer Note:</strong> ${escapeHtml(r.buyer_notes)}
              </div>
            ` : ''}

            ${r.status === 'pending_seller_approval' ? `
              <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px;">
                <button class="btn btn-secondary btn-sm" onclick="sellerDeclineRequest(${r.id}, ${propId}, '${escapeHtml(propTitle).replace(/'/g, "\\'")}')" style="color: var(--color-danger);">
                  Decline
                </button>
                <button class="btn btn-primary btn-sm" ${hasLockedRequest ? 'disabled title="Another request is already in inspection"' : ''} onclick="sellerForwardRequest(${r.id}, ${propId}, '${escapeHtml(propTitle).replace(/'/g, "\\'")}')">
                  ✓ Approve & Forward to Admin
                </button>
              </div>
            ` : ''}
          </div>
        `;
      });

      html += '</div>';
      body.innerHTML = html;
    } catch (err) {
      console.error('Seller requests load error:', err);
      body.innerHTML = `<div class="state-box"><p style="color: var(--color-danger);">${escapeHtml(err.message)}</p></div>`;
    }
  }

  static async sellerForwardRequest(requestId, propId, propTitle) {
    if (!confirm('Are you sure you want to approve this offer and forward to Admin to schedule physical inspection? This will lock this property for inspection.')) {
      return;
    }

    try {
      const response = await fetch(`/api/seller/requests/${requestId}/forward`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Request forwarded to Admin for inspection scheduling.', 'success');
        PropertyRequestsManager.openSellerRequestsModal(propId, propTitle);
        if (window.loadMyProperties) window.loadMyProperties();
      } else {
        showToast(data.message || 'Failed to forward request.', 'error');
      }
    } catch (err) {
      console.error('Forward request error:', err);
      showToast('Failed to forward request.', 'error');
    }
  }

  static async sellerDeclineRequest(requestId, propId, propTitle) {
    const reason = prompt('Optional reason for declining this offer (e.g. price too low):');
    if (reason === null) return;

    try {
      const response = await fetch(`/api/seller/requests/${requestId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ seller_notes: reason || null })
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Request declined.', 'info');
        PropertyRequestsManager.openSellerRequestsModal(propId, propTitle);
      } else {
        showToast(data.message || 'Failed to decline request.', 'error');
      }
    } catch (err) {
      console.error('Decline request error:', err);
      showToast('Failed to decline request.', 'error');
    }
  }

  static setupFormHandlers() {
    const purchaseForm = document.getElementById('form-purchase-request');
    if (purchaseForm) {
      purchaseForm.addEventListener('submit', PropertyRequestsManager.handlePurchaseRequestSubmit);
    }
  }
}
