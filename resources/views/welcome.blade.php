<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>EstateLink — Verified Real Estate Platform</title>
    
    <meta name="description" content="EstateLink connects verified property owners, licensed realtors, and genuine buyers with mandatory National ID verification.">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230f766e'><path d='M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z'/></svg>">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Styles & Scripts -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>

    <!-- Header Navigation -->
    <header class="navbar">
        <div class="container">
            <div class="navbar-inner">
                <!-- Brand / Project Name -->
                <a href="javascript:void(0)" onclick="navigateTo('/')" class="brand">
                    <div class="brand-icon">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                        </svg>
                    </div>
                    <span>EstateLink</span>
                </a>

                <!-- Navigation Links -->
                <nav class="nav-links">
                    <a href="javascript:void(0)" class="nav-link" id="nav-link-home" onclick="navigateTo('/')">
                        Home
                    </a>
                    <a href="javascript:void(0)" class="nav-link" id="nav-link-properties" onclick="navigateTo('/properties')">
                        See Properties
                    </a>
                    <a href="javascript:void(0)" class="nav-link" id="nav-link-sell" onclick="navigateTo('/sell-property')">
                        Sell Property
                    </a>
                    <a href="javascript:void(0)" class="nav-link" id="nav-link-my-properties" onclick="navigateTo('/my-properties')" style="display: none;">
                        My Listings
                    </a>
                    <a href="javascript:void(0)" class="nav-link" id="nav-link-profile" onclick="navigateTo('/profile')" style="display: none;">
                        👤 Profile & Submissions
                    </a>
                    <a href="javascript:void(0)" class="nav-link" id="nav-link-admin-queue" onclick="navigateTo('/admin/properties')" style="display: none; color: var(--color-admin);">
                        🛡️ Admin Queue <span class="nav-badge" id="admin-pending-badge" style="display: none;">0</span>
                    </a>
                </nav>

                <!-- Controls: Theme Toggle & Authentication -->
                <div class="navbar-actions">
                    <!-- Mode Switcher Button -->
                    <button class="btn-icon" id="theme-toggle-btn" aria-label="Toggle dark mode" title="Switch Theme">
                        🌙
                    </button>

                    <!-- Guest State: Sign In Button (Shown ONLY when logged out) -->
                    <div id="nav-guest-state" style="display: flex; gap: 8px;">
                        <button class="btn btn-primary btn-sm" onclick="openAuthModal('login', 'user')">
                            Sign In / Log In
                        </button>
                    </div>

                    <!-- Logged In State: User Info & Sign Out (Shown ONLY when logged in) -->
                    <div id="nav-user-state" style="display: none; align-items: center; gap: 10px;">
                        <div class="user-profile-badge" onclick="navigateTo('/profile')" title="View your profile & submissions">
                            <div class="user-avatar" id="nav-user-avatar">U</div>
                            <span id="nav-user-name">User</span>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="logout(true)">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Viewport Section -->
    <main class="main-content">
        <div class="container">

            <!-- ===============================================================
                 VIEW 1: HOME PAGE (Preserved Design + Integrated Actions)
                 =============================================================== -->
            <div id="view-home" class="app-view active">
                <div class="hero-grid">
                    
                    <!-- Left: Project Name & Actions -->
                    <div>
                        <!-- Guest Badge (Logged Out) -->
                        <div class="pill-tag" id="hero-guest-badge">
                            <span>🛡️</span>
                            <span>Verified Real Estate Platform</span>
                        </div>

                        <!-- User Welcome Badge (Logged In) -->
                        <div class="pill-tag" id="hero-user-badge" style="display: none; background-color: var(--color-brand-soft); color: var(--color-brand);">
                            <span>👋</span>
                            <span id="hero-user-greeting">Welcome back!</span>
                        </div>

                        <h1 class="hero-title">
                            Real properties from <br>
                            <span>verified people.</span>
                        </h1>

                        <p class="hero-description">
                            EstateLink eliminates fake listings and unauthorized brokers by connecting genuine property owners, licensed realtors, and buyers through mandatory <strong>National ID verification</strong>.
                        </p>

                        <!-- Core Value Highlights -->
                        <div class="features-list">
                            <div class="feature-item">
                                <div class="feature-check">✓</div>
                                <div>
                                    <strong>National ID & Ownership Verification</strong>
                                    <span>Every listing is audited by Admin with deed and NID checks before going live.</span>
                                </div>
                            </div>

                            <div class="feature-item">
                                <div class="feature-check">✓</div>
                                <div>
                                    <strong>Direct Buyer-Seller Connection</strong>
                                    <span>Talk directly with genuine landlords and registered agents with zero middleman fees.</span>
                                </div>
                            </div>

                            <div class="feature-item">
                                <div class="feature-check">✓</div>
                                <div>
                                    <strong>Dual Role Common Account</strong>
                                    <span>Browse verified properties and easily list your own property from a single account.</span>
                                </div>
                            </div>
                        </div>

                        <!-- Guest Actions (Shown when logged out) -->
                        <div class="hero-buttons" id="hero-guest-actions">
                            <button class="btn btn-primary btn-lg" onclick="navigateTo('/properties')">
                                🔍 See Properties
                            </button>
                            <button class="btn btn-secondary btn-lg" onclick="openAuthModal('login', 'user')">
                                🏠 Sell Your Property
                            </button>
                            <button class="btn btn-secondary btn-lg" onclick="openAuthModal('register')">
                                Create Account
                            </button>
                        </div>

                        <!-- Logged In User Actions (SELL YOUR PROPERTY + SEE PROPERTIES) -->
                        <div class="hero-buttons" id="hero-user-actions" style="display: none;">
                            <button class="btn btn-primary btn-lg" onclick="navigateTo('/sell-property')">
                                🏠 Sell Your Property
                            </button>
                            <button class="btn btn-secondary btn-lg" onclick="navigateTo('/properties')">
                                🔍 See Properties
                            </button>
                            <button class="btn btn-secondary btn-lg" onclick="navigateTo('/my-properties')">
                                📋 My Listings
                            </button>
                        </div>
                    </div>

                    <!-- Right: High Quality Property Showcase -->
                    <div>
                        <div class="showcase-card">
                            <div class="showcase-image-wrapper">
                                <img src="{{ asset('images/hero_building.jpg') }}" alt="EstateLink Verified Property Architecture" class="showcase-image">
                                <div class="showcase-caption">
                                    <div>
                                        <h4>EstateLink Prime Landmark</h4>
                                        <p>Verified property & community network</p>
                                    </div>
                                    <span class="verified-tag" id="showcase-status-tag">✓ Verified</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <!-- ===============================================================
                 VIEW 2: PUBLIC PROPERTIES LISTING (/properties)
                 =============================================================== -->
            <div id="view-properties" class="app-view">
                <div class="page-header">
                    <h2 class="page-title">Verified Properties for Sale & Rent</h2>
                    <p class="page-subtitle">Browse all admin-verified, legally authenticated real estate listings on EstateLink.</p>
                </div>

                <!-- Filter & Search Bar -->
                <div class="filter-bar">
                    <input type="text" id="filter-search" class="filter-input" placeholder="Search by title, area, or address (e.g. Gulshan, Banani)...">
                    
                    <select id="filter-type" class="filter-select">
                        <option value="">All Property Types</option>
                        <option value="apartment">Apartment / Flat</option>
                        <option value="house">Independent House</option>
                        <option value="villa">Duplex / Villa</option>
                        <option value="commercial">Commercial Space</option>
                        <option value="land">Land / Plot</option>
                        <option value="studio">Studio</option>
                    </select>

                    <select id="filter-bedrooms" class="filter-select">
                        <option value="">Any Bedrooms</option>
                        <option value="1">1+ Bedrooms</option>
                        <option value="2">2+ Bedrooms</option>
                        <option value="3">3+ Bedrooms</option>
                        <option value="4">4+ Bedrooms</option>
                    </select>

                    <select id="filter-status" class="filter-select">
                        <option value="">Any Deal Status</option>
                        <option value="available">Available</option>
                        <option value="negotiation">Under Negotiation</option>
                    </select>

                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-primary btn-sm" id="btn-apply-filters" onclick="loadPublicProperties(1)">
                            Search
                        </button>
                        <button class="btn btn-secondary btn-sm" id="btn-reset-filters" onclick="resetPublicFilters()">
                            Reset
                        </button>
                    </div>
                </div>

                <!-- Properties Grid Container -->
                <div id="public-properties-container">
                    <!-- Populated dynamically via JS -->
                </div>

                <!-- Pagination Container -->
                <div id="public-pagination-container" class="pagination-wrap">
                    <!-- Populated dynamically via JS -->
                </div>
            </div>

            <!-- ===============================================================
                 VIEW 3: SELL PROPERTY FORM (/sell-property)
                 =============================================================== -->
            <div id="view-sell-property" class="app-view">
                <div class="page-header" style="text-align: center; max-width: 700px; margin: 0 auto 28px;">
                    <div class="pill-tag"><span>🏠</span><span>Seller Listing Portal</span></div>
                    <h2 class="page-title" id="sell-form-main-title">List Your Property on EstateLink</h2>
                    <p class="page-subtitle">Submit your property details, photos, and mandatory verification documents for Admin approval.</p>
                </div>

                <div class="form-card">
                    <form id="form-sell-property">
                        <input type="hidden" id="edit-property-id" value="">

                        <!-- Section 1: Property Information -->
                        <div class="form-section">
                            <h3 class="section-title">1. Property Information</h3>
                            <p class="section-desc">Basic details and pricing about your property listing.</p>

                            <div class="form-field">
                                <label for="prop-title">Property Title *</label>
                                <input type="text" id="prop-title" placeholder="e.g. Luxurious 3BHK South-Facing Apartment in Banani" required>
                            </div>

                            <div class="form-row-3">
                                <div class="form-field">
                                    <label for="prop-type">Property Type *</label>
                                    <select id="prop-type" required onchange="handlePropertyTypeChange()">
                                        <option value="apartment">Apartment / Flat</option>
                                        <option value="house">Independent House</option>
                                        <option value="villa">Duplex / Villa</option>
                                        <option value="commercial">Commercial Space</option>
                                        <option value="land">Land / Plot</option>
                                        <option value="studio">Studio Apartment</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div class="form-field">
                                    <label for="prop-price">Price (BDT / ৳) *</label>
                                    <input type="number" id="prop-price" placeholder="e.g. 25000000" min="0" required>
                                </div>

                                <div class="form-field">
                                    <label for="prop-size">Property Size (Sq. Ft) *</label>
                                    <input type="number" id="prop-size" placeholder="e.g. 2150" min="1" step="0.1" required>
                                </div>
                            </div>

                            <div class="form-row" id="row-beds-baths">
                                <div class="form-field">
                                    <label for="prop-bedrooms">Bedrooms</label>
                                    <input type="number" id="prop-bedrooms" placeholder="e.g. 3" min="0" max="50">
                                </div>

                                <div class="form-field">
                                    <label for="prop-bathrooms">Bathrooms</label>
                                    <input type="number" id="prop-bathrooms" placeholder="e.g. 3" min="0" max="50">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-field">
                                    <label for="prop-location">Location / Area *</label>
                                    <input type="text" id="prop-location" placeholder="e.g. Gulshan 2, Dhaka" required>
                                </div>

                                <div class="form-field">
                                    <label for="prop-phone">Contact Phone Number *</label>
                                    <input type="text" id="prop-phone" placeholder="e.g. 017XXXXXXXX" required>
                                </div>
                            </div>

                            <div class="form-field">
                                <label for="prop-address">Detailed Address *</label>
                                <input type="text" id="prop-address" placeholder="e.g. House 45, Road 11, Block D, Banani, Dhaka" required>
                            </div>

                            <div class="form-field">
                                <label for="prop-description">Detailed Description *</label>
                                <textarea id="prop-description" placeholder="Describe the key features, amenities, floor level, balcony views, fittings, parking, etc." required></textarea>
                            </div>
                        </div>

                        <!-- Section 2: Property Images -->
                        <div class="form-section">
                            <h3 class="section-title">2. Property Images</h3>
                            <p class="section-desc">Upload multiple clear photographs of your property (Max 10 images, up to 10MB each).</p>

                            <div class="upload-dropzone" id="images-dropzone" onclick="document.getElementById('input-images').click()">
                                <div class="upload-icon">📸</div>
                                <strong>Click or Drag & Drop Property Images Here</strong>
                                <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 4px;">Supports JPG, PNG, WEBP. The first uploaded image will serve as the primary card photo.</p>
                                <input type="file" id="input-images" multiple accept="image/jpeg,image/png,image/webp" style="display: none;" onchange="handleImageSelection(event)">
                            </div>

                            <div class="preview-grid" id="image-previews-container"></div>
                        </div>

                        <!-- Section 3: Verification Documents -->
                        <div class="form-section">
                            <h3 class="section-title">3. Mandatory Verification Documents</h3>
                            <p class="section-desc">To protect buyers and ensure authenticity, upload verification documents for Admin review.</p>

                            <div class="form-row">
                                <div class="form-field">
                                    <label>Seller National ID (NID) Scan / Photo *</label>
                                    <div class="upload-dropzone" id="nid-dropzone" style="padding: 16px;" onclick="document.getElementById('input-nid-doc').click()">
                                        <div style="font-size: 1.4rem;">🪪</div>
                                        <span style="font-size: 0.85rem; font-weight: 600;">Choose NID Document (or Drag & Drop)</span>
                                        <input type="file" id="input-nid-doc" accept="image/*,.pdf" style="display: none;" onchange="handleDocSelection(event, 'nid')">
                                    </div>
                                    <div id="nid-file-status" class="file-selected-card" style="display: none;">
                                        <span id="nid-file-name" style="font-weight: 600;">No file chosen</span>
                                        <button type="button" class="btn btn-sm btn-secondary" onclick="clearDocSelection('nid')">Remove</button>
                                    </div>
                                </div>

                                <div class="form-field">
                                    <label>Property Ownership Deed / Mutation Proof *</label>
                                    <div class="upload-dropzone" id="prop-doc-dropzone" style="padding: 16px;" onclick="document.getElementById('input-prop-doc').click()">
                                        <div style="font-size: 1.4rem;">📑</div>
                                        <span style="font-size: 0.85rem; font-weight: 600;">Choose Ownership Document (or Drag & Drop)</span>
                                        <input type="file" id="input-prop-doc" accept="image/*,.pdf" style="display: none;" onchange="handleDocSelection(event, 'prop')">
                                    </div>
                                    <div id="prop-file-status" class="file-selected-card" style="display: none;">
                                        <span id="prop-file-name" style="font-weight: 600;">No file chosen</span>
                                        <button type="button" class="btn btn-sm btn-secondary" onclick="clearDocSelection('prop')">Remove</button>
                                    </div>
                                </div>
                            </div>

                            <div class="privacy-alert">
                                <span style="font-size: 1.2rem;">🔒</span>
                                <div>
                                    <strong>Private & Secure Storage:</strong> Your National ID and property deeds are stored securely and encrypted. They will <strong>NEVER</strong> be displayed publicly to buyers and are accessible only to authorized EstateLink Administrators for verification.
                                </div>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
                            <button type="button" class="btn btn-secondary" onclick="navigateTo('/my-properties')">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary btn-lg" id="submit-property-btn">
                                🚀 Submit Property for Verification
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- ===============================================================
                 VIEW 4: SELLER'S OWN PROPERTIES (/my-properties)
                 =============================================================== -->
            <div id="view-my-properties" class="app-view">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 class="page-title">My Listed Properties</h2>
                        <p class="page-subtitle">Track verification status, review admin feedback, and manage your property listings.</p>
                    </div>
                    <button class="btn btn-primary" onclick="navigateTo('/sell-property')">
                        + List New Property
                    </button>
                </div>

                <!-- Stats Overview -->
                <div class="stats-grid" id="my-properties-stats">
                    <div class="stat-card">
                        <div class="stat-val" id="stat-total" style="color: var(--color-brand);">0</div>
                        <div class="stat-label">Total Properties</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-val" id="stat-approved" style="color: var(--color-success);">0</div>
                        <div class="stat-label">Live & Approved</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-val" id="stat-pending" style="color: var(--color-warning);">0</div>
                        <div class="stat-label">Pending Verification</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-val" id="stat-rejected" style="color: var(--color-danger);">0</div>
                        <div class="stat-label">Rejected / Needs Fix</div>
                    </div>
                </div>

                <!-- List of seller properties -->
                <div id="my-properties-list-container">
                    <!-- Populated dynamically via JS -->
                </div>
            </div>

            <!-- ===============================================================
                 VIEW 5: ADMIN VERIFICATION QUEUE (/admin/properties)
                 =============================================================== -->
            <div id="view-admin-properties" class="app-view">
                <div class="page-header">
                    <div class="pill-tag" style="background-color: var(--color-admin-soft); color: var(--color-admin);">
                        <span>🛡️</span><span>Admin Management</span>
                    </div>
                    <h2 class="page-title">Property Verification Dashboard</h2>
                    <p class="page-subtitle">Audit submitted properties, verify seller NID and ownership deeds, and approve or reject listings.</p>
                </div>

                <div class="admin-tab-bar">
                    <button class="btn btn-sm btn-primary" id="btn-admin-tab-pending" onclick="loadAdminQueue('pending')">
                        ⏳ Pending Approval Queue (<span id="admin-pending-count">0</span>)
                    </button>
                    <button class="btn btn-sm btn-secondary" id="btn-admin-tab-all" onclick="loadAdminQueue('all')">
                        📋 All Properties History
                    </button>
                </div>

                <div id="admin-queue-container">
                    <!-- Populated dynamically via JS -->
                </div>

                <div id="admin-pagination-container" class="pagination-wrap"></div>
            </div>

            <!-- ===============================================================
                 VIEW 6: USER PROFILE & SUBMISSIONS DASHBOARD (/profile)
                 =============================================================== -->
            <div id="view-profile" class="app-view">
                <div class="page-header" style="margin-bottom: 28px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
                        <div>
                            <div class="pill-tag"><span>👤</span><span>User Dashboard</span></div>
                            <h2 class="page-title">My Account & Profile</h2>
                            <p class="page-subtitle">Manage your personal credentials, National ID verification details, and track your property submissions in real time.</p>
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="btn btn-primary" onclick="navigateTo('/sell-property')">
                                + List New Property
                            </button>
                            <button class="btn btn-secondary" onclick="logout(true)" style="color: var(--color-danger);">
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                <div class="profile-grid">
                    <!-- LEFT COLUMN: Profile Info Card (View & Edit Modes) -->
                    <div class="profile-card-col">
                        
                        <!-- 1. Profile Overview / View Mode Card -->
                        <div class="profile-card" id="profile-view-card">
                            <div class="profile-card-header">
                                <div class="profile-avatar-large" id="profile-page-avatar">U</div>
                                <h3 class="profile-name" id="profile-page-name">User Name</h3>
                                <p class="profile-email" id="profile-page-email">email@example.com</p>
                                <div id="profile-page-badge-wrap" style="margin-top: 8px;"></div>
                            </div>

                            <div class="profile-divider"></div>

                            <div class="profile-details-list">
                                <div class="profile-detail-row">
                                    <span class="detail-label">Account Type</span>
                                    <span class="detail-value" id="profile-page-type">Buyer / Seller</span>
                                </div>
                                <div class="profile-detail-row">
                                    <span class="detail-label">National ID (NID)</span>
                                    <span class="detail-value" id="profile-page-nid">N/A</span>
                                </div>
                                <div class="profile-detail-row">
                                    <span class="detail-label">Phone Number</span>
                                    <span class="detail-value" id="profile-page-phone">N/A</span>
                                </div>
                                <div class="profile-detail-row">
                                    <span class="detail-label">Company / Agency</span>
                                    <span class="detail-value" id="profile-page-company">Individual</span>
                                </div>
                                <div class="profile-detail-row" id="row-profile-facebook">
                                    <span class="detail-label">Social / Website</span>
                                    <span class="detail-value" id="profile-page-facebook">Not provided</span>
                                </div>
                                <div class="profile-detail-row">
                                    <span class="detail-label">Verification Status</span>
                                    <span class="detail-value" id="profile-page-status">Pending NID Verification</span>
                                </div>
                            </div>

                            <div style="margin-top: 24px;">
                                <button class="btn btn-primary w-full" onclick="toggleProfileEdit(true)">
                                    ✏️ Edit Profile Information
                                </button>
                            </div>
                        </div>

                        <!-- 2. Profile Edit Mode Card (Hidden by default) -->
                        <div class="profile-card" id="profile-edit-card" style="display: none;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h3 style="font-size: 1.15rem; font-weight: 700;">Edit Profile Details</h3>
                                <button class="btn btn-secondary btn-sm" onclick="toggleProfileEdit(false)">Cancel</button>
                            </div>
                            
                            <form id="form-edit-profile">
                                <div class="form-field">
                                    <label for="edit-profile-name">Full Name *</label>
                                    <input type="text" id="edit-profile-name" required>
                                </div>

                                <div class="form-field">
                                    <label for="edit-profile-account-type">Account Type</label>
                                    <select id="edit-profile-account-type">
                                        <option value="Buyer / Seller">Buyer / Seller (Individual)</option>
                                        <option value="Real Estate Agent / Realtor">Real Estate Agent / Realtor</option>
                                        <option value="Property Owner / Developer">Property Owner / Developer</option>
                                        <option value="Agency Representative">Agency Representative</option>
                                    </select>
                                </div>

                                <div class="form-field">
                                    <label for="edit-profile-nid">National ID (NID) *</label>
                                    <input type="text" id="edit-profile-nid" placeholder="Enter National ID" required>
                                </div>

                                <div class="form-field">
                                    <label for="edit-profile-phone">Phone Number *</label>
                                    <input type="text" id="edit-profile-phone" placeholder="017XXXXXXXX" required>
                                </div>

                                <div class="form-field">
                                    <label for="edit-profile-company">Company / Agency</label>
                                    <input type="text" id="edit-profile-company" placeholder="e.g. Apex Realty or Individual">
                                </div>

                                <div class="form-field">
                                    <label for="edit-profile-facebook">Facebook Profile / Website (Optional)</label>
                                    <input type="url" id="edit-profile-facebook" placeholder="https://facebook.com/username">
                                </div>

                                <div style="display: flex; gap: 10px; margin-top: 20px;">
                                    <button type="button" class="btn btn-secondary w-full" onclick="toggleProfileEdit(false)">Cancel</button>
                                    <button type="submit" class="btn btn-primary w-full" id="btn-save-profile">💾 Save Changes</button>
                                </div>
                            </form>
                        </div>

                        <!-- Trust & Verification Info Card -->
                        <div class="profile-card" style="margin-top: 20px; background: var(--color-brand-soft); border-color: rgba(15,118,110,0.2);">
                            <div style="display: flex; gap: 12px; align-items: flex-start;">
                                <div style="font-size: 1.4rem;">🛡️</div>
                                <div style="font-size: 0.85rem; line-height: 1.5; color: var(--color-text);">
                                    <strong style="display: block; margin-bottom: 2px; color: var(--color-brand);">Trust & Identity Protection</strong>
                                    Your National ID and deeds are verified directly by EstateLink Administrators. Once verified, your property listings are awarded verified status and highlighted to buyers.
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- RIGHT COLUMN: User's Posted Properties / Submissions Section -->
                    <div class="profile-submissions-col">
                        <div class="submissions-header-card">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
                                <div>
                                    <h3 style="font-size: 1.25rem; font-weight: 800;">My Property Posts & Verification Status</h3>
                                    <p style="font-size: 0.85rem; color: var(--color-text-muted);">Monitor admin acceptance, audit feedback, and rejection notes in real-time.</p>
                                </div>
                                <button class="btn btn-primary btn-sm" onclick="navigateTo('/sell-property')">
                                    + List New Property
                                </button>
                            </div>

                            <!-- Submissions Stats Counter -->
                            <div class="profile-stats-grid">
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
                            </div>

                            <!-- Filter Tabs for Submissions -->
                            <div class="submission-filter-tabs">
                                <button class="sub-tab-btn active" id="prof-tab-all" onclick="filterProfileProperties('all')">All Posts (<span id="count-prof-all">0</span>)</button>
                                <button class="sub-tab-btn" id="prof-tab-approved" onclick="filterProfileProperties('approved')">✓ Approved (<span id="count-prof-approved">0</span>)</button>
                                <button class="sub-tab-btn" id="prof-tab-pending" onclick="filterProfileProperties('pending')">⏳ Pending Review (<span id="count-prof-pending">0</span>)</button>
                                <button class="sub-tab-btn" id="prof-tab-rejected" onclick="filterProfileProperties('rejected')">❌ Rejected / Needs Fix (<span id="count-prof-rejected">0</span>)</button>
                            </div>
                        </div>

                        <!-- List Container for Profile Posts -->
                        <div id="profile-properties-container" style="margin-top: 16px;">
                            <!-- Populated dynamically via JS -->
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <!-- Slim Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-inner">
                <div>
                    &copy; {{ date('Y') }} <strong>EstateLink</strong> • AUST CSE Verified Real Estate Platform
                </div>
                <div style="display: flex; gap: 16px;">
                    <a href="javascript:void(0)" onclick="navigateTo('/properties')" style="color: var(--color-brand); font-weight: 600;">Browse Properties</a>
                    <a href="javascript:void(0)" onclick="navigateTo('/sell-property')" style="color: var(--color-brand); font-weight: 600;">Sell Property</a>
                </div>
            </div>
        </div>
    </footer>

    <!-- ===================================================================
         MODALS
         =================================================================== -->

    <!-- 1. Auth Modal (Sign In / Register) -->
    <div class="modal-backdrop" id="modal-auth">
        <div class="modal-card">
            <div class="modal-header">
                <h3 style="font-size: 1.25rem;">Access EstateLink</h3>
                <button class="modal-close-btn" type="button" onclick="closeAllModals()">&times;</button>
            </div>

            <!-- Top Switcher: Sign In vs Register -->
            <div class="auth-top-tabs">
                <button class="auth-tab-btn active" id="tab-btn-login" type="button">Sign In</button>
                <button class="auth-tab-btn" id="tab-btn-register" type="button">Register</button>
            </div>

            <!-- SIGN IN PANE -->
            <div id="pane-login">
                <div class="role-segment-selector">
                    <button class="role-btn active role-user" id="role-btn-user" type="button" onclick="setSignInRole('user')">
                        🏠 Buyer & Seller
                    </button>
                    <button class="role-btn role-admin" id="role-btn-admin" type="button" onclick="setSignInRole('admin')">
                        🔐 Admin Portal
                    </button>
                </div>

                <div class="portal-badge-banner portal-user-banner" id="banner-user-portal">
                    <span>👤 Sign in to browse, buy, rent, or list properties.</span>
                </div>

                <div class="portal-badge-banner portal-admin-banner" id="banner-admin-portal" style="display: none;">
                    <span>🔐 Authorized administrative access.</span>
                    <button class="btn btn-sm btn-secondary" id="fill-admin-btn" type="button" style="padding: 2px 8px; font-size: 0.72rem;">Demo Fill</button>
                </div>

                <form id="form-login">
                    <div class="form-field">
                        <label for="login-email" id="login-email-label">Email Address</label>
                        <input type="email" id="login-email" placeholder="name@example.com" required autocomplete="email">
                    </div>
                    <div class="form-field" style="margin-bottom: 16px;">
                        <label for="login-password">Password</label>
                        <input type="password" id="login-password" placeholder="••••••••" required autocomplete="current-password">
                    </div>
                    <button type="submit" class="btn btn-primary w-full" id="login-submit-btn">
                        Sign In as Buyer / Seller
                    </button>
                    
                    <p id="login-bottom-prompt" style="text-align: center; font-size: 0.8rem; color: var(--color-text-muted); margin-top: 12px;">
                        Looking to register? <a href="javascript:void(0)" onclick="switchAuthTab('register')" style="color: var(--color-brand); font-weight: 600;">Create account</a>
                    </p>
                </form>
            </div>

            <!-- REGISTER PANE -->
            <div id="pane-register" style="display: none;">
                <div class="portal-badge-banner portal-user-banner" style="margin-bottom: 14px;">
                    <span>🪪 Register as a verified User (Buyer / Seller).</span>
                </div>

                <form id="form-register">
                    <div class="form-field">
                        <label for="register-name">Full Name *</label>
                        <input type="text" id="register-name" placeholder="e.g. Raisul Hasan" required autocomplete="name">
                    </div>
                    <div class="form-field">
                        <label for="register-email">Email Address *</label>
                        <input type="email" id="register-email" placeholder="name@example.com" required autocomplete="email">
                    </div>
                    <div class="form-row">
                        <div class="form-field">
                            <label for="register-phone">Phone Number *</label>
                            <input type="text" id="register-phone" placeholder="017XXXXXXXX" required autocomplete="tel">
                        </div>
                        <div class="form-field">
                            <label for="register-nid">National ID (NID) *</label>
                            <input type="text" id="register-nid" placeholder="NID-XXXXXX" required>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="register-company">Company / Agency (Optional)</label>
                        <input type="text" id="register-company" placeholder="e.g. Apex Realty or Individual">
                    </div>
                    <div class="form-row" style="margin-bottom: 16px;">
                        <div class="form-field">
                            <label for="register-password">Password *</label>
                            <input type="password" id="register-password" placeholder="MixedCase123" required autocomplete="new-password">
                        </div>
                        <div class="form-field">
                            <label for="register-password-confirm">Confirm Password *</label>
                            <input type="password" id="register-password-confirm" placeholder="MixedCase123" required autocomplete="new-password">
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary w-full" id="register-submit-btn">
                        Create Buyer / Seller Account
                    </button>
                    <p style="text-align: center; font-size: 0.8rem; color: var(--color-text-muted); margin-top: 12px;">
                        Already have an account? <a href="javascript:void(0)" onclick="switchAuthTab('login')" style="color: var(--color-brand); font-weight: 600;">Sign in here</a>
                    </p>
                </form>
            </div>
        </div>
    </div>

    <!-- 2. User Profile Modal -->
    <div class="modal-backdrop" id="modal-profile">
        <div class="modal-card">
            <div class="modal-header">
                <h3 style="font-size: 1.25rem;">Account Overview</h3>
                <button class="modal-close-btn" type="button" onclick="closeAllModals()">&times;</button>
            </div>
            <div id="profile-modal-body"></div>
        </div>
    </div>

    <!-- 3. Property Detail Modal (Public) -->
    <div class="modal-backdrop" id="modal-property-detail">
        <div class="modal-card modal-card-lg">
            <div class="modal-header">
                <h3 style="font-size: 1.25rem;" id="detail-modal-title">Property Details</h3>
                <button class="modal-close-btn" type="button" onclick="closeAllModals()">&times;</button>
            </div>
            <div id="property-detail-body"></div>
        </div>
    </div>

    <!-- 4. Admin Verification Dossier Modal -->
    <div class="modal-backdrop" id="modal-admin-review">
        <div class="modal-card modal-card-lg">
            <div class="modal-header">
                <h3 style="font-size: 1.25rem;">Admin Verification Dossier</h3>
                <button class="modal-close-btn" type="button" onclick="closeAllModals()">&times;</button>
            </div>
            <div id="admin-review-body"></div>
        </div>
    </div>

    <!-- 5. Admin Rejection Reason Modal -->
    <div class="modal-backdrop" id="modal-admin-reject">
        <div class="modal-card">
            <div class="modal-header">
                <h3 style="font-size: 1.25rem; color: #ef4444;">Reject Property Listing</h3>
                <button class="modal-close-btn" type="button" onclick="closeAllModals()">&times;</button>
            </div>
            <form id="form-admin-reject">
                <input type="hidden" id="reject-property-id" value="">
                <div class="form-field">
                    <label for="reject-reason">Reason for Rejection *</label>
                    <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 6px;">
                        Explain clearly to the seller why the property is rejected (e.g. blurry NID, missing deed, invalid pricing, etc.). The seller will see this note and can edit and resubmit.
                    </p>
                    <textarea id="reject-reason" placeholder="Enter detailed reason for rejection..." required style="min-height: 120px;"></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                    <button type="submit" class="btn btn-danger">Confirm Rejection</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Toast Notification Container -->
    <div id="toast-container" class="toast-box"></div>

</body>
</html>
