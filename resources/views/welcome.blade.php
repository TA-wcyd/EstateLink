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
                <a href="{{ url('/') }}" class="brand">
                    <div class="brand-icon">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                        </svg>
                    </div>
                    <span>EstateLink</span>
                </a>

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
                        <div class="user-profile-badge" onclick="openProfileModal()" title="View your profile">
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

    <!-- Main Viewport Section (Fits Single Screen) -->
    <main class="main-content">
        <div class="container">
            <div class="hero-grid">
                
                <!-- Left: Project Name & Company Motive -->
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
                                <strong>National ID Verification</strong>
                                <span>Every account is authenticated to prevent duplicate and scam listings.</span>
                            </div>
                        </div>

                        <div class="feature-item">
                            <div class="feature-check">✓</div>
                            <div>
                                <strong>Direct Connection</strong>
                                <span>Talk directly with genuine landlords and registered agents with zero middleman fees.</span>
                            </div>
                        </div>

                        <div class="feature-item">
                            <div class="feature-check">✓</div>
                            <div>
                                <strong>Secure Platform</strong>
                                <span>Protected by Laravel Sanctum tokenized authentication and admin review workflows.</span>
                            </div>
                        </div>
                    </div>

                    <!-- Guest Actions (Shown ONLY when logged out) -->
                    <div class="hero-buttons" id="hero-guest-actions">
                        <button class="btn btn-primary" onclick="openAuthModal('login', 'user')">
                            Get Started / Sign In
                        </button>
                        <button class="btn btn-secondary" onclick="openAuthModal('register')">
                            Create Account
                        </button>
                    </div>

                    <!-- User Actions (Shown ONLY when logged in - NO sign in buttons) -->
                    <div class="hero-buttons" id="hero-user-actions" style="display: none;">
                        <button class="btn btn-primary" onclick="openProfileModal()">
                            Open My Profile
                        </button>
                        <button class="btn btn-secondary" onclick="logout(true)">
                            Sign Out
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
    </main>

    <!-- Slim Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-inner">
                <div>
                    &copy; {{ date('Y') }} <strong>EstateLink</strong> • AUST CSE Platform
                </div>
                <div>
                    Built for transparency and verified property connections
                </div>
            </div>
        </div>
    </footer>

    <!-- Auth Modal (Sign In / Register) -->
    <div class="modal-backdrop" id="modal-auth">
        <div class="modal-card">
            <div class="modal-header">
                <h3 style="font-size: 1.25rem;">Access EstateLink</h3>
                <button class="modal-close-btn" type="button" aria-label="Close dialog">&times;</button>
            </div>

            <!-- Top Switcher: Sign In vs Register -->
            <div class="auth-top-tabs">
                <button class="auth-tab-btn active" id="tab-btn-login" type="button">Sign In</button>
                <button class="auth-tab-btn" id="tab-btn-register" type="button">Register</button>
            </div>

            <!-- SIGN IN PANE (With Buyer/Seller vs Admin) -->
            <div id="pane-login">
                <!-- Role Selector: Buyer/Seller vs Admin -->
                <div class="role-segment-selector">
                    <button class="role-btn active role-user" id="role-btn-user" type="button" onclick="setSignInRole('user')">
                        🏠 Buyer & Seller
                    </button>
                    <button class="role-btn role-admin" id="role-btn-admin" type="button" onclick="setSignInRole('admin')">
                        🔐 Admin Portal
                    </button>
                </div>

                <!-- Buyer / Seller Banner Info -->
                <div class="portal-badge-banner portal-user-banner" id="banner-user-portal">
                    <span>👤 Sign in to browse, buy, rent, or list properties.</span>
                </div>

                <!-- Admin Banner Info with 1-Click Quick Fill -->
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
                        Looking to register? <a href="javascript:void(0)" onclick="switchAuthTab('register')" style="color: var(--color-brand); font-weight: 600;">Create buyer / seller account</a>
                    </p>
                </form>
            </div>

            <!-- REGISTER PANE (For Buyers, Sellers, Realtors) -->
            <div id="pane-register" style="display: none;">
                <div class="portal-badge-banner portal-user-banner" style="margin-bottom: 14px;">
                    <span>🪪 Register as a verified Buyer, Seller, or Realtor.</span>
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

    <!-- User Profile Modal -->
    <div class="modal-backdrop" id="modal-profile">
        <div class="modal-card">
            <div class="modal-header">
                <h3 style="font-size: 1.25rem;">Account Overview</h3>
                <button class="modal-close-btn" type="button" aria-label="Close dialog">&times;</button>
            </div>
            <div id="profile-modal-body">
                <!-- Populated dynamically by JavaScript -->
            </div>
        </div>
    </div>

    <!-- Toast Container -->
    <div id="toast-container" class="toast-box"></div>

</body>
</html>
