/**
 * Profile Module - User Profile Page, Edit Profile, User Submissions & Admin Profile Hubs
 */
import { state } from '../state';
import { formatCurrency, escapeHtml, renderPagination, showToast } from '../utils';

export class ProfileManager {
  static async loadProfilePage() {
    if (!state.token || !state.user) {
      if (window.navigateTo) window.navigateTo('/');
      return;
    }

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

    ProfileManager.toggleProfileEdit(false);

    if (user.role === 'admin') {
      ProfileManager.setupAdminProfileHub();
    } else {
      ProfileManager.setupStandardProfileHub();
      await ProfileManager.loadProfileSubmissions();
    }
  }

  static setupStandardProfileHub() {
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

  static async setupAdminProfileHub() {
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
        <div class="profile-stat-box" onclick="loadProfileAdminTab('inspections')" style="cursor: pointer; border-left: 3px solid #10b981;">
          <div class="profile-stat-val" id="prof-adm-stat-inspections" style="color: #10b981;">0</div>
          <div class="profile-stat-lbl">🔍 Inspections & Deals</div>
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
        <button class="sub-tab-btn" id="prof-adm-tab-inspections" onclick="loadProfileAdminTab('inspections')">🔍 Inspections & Sales (<span id="prof-adm-cnt-inspections">0</span>)</button>
        <button class="sub-tab-btn" id="prof-adm-tab-all" onclick="loadProfileAdminTab('all')">📋 All Properties</button>
        <button class="sub-tab-btn" id="prof-adm-tab-my" onclick="loadProfileAdminTab('my_properties')">📁 My Personal Posts</button>
      `;
    }

    ProfileManager.loadAdminProfileCounters();

    const currentTab = state.profileAdminTab || 'pending';
    await ProfileManager.loadProfileAdminTab(currentTab, 1);
  }

  static async loadAdminProfileCounters() {
    if (!state.token) return;
    try {
      const [pendingRes, biddingRes, inspRes, allRes, myRes] = await Promise.all([
        fetch('/api/admin/properties/pending', { headers: { 'Authorization': `Bearer ${state.token}`, 'Accept': 'application/json' } }),
        fetch('/api/admin/bidding-requests', { headers: { 'Authorization': `Bearer ${state.token}`, 'Accept': 'application/json' } }),
        fetch('/api/admin/requests/queue', { headers: { 'Authorization': `Bearer ${state.token}`, 'Accept': 'application/json' } }),
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

      if (inspRes.ok) {
        const iData = await inspRes.json();
        const iCount = iData.total || (iData.data ? iData.data.length : 0);
        const statEl = document.getElementById('prof-adm-stat-inspections');
        const cntEl = document.getElementById('prof-adm-cnt-inspections');
        if (statEl) statEl.textContent = iCount;
        if (cntEl) cntEl.textContent = iCount;
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

  static async loadProfileAdminTab(tab = 'pending', page = 1) {
    state.profileAdminTab = tab;
    const container = document.getElementById('profile-properties-container');
    const pagination = document.getElementById('profile-pagination-container');
    if (!container || !state.token) return;

    document.querySelectorAll('#prof-tabs-wrap .sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeTabKey = tab === 'bidding_requests' ? 'bidding' : (tab === 'my_properties' ? 'my' : (tab === 'inspections' ? 'inspections' : tab));
    document.getElementById(`prof-adm-tab-${activeTabKey}`)?.classList.add('active');

    if (pagination) pagination.innerHTML = '';

    if (tab === 'my_properties') {
      return ProfileManager.loadProfileSubmissions();
    }

    container.innerHTML = `
      <div class="state-box">
        <div class="spinner"></div>
        <p>Loading admin queue (${tab.replace('_', ' ')})...</p>
      </div>
    `;

    if (tab === 'inspections') {
      try {
        const res = await fetch(`/api/admin/requests/queue?page=${page}`, {
          headers: {
            'Authorization': `Bearer ${state.token}`,
            'Accept': 'application/json'
          }
        });

        if (!res.ok) throw new Error('Failed to load inspection queue');

        const result = await res.json();
        const requests = result.data || [];

        const statEl = document.getElementById('prof-adm-stat-inspections');
        const cntEl = document.getElementById('prof-adm-cnt-inspections');
        const count = result.total || requests.length;
        if (statEl) statEl.textContent = count;
        if (cntEl) cntEl.textContent = count;

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

        if (window.renderAdminInspectionQueueHtml) {
          container.innerHTML = window.renderAdminInspectionQueueHtml(requests);
        }
        return;
      } catch (err) {
        console.error('Inspection queue error:', err);
        container.innerHTML = `<div class="state-box"><p style="color: var(--color-danger);">${escapeHtml(err.message)}</p></div>`;
        return;
      }
    }

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
        renderPagination(result, pagination, (p) => ProfileManager.loadProfileAdminTab('bidding_requests', p));
      } catch (err) {
        console.error('Admin profile bidding error:', err);
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
              <button class="btn btn-secondary btn-sm w-full" onclick="openAdminReviewModal(${p.id})">
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
      renderPagination(result, pagination, (p) => ProfileManager.loadProfileAdminTab(tab, p));
    } catch (err) {
      console.error('Admin profile properties error:', err);
    }
  }

  static toggleProfileEdit(isEditing) {
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
  }

  static async handleProfileUpdate(event) {
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
        if (window.initAuthSession) window.initAuthSession();
        ProfileManager.loadProfilePage();
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
  }

  static async loadProfileSubmissions() {
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

      ProfileManager.renderProfileSubmissionsList();
    } catch (error) {
      container.innerHTML = `
        <div class="state-box">
          <p style="color: var(--color-danger);">Failed to load your submissions.</p>
          <button class="btn btn-secondary btn-sm" onclick="loadProfileSubmissions()">Retry</button>
        </div>
      `;
    }
  }

  static filterProfileProperties(filter) {
    state.profileSubmissionsTab = filter;
    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`prof-tab-${filter}`)?.classList.add('active');
    ProfileManager.renderProfileSubmissionsList();
  }

  static renderProfileSubmissionsList() {
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
}
