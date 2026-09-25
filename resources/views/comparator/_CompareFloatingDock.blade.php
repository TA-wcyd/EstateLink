<!-- Persistent Floating Comparison Dock -->
<div id="compare-floating-dock" class="compare-floating-dock" style="display: none;">
    <div class="container">
        <div class="dock-content-wrapper">
            <!-- Left Info & Badge -->
            <div class="dock-info">
                <div class="dock-badge-title">
                    <span class="dock-icon">⚖️</span>
                    <span class="dock-title">Property Comparison</span>
                    <span class="dock-counter-badge" id="dock-counter-badge">0 / 5 Selected</span>
                </div>
                <p class="dock-subtitle">Compare up to 5 verified listings side-by-side with metric deltas</p>
            </div>

            <!-- Middle Mini Thumbnails Carousel -->
            <div class="dock-thumbnails-container" id="dock-thumbnails-container">
                <!-- Populated dynamically via comparator.js -->
            </div>

            <!-- Right Action Buttons -->
            <div class="dock-actions">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-dock-clear" onclick="window.clearCompare()">
                    Clear All
                </button>
                <button type="button" class="btn btn-primary btn-sm" id="btn-dock-compare" onclick="window.navigateToComparePage()">
                    🚀 Compare Now (<span id="dock-btn-count">0</span>)
                </button>
            </div>
        </div>
    </div>
</div>
