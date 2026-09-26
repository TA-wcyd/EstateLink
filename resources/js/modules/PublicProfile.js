/**
 * PublicProfile Module - Public User Profile, User Activity & Violation Reporting
 */
import { state } from '../state';
import { formatCurrency, escapeHtml, showToast } from '../utils';

export class PublicProfileManager {
  static async loadPublicProfile(userId) {
    const container = document.getElementById('public-profile-container');
    if (!container) return;

    container.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <p>Loading user profile & public activity...</p>
      </div>
    `;

    try {
      const headers = { 'Accept': 'application/json' };
      if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
      }

      const response = await fetch(`/api/users/${userId}/public-profile`, { headers });
      
      if (!response.ok) {
        if (response.status === 404) {
          container.innerHTML = `
            <div class="state-box">
              <h3>User Profile Not Found</h3>
              <p>The user profile you are looking for does not exist or has been removed.</p>
              <button class="btn btn-secondary mt-3" onclick="navigateTo('/properties')">Browse Properties</button>
            </div>
          `;
        } else {
          container.innerHTML = `
            <div class="state-box">
              <h3>Error Loading Profile</h3>
              <p>Unable to retrieve profile information at this time.</p>
            </div>
          `;
        }
        return;
      }

      const data = await response.json();
      const user = data.user;
      const stats = data.stats;
      const properties = data.properties || [];
      const isOwnProfile = data.is_own_profile;
      const canReport = data.can_report;

      const initials = user.name
        ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';

      const joinedDate = user.created_at
        ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Member';

      let statusBadgeHtml = '';
      if (user.is_banned) {
        statusBadgeHtml = '<span class="status-chip chip-banned" style="background:#fef2f2; color:#dc2626; border:1px solid #fca5a5;">⛔ Account Suspended</span>';
      } else if (user.is_verified) {
        statusBadgeHtml = '<span class="status-chip chip-approved">✓ NID Verified Owner/Agent</span>';
      } else {
        statusBadgeHtml = '<span class="status-chip chip-pending">⏳ Verification Pending</span>';
      }

      let roleBadgeHtml = '';
      if (user.role === 'admin') {
        roleBadgeHtml = '<span class="status-chip" style="background:#e0e7ff; color:#4338ca;">★ Administrator</span>';
      } else {
        roleBadgeHtml = `<span class="status-chip" style="background:#f3f4f6; color:#374151;">👤 ${user.company_name ? 'Real Estate Agency' : 'Registered Member'}</span>`;
      }

      let reportButtonHtml = '';
      if (user.is_banned) {
        reportButtonHtml = `<div class="badge-banned-notice">This account is permanently suspended for policy violations.</div>`;
      } else {
        reportButtonHtml = `
          <button class="btn btn-report-danger btn-sm" onclick="PublicProfileManager.openReportModal(${user.id}, '${escapeHtml(user.name)}')">
            🚩 Report User to Admin
          </button>
        `;
      }

      let adminActionHtml = '';
      if (state.user && state.user.role === 'admin' && !user.is_banned && user.role !== 'admin') {
        adminActionHtml = `
          <div class="card mt-4 p-4" style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); border-radius: var(--radius-lg);">
            <h4 style="color:#ef4444; margin-bottom:8px; font-weight:700;">🛡️ Admin Enforcement Control</h4>
            <p class="text-sm text-muted mb-2">As an administrator, you can immediately suspend this user account.</p>
            <div class="flex gap-2">
              <input type="text" id="profile-admin-ban-reason" class="form-control form-control-sm" placeholder="Enter reason for permanent ban..." style="flex:1;">
              <button class="btn btn-danger btn-sm" onclick="AdminManager.directBanUserAction(${user.id}, document.getElementById('profile-admin-ban-reason')?.value)">⛔ Ban User Account</button>
            </div>
          </div>
        `;
      }

      let propertiesHtml = '';
      if (properties.length === 0) {
        propertiesHtml = `
          <div class="empty-state-card" style="grid-column: 1 / -1; padding: 40px; text-align: center; background: var(--color-bg-alt); border-radius: 12px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🏠</div>
            <p style="color: var(--color-text-muted); font-weight: 500;">No active public property listings available.</p>
          </div>
        `;
      } else {
        propertiesHtml = properties.map(prop => `
          <div class="property-card" onclick="openPropertyDetailModal(${prop.id})">
            <div class="property-card-image" style="position: relative; height: 180px; overflow: hidden; background: #0f172a;">
              <img src="${prop.cover_image || '/images/hero_building.jpg'}" alt="${escapeHtml(prop.title)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/images/hero_building.jpg'">
              <span class="status-chip chip-type" style="position: absolute; top: 10px; left: 10px;">${escapeHtml(prop.property_type)}</span>
            </div>
            <div class="property-card-content" style="padding: 16px;">
              <div class="property-price" style="font-size: 1.25rem; font-weight: 800; color: var(--color-brand);">${formatCurrency(prop.price)}</div>
              <h4 class="property-title" style="font-size: 1.05rem; margin: 4px 0 8px 0;">${escapeHtml(prop.title)}</h4>
              <p class="property-address" style="font-size: 0.85rem; color: var(--color-text-muted);">📍 ${escapeHtml(prop.location || '')} ${prop.address ? '• ' + escapeHtml(prop.address) : ''}</p>
              <div class="property-specs" style="display: flex; gap: 12px; margin-top: 10px; font-size: 0.8rem; color: var(--color-text-muted);">
                ${prop.bedrooms !== null ? `<span>🛏️ ${prop.bedrooms} Beds</span>` : ''}
                ${prop.bathrooms !== null ? `<span>🚿 ${prop.bathrooms} Baths</span>` : ''}
                <span>📐 ${prop.size || 0} sqft</span>
              </div>
            </div>
          </div>
        `).join('');
      }

      container.innerHTML = `
        <!-- Public Profile Hero Banner -->
        <div class="public-profile-header card">
          <div class="public-profile-avatar-wrap">
            <div class="public-profile-avatar ${user.role === 'admin' ? 'avatar-admin' : ''}">${initials}</div>
          </div>
          <div class="public-profile-info">
            <div class="public-profile-title-row">
              <h2 class="profile-name">${escapeHtml(user.name)}</h2>
              <div class="profile-badges">
                ${statusBadgeHtml}
                ${roleBadgeHtml}
              </div>
            </div>

