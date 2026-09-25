{{-- Side-by-Side Property Comparison Matrix & Decision Engine --}}
<div class="compare-page-wrapper" id="compare-page-content">

    {{-- Top Action Toolbar --}}
    <div class="compare-toolbar">
        <div class="toolbar-left">
            <button class="btn btn-secondary btn-sm" onclick="window.navigateTo('/properties')">
                ← Back to Properties
            </button>
            <h2 class="compare-page-header-title">⚖️ Side-by-Side Comparison</h2>
        </div>

        <div class="toolbar-right">
            {{-- Highlight Differences Toggle --}}
            <label class="toggle-switch-label">
                <input type="checkbox" id="toggle-highlight-diffs" onchange="window.toggleHighlightDifferences(this.checked)">
                <span class="toggle-slider"></span>
                <span class="toggle-text">⚡ Highlight Differences</span>
            </label>

            {{-- Share Link Button --}}
            <button class="btn btn-secondary btn-sm" onclick="window.copyComparisonShareLink()" title="Copy comparison link">
                🔗 Share Link
            </button>

            {{-- Print / Export PDF --}}
            <button class="btn btn-secondary btn-sm" onclick="window.printComparisonSheet()" title="Print comparison sheet">
                🖨️ Print / PDF
            </button>

            {{-- Add Property --}}
            <button class="btn btn-primary btn-sm" onclick="window.openAddToCompareModal()">
                + Add Property
            </button>
        </div>
    </div>

    {{-- Dynamic Matrix Render Target — JS writes the table or empty state here --}}
    <div id="compare-matrix-wrap" style="margin-bottom: 32px;">
        {{-- Populated dynamically via Comparator.js loadComparisonPage() --}}
        <div style="text-align:center; padding: 60px 20px;">
            <div style="font-size: 3.5rem; margin-bottom: 16px;">⚖️</div>
            <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 8px;">No Properties Selected</h2>
            <p style="color: var(--color-text-muted); max-width: 500px; margin: 0 auto 24px;">
                Click <strong>+ Compare</strong> on any verified property card, then click <strong>Compare Now</strong> in the dock below.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-primary btn-lg" onclick="window.navigateTo('/properties')">
                    🔍 Browse Properties
                </button>
                <button class="btn btn-secondary btn-lg" onclick="window.openAddToCompareModal()">
                    + Add by Search
                </button>
            </div>
        </div>
    </div>

    {{-- Smart Buyer Decision Assistant — shown after properties are loaded --}}
    <div class="decision-assistant-container" id="decision-assistant-container" style="display: none;">
        <div class="decision-header">
            <div class="pill-tag"><span>🤖</span><span>Smart Buyer Decision Engine</span></div>
            <h3 class="decision-title">Smart Buyer Recommendation Assistant</h3>
            <p class="decision-subtitle">Personalized "If This, Then That" guidance tailored to your top priority</p>

            {{-- Filter Pills --}}
            <div class="decision-filter-pills" id="decision-filter-pills">
                <button class="pill-btn active" onclick="window.filterDecisionAssistant('all', this)">All Priorities</button>
                <button class="pill-btn" onclick="window.filterDecisionAssistant('budget', this)">💵 Budget</button>
                <button class="pill-btn" onclick="window.filterDecisionAssistant('value', this)">📊 Best Value</button>
                <button class="pill-btn" onclick="window.filterDecisionAssistant('space', this)">📐 Largest Space</button>
                <button class="pill-btn" onclick="window.filterDecisionAssistant('bedrooms', this)">🛏️ Most Bedrooms</button>
                <button class="pill-btn" onclick="window.filterDecisionAssistant('bathrooms', this)">🛁 Most Bathrooms</button>
            </div>
        </div>

        {{-- Decision Cards --}}
        <div class="decision-cards-grid" id="decision-cards-grid">
            {{-- Populated dynamically via Comparator.js --}}
        </div>
    </div>

</div>

{{-- Quick Add Property Modal --}}
<div class="modal-backdrop" id="modal-add-to-compare">
    <div class="modal-card" style="max-width: 680px;">
        <div class="modal-header">
            <h3>Add Property to Comparison</h3>
            <button class="modal-close-btn" type="button" onclick="window.closeAllModals()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 16px 20px;">
            <input type="text" id="input-search-add-compare" class="filter-input"
                   placeholder="Search approved properties by title or location..."
                   oninput="window.searchApprovedPropertiesForModal(this.value)">
            <div id="modal-search-results-container" class="quick-add-results-list"
                 style="margin-top: 16px; max-height: 380px; overflow-y: auto;">
                {{-- Populated dynamically --}}
            </div>
        </div>
    </div>
</div>
