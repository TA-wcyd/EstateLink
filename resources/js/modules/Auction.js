/**
 * Auction Module - Live Auction Stream, Real-Time Polling, Bidding Ledger, Seller Decisions & Buyer Bid History
 */
import { state } from '../state';
import { formatCurrency, escapeHtml, showToast } from '../utils';

export class AuctionManager {
  static async loadLiveAuctionForDetail(propertyId, propertyData) {
    const container = document.getElementById('property-auction-container');
    if (!container) return;

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
        AuctionManager.renderAuctionSection(container, data, propertyData || data.property);
      } catch (err) {
        console.warn('Auction polling fetch error:', err);
        container.innerHTML = `
          <div style="background: var(--color-input); border-radius: var(--radius-md); padding: 14px 18px; font-size: 0.85rem; color: var(--color-text-muted);">
            📋 Standard Verified Listing — Fixed Price & Direct Inquiries Available.
          </div>
        `;
      }
    }

    await fetchAndRender();

    state.auctionPollingInterval = setInterval(() => {
      const modal = document.getElementById('modal-property-detail');
      if (modal && modal.classList.contains('active')) {
        fetchAndRender();
      } else {
        clearInterval(state.auctionPollingInterval);
        state.auctionPollingInterval = null;
      }
    }, 3500);
  }

  static renderAuctionSection(container, data, prop) {
    if (!container) return;

    const property = prop || data?.property || {};
    const viewer = data?.viewer || {};
    const isOwner = state.user && (
      state.user.id === property.user_id || 
      state.user.id === property.user?.id || 
      state.user.id === property.seller?.id ||
      viewer.is_seller === true
    );

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

    if (a.is_active && a.end_time) {
      AuctionManager.startAuctionCountdown(a.end_time);
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

        <!-- Buyer Live Bid Form -->
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

  static startAuctionCountdown(endTimeStr) {
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

  static quickAdjustBid(delta) {
    const input = document.getElementById('input-bid-amount');
    if (!input) return;
    const current = parseFloat(input.value) || 0;
    input.value = current + delta;
  }

  static async placeLiveBid(auctionId) {
    if (!state.token || !state.user) {
      showToast('Please sign in to place a bid.', 'info');
      if (window.openAuthModal) window.openAuthModal('login', 'user');
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
        if (state.activeAuctionData?.auction?.property_id) {
          AuctionManager.loadLiveAuctionForDetail(state.activeAuctionData.auction.property_id);
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
  }

  static openBiddingRequestModal(propertyId, suggestedPrice = 1000000) {
    if (!state.token || !state.user) {
      showToast('Please sign in to request an auction.', 'info');
      if (window.openAuthModal) window.openAuthModal('login', 'user');
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
  }

  static async handleBiddingRequestSubmit(e) {
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
        if (window.closeAllModals) window.closeAllModals();
        if (window.loadMyProperties) window.loadMyProperties();
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
  }

  static async acceptWinningBid(auctionId) {
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
          AuctionManager.loadLiveAuctionForDetail(state.activeAuctionData.auction.property_id);
        }
      }
    } catch (err) {
      console.error('Accept winning bid error:', err);
      showToast('Network error while accepting winning bid.', 'error');
    }
  }

  static async declineWinningBid(auctionId) {
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
          AuctionManager.loadLiveAuctionForDetail(state.activeAuctionData.auction.property_id);
        }
      }
    } catch (err) {
      console.error('Decline winning bid error:', err);
      showToast('Network error while declining winning bid.', 'error');
    }
  }

  static async loadMyBids() {
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
  }
}