            ${user.company_name ? `<p class="profile-company">🏢 <strong>${escapeHtml(user.company_name)}</strong></p>` : ''}
            
            <div class="profile-meta">
              <span>🗓️ Member since ${joinedDate}</span>
              ${user.phone ? `<span>📞 ${escapeHtml(user.phone)}</span>` : ''}
              ${user.facebook_url ? `<span>🌐 <a href="${escapeHtml(user.facebook_url)}" target="_blank" rel="noopener">Facebook Profile</a></span>` : ''}
            </div>
          </div>

          <div class="public-profile-actions">
            ${reportButtonHtml}
          </div>
        </div>

        ${adminActionHtml}

        <!-- Report User to Admin Inline Text Bar Section -->
        ${!user.is_banned ? `
          <div class="card mt-4 p-4" style="background: var(--color-surface); border: 1px solid rgba(239,68,68,0.25); border-radius: var(--radius-lg);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
              <h4 style="font-size: 1.1rem; color: #ef4444; margin:0; display:flex; align-items:center; gap:8px; font-weight:700;">
                <span>🚩</span> <span>Report User to Admin</span>
              </h4>
              <span class="text-xs text-muted">Admin Audited & Confidential</span>
            </div>
            <form onsubmit="PublicProfileManager.submitInlineReport(event, ${user.id}, '${escapeHtml(user.name)}')">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                  <label class="form-label" style="font-size:0.8rem; font-weight:600;">Violation Reason *</label>
                  <select id="inline-report-reason-${user.id}" class="form-control" required style="width:100%; padding:8px 12px; background:var(--color-input); border:1px solid var(--color-border); border-radius:6px; color:var(--color-text);">
                    <option value="Fraud/Scam">Fraud / Scam Activity</option>
                    <option value="Fake Listing">Fake / Misleading Listing</option>
                    <option value="Abusive Behavior">Abusive Behavior / Harassment</option>
                    <option value="Impersonation">Impersonation / Unauthorized Agent</option>
                    <option value="Other">Other Policy Violation</option>
                  </select>
                </div>
                <div>
                  <label class="form-label" style="font-size:0.8rem; font-weight:600;">Proof Attachment (Optional - Max 5MB)</label>
                  <input type="file" id="inline-report-proof-${user.id}" accept="image/jpeg,image/png,image/webp,application/pdf" class="form-control" style="width:100%; padding:6px 12px; background:var(--color-input); border:1px solid var(--color-border); border-radius:6px; font-size:0.8rem; color:var(--color-text);">
                </div>
              </div>
              <div style="margin-bottom:12px;">
                <label class="form-label" style="font-size:0.8rem; font-weight:600;">Detailed Explanation Text *</label>
                <textarea id="inline-report-description-${user.id}" class="form-control" placeholder="Type detailed explanation of the violation for Admin review (at least 10 characters)..." required style="width:100%; min-height:85px; padding:10px; background:var(--color-input); border:1px solid var(--color-border); border-radius:6px; color:var(--color-text); font-size:0.88rem;"></textarea>
              </div>
              <div style="display:flex; justify-content:flex-end;">
                <button type="submit" class="btn btn-danger btn-sm" id="btn-inline-submit-${user.id}" style="font-weight:700;">
                  🚨 Submit Report to Admin
                </button>
              </div>
            </form>
          </div>
        ` : ''}

