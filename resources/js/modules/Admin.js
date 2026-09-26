/**
 * Admin Module - Admin Verification Workflows, Document Auditing, Bidding Approvals & Global Inspection Queue
 */
import { state } from '../state';
import { formatCurrency, escapeHtml, renderPagination, showToast } from '../utils';

export class AdminManager {
  static async loadAdminPendingCount() {
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

      const inspRes = await fetch('/api/admin/requests/queue', {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });
      if (inspRes.ok) {
        const inspData = await inspRes.json();
        const inspCount = inspData.total || (inspData.data ? inspData.data.length : 0);
        const inspSpan = document.getElementById('admin-inspections-count');
        if (inspSpan) inspSpan.textContent = inspCount;
      }

      const repRes = await fetch('/api/admin/reports?status=pending', {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });
      if (repRes.ok) {
        const repData = await repRes.json();
        const repCount = repData.counts ? repData.counts.pending : 0;
        const repSpan = document.getElementById('admin-reports-count');
        if (repSpan) repSpan.textContent = repCount;
      }
    } catch (error) {
      console.warn('Unable to load admin pending counts:', error);
    }
  }

  static async loadAdminQueue(tab = 'pending', page = 1) {
    state.adminQueueTab = tab;
    const container = document.getElementById('admin-queue-container');
    const pagination = document.getElementById('admin-pagination-container');
    const btnPending = document.getElementById('btn-admin-tab-pending');
    const btnBidding = document.getElementById('btn-admin-tab-bidding');
    const btnInspections = document.getElementById('btn-admin-tab-inspections');
    const btnReports = document.getElementById('btn-admin-tab-reports');
    const btnUsers = document.getElementById('btn-admin-tab-users');
    const btnAll = document.getElementById('btn-admin-tab-all');

    if (!container || !state.token) return;

    btnPending?.classList.remove('btn-primary');
    btnPending?.classList.add('btn-secondary');
    btnBidding?.classList.remove('btn-primary');
    btnBidding?.classList.add('btn-secondary');
    btnInspections?.classList.remove('btn-primary');
    btnInspections?.classList.add('btn-secondary');
    btnReports?.classList.remove('btn-primary');
    btnReports?.classList.add('btn-secondary');
    btnUsers?.classList.remove('btn-primary');
    btnUsers?.classList.add('btn-secondary');
    btnAll?.classList.remove('btn-primary');
    btnAll?.classList.add('btn-secondary');

    if (tab === 'pending') {
      btnPending?.classList.remove('btn-secondary');
      btnPending?.classList.add('btn-primary');
    } else if (tab === 'bidding_requests') {
      btnBidding?.classList.remove('btn-secondary');
      btnBidding?.classList.add('btn-primary');
      return AdminManager.loadAdminBiddingRequests(page);
    } else if (tab === 'inspections') {
      btnInspections?.classList.remove('btn-secondary');
      btnInspections?.classList.add('btn-primary');
      return AdminManager.loadAdminInspectionQueue(page);
    } else if (tab === 'reports') {
      btnReports?.classList.remove('btn-secondary');
      btnReports?.classList.add('btn-primary');
      return AdminManager.loadAdminReports('pending');
    } else if (tab === 'users') {
      btnUsers?.classList.remove('btn-secondary');
      btnUsers?.classList.add('btn-primary');
      return AdminManager.loadAdminUsers();
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

      AdminManager.loadAdminPendingCount();

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
      renderPagination(result, pagination, (p) => AdminManager.loadAdminQueue(tab, p));

    } catch (error) {
      console.error('Admin queue error:', error);
    }
  }

  static async openAdminReviewModal(id) {
    const modal = document.getElementById('modal-admin-review');
    const body = document.getElementById('admin-review-body');
    if (!modal || !body) return;

    if (window.closeAllModals) window.closeAllModals();
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

        <!-- Photo Gallery -->
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
  }

  static viewAdminDocument(propertyId, documentId) {
    const token = state.token || localStorage.getItem('estatelink_token') || '';
    const url = `/api/admin/properties/${propertyId}/documents/${documentId}/download?view=1&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  }

  static async downloadAdminDocument(propertyId, documentId, optionalFilename) {
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
  }

  static async adminApproveProperty(id) {
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
        if (window.closeAllModals) window.closeAllModals();
        AdminManager.loadAdminQueue(state.adminQueueTab);
      } else {
        showToast(data.message || 'Approval failed', 'error');
      }
    } catch (error) {
      showToast('Unable to approve property', 'error');
    }
  }

  static openAdminRejectModal(id) {
    if (window.closeAllModals) window.closeAllModals();
    const modal = document.getElementById('modal-admin-reject');
    const idInput = document.getElementById('reject-property-id');
    const reasonInput = document.getElementById('reject-reason');
    if (modal && idInput) {
      idInput.value = id;
      if (reasonInput) reasonInput.value = '';
      modal.classList.add('active');
    }
  }

  static async loadAdminBiddingRequests(page = 1) {
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
      renderPagination(result, pagination, (p) => AdminManager.loadAdminBiddingRequests(p));
    } catch (err) {
      console.error('Admin bidding requests error:', err);
    }
  }

  static async adminApproveBidding(requestId) {
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
          if (window.loadAdminProfileCounters) window.loadAdminProfileCounters();
          if (window.loadProfileAdminTab) window.loadProfileAdminTab(state.profileAdminTab || 'bidding_requests');
        } else {
          AdminManager.loadAdminBiddingRequests();
        }
      }
    } catch (err) {
      console.error('Bidding approval error:', err);
      showToast('Network error during bidding approval.', 'error');
    }
  }

  static openAdminBiddingRejectModal(requestId) {
    const reqIdInput = document.getElementById('reject-bidding-request-id');
    if (reqIdInput) reqIdInput.value = requestId;
    const modal = document.getElementById('modal-admin-bidding-reject');
    if (modal) modal.classList.add('active');
  }

  static async handleAdminBiddingRejectSubmit(e) {
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
        if (window.closeAllModals) window.closeAllModals();
        if (document.getElementById('view-profile')?.classList.contains('active')) {
          if (window.loadAdminProfileCounters) window.loadAdminProfileCounters();
          if (window.loadProfileAdminTab) window.loadProfileAdminTab(state.profileAdminTab || 'bidding_requests');
        } else {
          AdminManager.loadAdminBiddingRequests();
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
  }

  static renderAdminInspectionQueueHtml(requests) {
    let html = '<div style="display: flex; flex-direction: column; gap: 14px;">';
    requests.forEach(req => {
      let statusChip = '';
      if (req.status === 'forwarded_to_admin') {
        statusChip = '<span class="status-chip" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">Step 3: Needs Inspection Schedule</span>';
      } else if (req.status === 'schedule_fixed') {
        statusChip = '<span class="status-chip" style="background: rgba(147, 51, 234, 0.15); color: #9333ea;">Step 4: Inspection Scheduled</span>';
      } else if (req.status === 'inspection_completed') {
        statusChip = '<span class="status-chip" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">Step 5: Inspection Done — Final Decision</span>';
      }

      html += `
        <div class="admin-review-card">
          <div class="admin-card-head" style="align-items: flex-start;">
            <div>
              <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px; flex-wrap: wrap;">
                ${statusChip}
                <span class="status-chip chip-type">Request #${req.id}</span>
              </div>
              <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 2px;">${escapeHtml(req.property_title || 'Untitled Property')}</h3>
              <div style="font-size: 0.85rem; color: var(--color-text-muted);">
                📍 ${escapeHtml(req.property_location || 'N/A')} • Buyer: <strong>${escapeHtml(req.buyer?.name || 'Buyer')}</strong> • Seller: <strong>${escapeHtml(req.seller?.name || 'Seller')}</strong>
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 1.25rem; font-weight: 800; color: var(--color-brand);">${formatCurrency(req.offered_amount)}</div>
              <span style="font-size: 0.78rem; color: var(--color-text-muted);">Offered (Asking: ${formatCurrency(req.property_price)})</span>
            </div>
          </div>

          <div style="background: var(--color-input); padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 12px; font-size: 0.85rem;">
            <div><strong>Buyer Preferred Date:</strong> ${escapeHtml(req.preferred_date || 'N/A')}</div>
            ${req.buyer_notes ? `<div><strong>Buyer Notes:</strong> ${escapeHtml(req.buyer_notes)}</div>` : ''}
            ${req.seller_notes ? `<div><strong>Seller Notes:</strong> ${escapeHtml(req.seller_notes)}</div>` : ''}
            ${req.inspection_scheduled_at ? `
              <div style="margin-top: 4px; color: #6366f1;">
                <strong>Fixed Inspection Time:</strong> ${new Date(req.inspection_scheduled_at).toLocaleString()}
                ${req.inspection_notes ? ` • Note: ${escapeHtml(req.inspection_notes)}` : ''}
              </div>
            ` : ''}
            ${req.inspection_findings ? `
              <div style="margin-top: 4px; color: #10b981;">
                <strong>Inspection Findings:</strong> ${escapeHtml(req.inspection_findings)}
              </div>
            ` : ''}
          </div>

          <!-- Sequential Workflow Actions -->
          <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;">
            ${(req.status === 'schedule_fixed' || req.status === 'inspection_completed') ? `
              <button class="btn btn-secondary btn-sm chat-open-btn"
                      data-request-id="${req.id}"
                      data-user-id="${state.user?.id || 0}"
                      data-property-title="${escapeHtml(req.property_title || 'Property')}"
                      data-inspection="${req.inspection_scheduled_at ? new Date(req.inspection_scheduled_at).toLocaleString() : 'Scheduled Inspection'}">
                💬 View Chat Logs
              </button>
            ` : ''}

            ${(req.status === 'forwarded_to_admin' || req.status === 'schedule_fixed') ? `
              <button class="btn btn-primary btn-sm" onclick="openAdminScheduleModal(${req.id})">
                📅 ${req.status === 'schedule_fixed' ? 'Reschedule Inspection' : 'Fix Schedule'}
              </button>
            ` : ''}

            ${req.status === 'schedule_fixed' ? `
              <button class="btn btn-primary btn-sm" onclick="openAdminCompleteInspectionModal(${req.id})" style="background: linear-gradient(135deg, #10b981, #059669);">
                📋 Record Inspection Findings
              </button>
            ` : ''}

            ${req.status === 'inspection_completed' ? `
              <button class="btn btn-primary btn-sm" onclick="adminConfirmSale(${req.id})" style="background: linear-gradient(135deg, #10b981, #047857);">
                ✓ Confirm Sale & Mark Sold
              </button>
            ` : ''}

            <button class="btn btn-secondary btn-sm" onclick="openAdminCancelDealModal(${req.id})" style="color: var(--color-danger);">
              ❌ Cancel Deal
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  static async loadAdminInspectionQueue(page = 1) {
    const container = document.getElementById('admin-queue-container');
    const pagination = document.getElementById('admin-pagination-container');
    if (!container || !state.token) return;

    container.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <p>Loading Global Inspection & Deal Queue...</p>
      </div>
    `;
    if (pagination) pagination.innerHTML = '';

    try {
      const response = await fetch(`/api/admin/requests/queue?page=${page}`, {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to load inspection queue');

      const result = await response.json();
      const requests = result.data || [];

      const inspectionsCountEl = document.getElementById('admin-inspections-count');
      if (inspectionsCountEl) inspectionsCountEl.textContent = result.total || requests.length;

      if (requests.length === 0) {
        container.innerHTML = `
          <div class="state-box">
            <div class="state-icon">🛡️</div>
            <h3>Inspection Queue is Empty</h3>
            <p>No purchase requests are currently awaiting inspection scheduling or sale confirmation.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = AdminManager.renderAdminInspectionQueueHtml(requests);
    } catch (err) {
      console.error('Inspection queue error:', err);
      container.innerHTML = `<div class="state-box"><p style="color: var(--color-danger);">${escapeHtml(err.message)}</p></div>`;
    }
  }

  static openAdminScheduleModal(requestId) {
    const modal = document.getElementById('modal-admin-schedule');
    if (!modal) return;

    document.getElementById('schedule-request-id').value = requestId;
    const datetimeInput = document.getElementById('schedule-datetime');
    if (datetimeInput) {
      const nextHour = new Date();
      nextHour.setDate(nextHour.getDate() + 1);
      nextHour.setHours(10, 0, 0, 0);
      datetimeInput.value = nextHour.toISOString().slice(0, 16);
    }

    if (window.closeAllModals) window.closeAllModals();
    modal.classList.add('active');
  }

  static async handleAdminScheduleSubmit(e) {
    e.preventDefault();
    const requestId = document.getElementById('schedule-request-id').value;
    const scheduledAt = document.getElementById('schedule-datetime').value;
    const notes = document.getElementById('schedule-notes').value;
    const submitBtn = document.getElementById('btn-confirm-schedule');

    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(`/api/admin/requests/${requestId}/schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          inspection_scheduled_at: scheduledAt,
          inspection_notes: notes || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Inspection schedule fixed!', 'success');
        if (window.closeAllModals) window.closeAllModals();
        AdminManager.refreshAdminViews();
      } else {
        showToast(data.message || 'Failed to fix schedule.', 'error');
      }
    } catch (err) {
      console.error('Schedule error:', err);
      showToast('Failed to fix schedule.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  static openAdminCompleteInspectionModal(requestId) {
    const modal = document.getElementById('modal-admin-complete-inspection');
    if (!modal) return;

    document.getElementById('complete-inspection-request-id').value = requestId;
    document.getElementById('inspection-findings-text').value = '';

    if (window.closeAllModals) window.closeAllModals();
    modal.classList.add('active');
  }

  static async handleAdminCompleteInspectionSubmit(e) {
    e.preventDefault();
    const requestId = document.getElementById('complete-inspection-request-id').value;
    const findings = document.getElementById('inspection-findings-text').value;
    const submitBtn = document.getElementById('btn-confirm-inspection-findings');

    if (!findings || findings.length < 5) {
      showToast('Please provide detailed findings (at least 5 characters).', 'error');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(`/api/admin/requests/${requestId}/complete-inspection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          inspection_findings: findings
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Inspection completed successfully!', 'success');
        if (window.closeAllModals) window.closeAllModals();
        AdminManager.refreshAdminViews();
      } else {
        showToast(data.message || 'Failed to record findings.', 'error');
      }
    } catch (err) {
      console.error('Inspection completion error:', err);
      showToast('Failed to record findings.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  static async adminConfirmSale(requestId) {
    if (!confirm('Are you sure you want to CONFIRM SALE for this property? This will mark the property as SOLD, record the final sale transaction, and complete the deal.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/requests/${requestId}/confirm-sale`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Sale confirmed! Property marked as SOLD.', 'success');
        AdminManager.refreshAdminViews();
      } else {
        showToast(data.message || 'Failed to confirm sale.', 'error');
      }
    } catch (err) {
      console.error('Confirm sale error:', err);
      showToast('Failed to confirm sale.', 'error');
    }
  }

  static openAdminCancelDealModal(requestId) {
    const modal = document.getElementById('modal-admin-cancel-deal');
    if (!modal) return;

    document.getElementById('cancel-deal-request-id').value = requestId;
    document.getElementById('cancel-deal-reason').value = '';

    if (window.closeAllModals) window.closeAllModals();
    modal.classList.add('active');
  }

  static async handleAdminCancelDealSubmit(e) {
    e.preventDefault();
    const requestId = document.getElementById('cancel-deal-request-id').value;
    const reason = document.getElementById('cancel-deal-reason').value;
    const submitBtn = document.getElementById('btn-confirm-cancel-deal');

    if (!reason || reason.length < 5) {
      showToast('Please provide a valid cancellation reason.', 'error');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch(`/api/admin/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          cancellation_reason: reason
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Deal cancelled. Property restored to available.', 'info');
        if (window.closeAllModals) window.closeAllModals();
        AdminManager.refreshAdminViews();
      } else {
        showToast(data.message || 'Failed to cancel deal.', 'error');
      }
    } catch (err) {
      console.error('Cancel deal error:', err);
      showToast('Failed to cancel deal.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  static refreshAdminViews() {
    AdminManager.loadAdminInspectionQueue();
    if (state.profileAdminTab === 'inspections' && window.loadProfileAdminTab) {
      window.loadProfileAdminTab('inspections');
    }
    if (window.loadAdminProfileCounters) window.loadAdminProfileCounters();
    AdminManager.loadAdminPendingCount();
  }

  static async loadAdminReports(filterStatus = 'pending') {
    const container = document.getElementById('admin-queue-container');
    const pagination = document.getElementById('admin-pagination-container');
    if (!container || !state.token) return;

    container.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <p>Loading submitted violation reports...</p>
      </div>
    `;
    if (pagination) pagination.innerHTML = '';

    try {
      const response = await fetch(`/api/admin/reports?status=${filterStatus}`, {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to load reports');

      const data = await response.json();
      const reports = data.reports || [];
      const counts = data.counts || { pending: 0, resolved_banned: 0, dismissed: 0, total: 0 };

      let html = `
        <div class="admin-reports-header mb-3 flex flex-between align-center">
          <div>
            <h3>🚩 User Policy Violation Reports</h3>
            <p class="text-sm text-muted">Review reports submitted by users, inspect proof attachments, and take enforcement actions.</p>
          </div>
          <div class="filter-pills flex gap-2">
            <button class="btn btn-sm ${filterStatus === 'pending' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminManager.loadAdminReports('pending')">Pending (${counts.pending})</button>
            <button class="btn btn-sm ${filterStatus === 'resolved_banned' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminManager.loadAdminReports('resolved_banned')">Banned (${counts.resolved_banned})</button>
            <button class="btn btn-sm ${filterStatus === 'dismissed' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminManager.loadAdminReports('dismissed')">Dismissed (${counts.dismissed})</button>
            <button class="btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="AdminManager.loadAdminReports('all')">All (${counts.total})</button>
          </div>
        </div>
      `;

      if (reports.length === 0) {
        html += `
          <div class="state-box">
            <div class="state-icon">✅</div>
            <h3>No ${filterStatus === 'all' ? '' : filterStatus} Reports Found</h3>
            <p>There are no submitted policy violation reports matching this filter.</p>
          </div>
        `;
      } else {
        html += `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Reporter</th>
                  <th>Reported User</th>
                  <th>Reason</th>
                  <th>Submitted</th>
                  <th>Proof Attachment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
        `;

        reports.forEach(r => {
          let statusBadge = '';
          if (r.status === 'pending') {
            statusBadge = '<span class="status-chip chip-pending">⏳ Pending Review</span>';
          } else if (r.status === 'resolved_banned') {
            statusBadge = '<span class="status-chip chip-rejected">⛔ User Banned</span>';
          } else {
            statusBadge = '<span class="status-chip" style="background:#f3f4f6; color:#6b7280;">✓ Dismissed</span>';
          }

          const reporterName = r.reporter ? escapeHtml(r.reporter.name) : 'Anonymous';
          const reportedName = r.reported_user ? escapeHtml(r.reported_user.name) : 'Unknown User';
          const dateStr = new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

          html += `
            <tr>
              <td>#${r.id}</td>
              <td>
                <span class="user-link" onclick="navigateTo('/user-profile/${r.reporter?.id}')">${reporterName}</span>
              </td>
              <td>
                <strong class="user-link" onclick="navigateTo('/user-profile/${r.reported_user?.id}')">${reportedName}</strong>
                ${r.reported_user?.is_banned ? ' <span class="badge-banned-sm">Banned</span>' : ''}
              </td>
              <td><span class="badge-reason">${escapeHtml(r.reason)}</span></td>
              <td>${dateStr}</td>
              <td>
                ${r.proof_url ? `<a href="${r.proof_url}" target="_blank" class="btn btn-xs btn-outline">📎 View Proof</a>` : '<span class="text-muted text-xs">No attachment</span>'}
              </td>
              <td>${statusBadge}</td>
              <td>
                <button class="btn btn-sm btn-primary" onclick="AdminManager.openAdminReportDetailModal(${r.id})">Review & Action</button>
              </td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;
      }

      container.innerHTML = html;
    } catch (err) {
      console.error('Error loading admin reports:', err);
      container.innerHTML = `
        <div class="state-box">
          <h3>Error Loading Reports</h3>
          <p>Unable to retrieve violation reports.</p>
        </div>
      `;
    }
  }

  static async openAdminReportDetailModal(reportId) {
    if (!state.token) return;

    if (window.closeAllModals) window.closeAllModals();

    const modal = document.getElementById('modal-admin-report-detail');
    const container = document.getElementById('admin-report-detail-content');

    if (!modal || !container) return;

    container.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <p>Fetching report evidence & user history...</p>
      </div>
    `;

    modal.classList.add('active');

    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Report details fetch failed');

      const data = await response.json();
      const report = data.report;
      const reportedUser = data.reported_user;

      let proofElementHtml = '<p class="text-muted">No proof document attached.</p>';
      if (report.proof_url) {
        if (report.proof_is_pdf) {
          proofElementHtml = `
            <div class="proof-box">
              <p>📄 <strong>PDF Evidence Document Attached</strong></p>
              <a href="${report.proof_url}" target="_blank" download class="btn btn-sm btn-primary mt-2">📥 Download / View PDF Evidence</a>
            </div>
          `;
        } else {
          proofElementHtml = `
            <div class="proof-box">
              <p>🖼️ <strong>Image Evidence Uploaded:</strong></p>
              <a href="${report.proof_url}" target="_blank">
                <img src="${report.proof_url}" alt="Report Evidence" style="max-width:100%; max-height:300px; border-radius:8px; margin-top:8px; border:1px solid var(--color-border);" />
              </a>
              <div class="text-xs text-muted mt-1">Click image to expand in new tab</div>
            </div>
          `;
        }
      }

      let actionsHtml = '';
      if (report.status === 'pending') {
        actionsHtml = `
          <div class="admin-action-box p-3 mt-4" style="background:var(--color-bg-alt); border-radius:8px;">
            <h4>⚡ Take Admin Action</h4>
            <div class="form-group mt-2">
              <label class="form-label">Audit Notes / Reason for Action (Optional)</label>
              <textarea id="admin-report-notes" class="form-control" placeholder="Enter notes or explanation for audit logs..."></textarea>
            </div>
            <div class="flex gap-3 mt-3">
              <button class="btn btn-danger" onclick="AdminManager.banUserFromReportAction(${report.id})">⛔ Permanently Ban User & Resolve</button>
              <button class="btn btn-secondary" onclick="AdminManager.dismissReportAction(${report.id})">✓ Dismiss False/Unverified Report</button>
            </div>
          </div>
        `;
      } else {
        actionsHtml = `
          <div class="admin-action-box p-3 mt-4" style="background:var(--color-bg-alt); border-radius:8px;">
            <h4>Report Action Record</h4>
            <p><strong>Status:</strong> ${report.status === 'resolved_banned' ? '⛔ Resolved (User Permanently Banned)' : '✓ Dismissed'}</p>
            <p><strong>Actioned By:</strong> ${report.actioned_by ? escapeHtml(report.actioned_by.name) : 'Admin'}</p>
            <p><strong>Notes:</strong> ${escapeHtml(report.admin_notes || 'None')}</p>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="report-detail-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
          <!-- Left: Violation Claim & Evidence -->
          <div>
            <h3>Report Details #${report.id}</h3>
            <div class="mb-3">
              <span class="text-muted">Reason Category:</span> <strong class="badge-reason">${escapeHtml(report.reason)}</strong>
            </div>

            <div class="mb-3">
              <label class="form-label">Reporter:</label>
              <div>
                <a href="javascript:void(0)" onclick="navigateTo('/user-profile/${report.reporter?.id}'); closeAllModals();"><strong>${escapeHtml(report.reporter?.name || 'Unknown')}</strong> (${escapeHtml(report.reporter?.email || '')})</a>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Violation Description:</label>
              <div class="p-3" style="background:var(--color-bg-alt); border-radius:8px; font-size:14px; white-space:pre-wrap;">${escapeHtml(report.description)}</div>
            </div>

            <div class="mb-3">
              <label class="form-label">Attached Evidence Proof:</label>
              ${proofElementHtml}
            </div>
          </div>

          <!-- Right: Reported User History & Profile -->
          <div>
            <h3>Reported User Profile History</h3>
            ${reportedUser ? `
              <div class="p-3" style="border:1px solid var(--color-border); border-radius:8px; background:var(--color-surface);">
                <h4>${escapeHtml(reportedUser.name)} ${reportedUser.is_banned ? '<span class="chip-rejected">⛔ BANNED</span>' : ''}</h4>
                <p class="text-sm"><strong>Email:</strong> ${escapeHtml(reportedUser.email)}</p>
                <p class="text-sm"><strong>Phone:</strong> ${escapeHtml(reportedUser.phone)}</p>
                <p class="text-sm"><strong>National ID:</strong> ${escapeHtml(reportedUser.national_id)}</p>
                <p class="text-sm"><strong>Role:</strong> ${escapeHtml(reportedUser.role)}</p>
                <p class="text-sm"><strong>Verification Status:</strong> ${escapeHtml(reportedUser.verification_status)}</p>
                <hr style="margin:10px 0; border:0; border-top:1px solid var(--color-border);" />
                <p class="text-sm"><strong>Listed Properties:</strong> ${reportedUser.total_properties}</p>
                <p class="text-sm"><strong>Total Reports Received:</strong> ${reportedUser.total_reports}</p>
                <div class="mt-2">
                  <a href="javascript:void(0)" class="btn btn-xs btn-outline" onclick="navigateTo('/user-profile/${reportedUser.id}'); closeAllModals();">View Full Public Profile</a>
                </div>
              </div>
            ` : '<p class="text-muted">Reported user record not available.</p>'}
          </div>
        </div>

        ${actionsHtml}
      `;
    } catch (err) {
      console.error('Failed to load report details:', err);
      container.innerHTML = `
        <div class="state-box">
          <h3>Error Loading Details</h3>
          <p>Could not load report evidence or user details.</p>
        </div>
      `;
    }
  }

  static async banUserFromReportAction(reportId) {
    if (!state.token) return;

    const notes = document.getElementById('admin-report-notes')?.value || '';

    if (!confirm('Are you sure you want to PERMANENTLY BAN this user? This will revoke all their active sessions and mark the user account as suspended.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/reports/${reportId}/ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          admin_notes: notes,
          ban_reason: 'Policy violation reported in Report #' + reportId
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'User permanently banned.', 'success');
        if (window.closeAllModals) window.closeAllModals();
        AdminManager.loadAdminReports('pending');
        AdminManager.loadAdminPendingCount();
      } else {
        showToast(data.message || 'Failed to ban user.', 'error');
      }
    } catch (err) {
      console.error('Ban action error:', err);
      showToast('Error communicating with server.', 'error');
    }
  }

  static async dismissReportAction(reportId) {
    if (!state.token) return;

    const notes = document.getElementById('admin-report-notes')?.value || '';

    try {
      const response = await fetch(`/api/admin/reports/${reportId}/dismiss`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ admin_notes: notes })
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Report dismissed.', 'info');
        if (window.closeAllModals) window.closeAllModals();
        AdminManager.loadAdminReports('pending');
        AdminManager.loadAdminPendingCount();
      } else {
        showToast(data.message || 'Failed to dismiss report.', 'error');
      }
    } catch (err) {
      console.error('Dismiss report error:', err);
      showToast('Error communicating with server.', 'error');
    }
  }

  static async loadAdminUsers(searchQuery = '') {
    const container = document.getElementById('admin-queue-container');
    const pagination = document.getElementById('admin-pagination-container');
    if (!container || !state.token) return;

    container.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <p>Loading user management directory...</p>
      </div>
    `;
    if (pagination) pagination.innerHTML = '';

    try {
      const url = searchQuery ? `/api/admin/users?search=${encodeURIComponent(searchQuery)}` : '/api/admin/users';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('User directory fetch failed');

      const data = await response.json();
      const users = data.users || [];

      let html = `
        <div class="admin-users-header mb-3 flex flex-between align-center flex-wrap gap-3">
          <div>
            <h3>👥 User Directory & Suspensions</h3>
            <p class="text-sm text-muted">Manage platform accounts, check verification statuses, and apply permanent bans.</p>
          </div>
          <div class="search-box">
            <input type="text" id="admin-user-search-input" class="form-control form-control-sm" placeholder="Search by name, email or phone..." value="${escapeHtml(searchQuery)}" onkeyup="if(event.key==='Enter') AdminManager.loadAdminUsers(this.value)" />
          </div>
        </div>
      `;

      if (users.length === 0) {
        html += `
          <div class="state-box">
            <p>No user accounts matched your query.</p>
          </div>
        `;
      } else {
        html += `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email / Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Reports Received</th>
                  <th>Properties</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
        `;

        users.forEach(u => {
          let statusBadge = '';
          if (u.is_banned) {
            statusBadge = '<span class="status-chip chip-rejected">⛔ Banned</span>';
          } else if (u.verification_status === 'verified') {
            statusBadge = '<span class="status-chip chip-approved">✓ Verified</span>';
          } else {
            statusBadge = '<span class="status-chip chip-pending">⏳ Pending</span>';
          }

          html += `
            <tr>
              <td>#${u.id}</td>
              <td>
                <strong class="user-link" onclick="navigateTo('/user-profile/${u.id}')">${escapeHtml(u.name)}</strong>
              </td>
              <td>
                <div class="text-sm">${escapeHtml(u.email)}</div>
                <div class="text-xs text-muted">${escapeHtml(u.phone)}</div>
              </td>
              <td><span class="status-chip">${escapeHtml(u.role)}</span></td>
              <td>${statusBadge}</td>
              <td><strong>${u.reports_received_count}</strong></td>
              <td>${u.properties_count}</td>
              <td>
                ${u.role === 'admin' ? '<span class="text-muted text-xs">System Admin</span>' : (
                  u.is_banned ? `
                    <button class="btn btn-xs btn-outline" onclick="AdminManager.directUnbanUserAction(${u.id})">Unban Account</button>
                  ` : `
                    <button class="btn btn-xs btn-danger" onclick="AdminManager.directBanUserAction(${u.id})">⛔ Ban User</button>
                  `
                )}
              </td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;
      }

      container.innerHTML = html;
    } catch (err) {
      console.error('Error loading admin users:', err);
      container.innerHTML = `
        <div class="state-box">
          <h3>Error Loading Users</h3>
          <p>Unable to retrieve user directory.</p>
        </div>
      `;
    }
  }

  static async directBanUserAction(userId) {
    if (!state.token) return;

    const reason = prompt('Enter the reason for permanently banning this user account:');
    if (!reason || !reason.trim()) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ ban_reason: reason.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'User account has been banned.', 'success');
        AdminManager.loadAdminUsers();
      } else {
        showToast(data.message || 'Failed to ban user.', 'error');
      }
    } catch (err) {
      console.error('Direct ban error:', err);
      showToast('Error communicating with server.', 'error');
    }
  }

  static async directUnbanUserAction(userId) {
    if (!state.token) return;

    if (!confirm('Are you sure you want to UNBAN this user account and restore access?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'User account unbanned successfully.', 'info');
        AdminManager.loadAdminUsers();
      } else {
        showToast(data.message || 'Failed to unban user.', 'error');
      }
    } catch (err) {
      console.error('Direct unban error:', err);
      showToast('Error communicating with server.', 'error');
    }
  }

  static setupAdminFormHandlers() {
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
            if (window.closeAllModals) window.closeAllModals();
            AdminManager.loadAdminQueue(state.adminQueueTab);
          } else {
            showToast(data.message || 'Rejection failed', 'error');
          }
        } catch (error) {
          showToast('Error rejecting property', 'error');
        }
      });
    }
  }
}
