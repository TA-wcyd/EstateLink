/**
 * MyProperties Module - Seller Dashboard & Management of Listed Properties
 */
import { state } from '../state';
import { formatCurrency, escapeHtml, showToast } from '../utils';

export class MyPropertiesManager {
  static async loadMyProperties() {
    const container = document.getElementById('my-properties-list-container');
    if (!container || !state.token) return;

    container.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <p>Loading your listed properties...</p>
      </div>
    `;

    try {
      const [propsRes, reqsRes] = await Promise.all([
        fetch('/api/my-properties', {
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Accept': 'application/json'
          }
        }),
        fetch('/api/seller/requests', {
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Accept': 'application/json'
          }
        }).catch(() => null)
      ]);

      if (!propsRes.ok) throw new Error('Failed to load listings');

      const data = await propsRes.json();
      const properties = data.properties || [];
      const summary = data.summary || { total: 0, approved: 0, pending: 0, rejected: 0 };

      let sellerRequests = [];
      if (reqsRes && reqsRes.ok) {
        const reqsData = await reqsRes.json();
        sellerRequests = reqsData.data || [];
      }

      const activeChatRequests = sellerRequests.filter(r => r.status === 'schedule_fixed' || r.status === 'inspection_completed');

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

      if (activeChatRequests.length > 0) {
        html += `
          <div class="active-chats-banner" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.12)); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div>
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--color-brand); margin-bottom: 2px; display: flex; align-items: center; gap: 6px;">
                  <span>💬</span> Active Buyer Chats & Confirmed Meetings
                </h3>
                <p style="font-size: 0.825rem; color: var(--color-text-muted);">Admin has confirmed the inspection schedule for these requests. You can chat directly with the buyer to coordinate the meeting!</p>
              </div>
              <span class="status-chip chip-approved" style="background: rgba(99, 102, 241, 0.2); color: #6366f1; border-color: rgba(99, 102, 241, 0.4);">
                ${activeChatRequests.length} Active Chat Room(s)
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${activeChatRequests.map(r => `
                <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                  <div>
                    <div style="font-weight: 700; font-size: 1rem; color: var(--color-text);">${escapeHtml(r.property_title || 'Property')}</div>
                    <div style="font-size: 0.825rem; color: var(--color-text-muted);">
                      Buyer: <strong>${escapeHtml(r.buyer?.name || 'Verified Buyer')}</strong> • Offered: <strong>${formatCurrency(r.offered_amount)}</strong>
                    </div>
                    <div style="font-size: 0.825rem; color: #6366f1; margin-top: 2px;">
                      📅 <strong>Meeting:</strong> ${r.inspection_scheduled_at ? new Date(r.inspection_scheduled_at).toLocaleString() : 'Scheduled Inspection'}
                    </div>
                  </div>
                  <button class="btn btn-primary btn-sm chat-open-btn"
                          data-request-id="${r.id}"
                          data-user-id="${state.user?.id || 0}"
                          data-property-title="${escapeHtml(r.property_title || 'Property')}"
                          data-inspection="${r.inspection_scheduled_at ? new Date(r.inspection_scheduled_at).toLocaleString() : 'Scheduled Inspection'}">
                    💬 Chat with Buyer
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      properties.forEach(p => {
        const fallbackImage = '/images/hero_building.jpg';
        const imageUrl = p.main_image || fallbackImage;
        const matchingChatReq = activeChatRequests.find(r => r.property_id === p.id);

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
                ${matchingChatReq ? `
                  <span class="status-chip" style="background: rgba(99, 102, 241, 0.15); color: #6366f1;">💬 Chat Unlocked</span>
                ` : ''}
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
                <button class="btn btn-secondary btn-sm w-full" onclick="openSellerRequestsModal(${p.id}, '${escapeHtml(p.title).replace(/'/g, "\\'")}')">
                  📥 Requests / Offers
                </button>
                ${matchingChatReq ? `
                  <button class="btn btn-primary btn-sm w-full chat-open-btn"
                          data-request-id="${matchingChatReq.id}"
                          data-user-id="${state.user?.id || 0}"
                          data-property-title="${escapeHtml(p.title)}"
                          data-inspection="${matchingChatReq.inspection_scheduled_at ? new Date(matchingChatReq.inspection_scheduled_at).toLocaleString() : 'Scheduled Meeting'}">
                    💬 Chat with Buyer
                  </button>
                ` : ''}
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
  }

  static async editProperty(id) {
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

      if (window.handlePropertyTypeChange) window.handlePropertyTypeChange();
      if (window.renderImagePreviews) window.renderImagePreviews();
      if (window.navigateTo) window.navigateTo('/sell-property');

    } catch (error) {
      showToast('Unable to edit property', 'error');
    }
  }

  static async resubmitProperty(id) {
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
        MyPropertiesManager.loadMyProperties();
      } else {
        showToast(data.message || 'Failed to resubmit', 'error');
      }
    } catch (error) {
      showToast('Failed to resubmit', 'error');
    }
  }

  static async deleteProperty(id) {
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
        MyPropertiesManager.loadMyProperties();
      } else {
        showToast('Failed to delete property.', 'error');
      }
    } catch (error) {
      showToast('Unable to delete property.', 'error');
    }
  }
}