        <!-- Activity & Stats Strip -->
        <div class="profile-stats-grid mt-4">
          <div class="stat-card">
            <div class="stat-value">${stats.total_listings}</div>
            <div class="stat-label">Active Listings</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.completed_sales}</div>
            <div class="stat-label">Verified Sales</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.completed_purchases}</div>
            <div class="stat-label">Verified Purchases</div>
          </div>
        </div>

        <!-- Public Listings Section -->
        <div class="public-listings-section mt-5">
          <div class="section-header" style="margin-bottom: 20px;">
            <h3>Public Property Listings</h3>
            <p class="text-sm text-muted">Audited and approved properties listed by ${escapeHtml(user.name)}.</p>
          </div>

          <div class="properties-grid">
            ${propertiesHtml}
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Failed to load public profile:', error);
      container.innerHTML = `
        <div class="state-box">
          <h3>Connection Error</h3>
          <p>Unable to load user profile. Please check your internet connection.</p>
        </div>
      `;
    }
  }

  static openReportModal(userId, userName) {
    if (!state.token || !state.user) {
      showToast('Please sign in to report policy violations.', 'info');
      if (window.openAuthModal) window.openAuthModal('login', 'user');
      return;
    }

    const modal = document.getElementById('modal-report-user');
    const inputReportedId = document.getElementById('report-reported-user-id');
    const inputReportedName = document.getElementById('report-reported-user-name');
    const inputReason = document.getElementById('report-reason');
    const inputDescription = document.getElementById('report-description');
    const inputProof = document.getElementById('report-proof-file');

    if (!modal) return;

    if (inputReportedId) inputReportedId.value = userId;
    if (inputReportedName) inputReportedName.value = userName || `User #${userId}`;
    if (inputReason) inputReason.selectedIndex = 0;
    if (inputDescription) inputDescription.value = '';
    if (inputProof) inputProof.value = '';

    const previewContainer = document.getElementById('report-proof-preview');
    if (previewContainer) previewContainer.innerHTML = '';

    modal.classList.add('active');
  }

  static closeReportModal() {
    const modal = document.getElementById('modal-report-user');
    if (modal) modal.classList.remove('active');
  }

  static async submitReport(event) {
    event.preventDefault();
    if (!state.token) {
      showToast('Session expired. Please sign in again.', 'error');
      return;
    }

    const userId = document.getElementById('report-reported-user-id')?.value;
    const reason = document.getElementById('report-reason')?.value;
    const description = document.getElementById('report-description')?.value;
    const proofFile = document.getElementById('report-proof-file')?.files[0];
    const submitBtn = document.getElementById('btn-submit-report');

    if (!userId || !reason || !description) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    if (description.length < 10) {
      showToast('Description must be at least 10 characters detailing the violation.', 'error');
      return;
    }

    if (proofFile && proofFile.size > 5 * 1024 * 1024) {
      showToast('Proof attachment must be under 5MB.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('reported_user_id', userId);
    formData.append('reason', reason);
    formData.append('description', description);
    if (proofFile) {
      formData.append('proof', proofFile);
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Report...';
    }

    try {
      const response = await fetch('/api/user-reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Report submitted successfully.', 'success');
        PublicProfileManager.closeReportModal();
      } else {
        showToast(data.message || 'Failed to submit report.', 'error');
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      showToast('Server error while submitting report. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report for Review';
      }
    }
  }

  static async submitInlineReport(event, userId, userName) {
    event.preventDefault();
    if (!state.token || !state.user) {
      showToast('Please sign in to submit a report to admin.', 'info');
      if (window.openAuthModal) window.openAuthModal('login', 'user');
      return;
    }

    const reason = document.getElementById(`inline-report-reason-${userId}`)?.value;
    const description = document.getElementById(`inline-report-description-${userId}`)?.value;
    const proofFile = document.getElementById(`inline-report-proof-${userId}`)?.files[0];
    const submitBtn = document.getElementById(`btn-inline-submit-${userId}`);

    if (!reason || !description) {
      showToast('Please select a violation reason and type your explanation.', 'error');
      return;
    }

    if (description.length < 10) {
      showToast('Description must be at least 10 characters detailing the violation.', 'error');
      return;
    }

    if (proofFile && proofFile.size > 5 * 1024 * 1024) {
      showToast('Proof attachment must be under 5MB.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('reported_user_id', userId);
    formData.append('reason', reason);
    formData.append('description', description);
    if (proofFile) {
      formData.append('proof', proofFile);
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Report...';
    }

    try {
      const response = await fetch('/api/user-reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Accept': 'application/json'
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || 'Report submitted successfully to Admin!', 'success');
        const descEl = document.getElementById(`inline-report-description-${userId}`);
        const fileEl = document.getElementById(`inline-report-proof-${userId}`);
        if (descEl) descEl.value = '';
        if (fileEl) fileEl.value = '';
      } else {
        showToast(data.message || 'Failed to submit report.', 'error');
      }
    } catch (err) {
      console.error('Error submitting inline report:', err);
      showToast('Server error while submitting report.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚨 Submit Report to Admin';
      }
    }
  }
}
