/**
 * EstateLink - Main Application Entrypoint
 * Refactored & Modularized Architecture
 */

import './bootstrap';
import { state } from './state';
import { showToast, formatCurrency, escapeHtml, renderPagination } from './utils';
import { ThemeManager } from './modules/Theme';
import { Router } from './modules/Router';
import { AuthManager } from './modules/Auth';
import { PropertiesManager } from './modules/Properties';
import { SellPropertyManager } from './modules/SellProperty';
import { MyPropertiesManager } from './modules/MyProperties';
import { ProfileManager } from './modules/Profile';
import { AdminManager } from './modules/Admin';
import { AuctionManager } from './modules/Auction';
import { PropertyRequestsManager } from './modules/PropertyRequests';
import './comparator';

// ─────────────────────────────────────────────────────────────────────────────
// Global Window Bindings (Ensures 100% compatibility with HTML inline events)
// ─────────────────────────────────────────────────────────────────────────────

// Shared Utilities
window.state = state;
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.escapeHtml = escapeHtml;
window.renderPagination = renderPagination;

// Theme & Navigation Router
window.toggleTheme = ThemeManager.toggleTheme;
window.initTheme = ThemeManager.initTheme;
window.navigateTo = Router.navigateTo;
window.handleRoute = Router.handleRoute;
window.showView = Router.showView;
window.updateNavActiveState = Router.updateNavActiveState;

// Authentication & Session
window.initAuthSession = AuthManager.initAuthSession;
window.openAuthModal = AuthManager.openAuthModal;
window.switchAuthTab = AuthManager.switchAuthTab;
window.setSignInRole = AuthManager.setSignInRole;
window.closeAllModals = AuthManager.closeAllModals;
window.logout = AuthManager.logout;
window.openProfileModal = () => Router.navigateTo('/profile');

// Public Properties
window.loadPublicProperties = PropertiesManager.loadPublicProperties;
window.loadHomeFeaturedProperties = PropertiesManager.loadHomeFeaturedProperties;
window.resetPublicFilters = PropertiesManager.resetPublicFilters;
window.openPropertyDetailModal = PropertiesManager.openPropertyDetailModal;

// Sell Property Form & Dropzones
window.handlePropertyTypeChange = SellPropertyManager.handlePropertyTypeChange;
window.addSelectedImages = SellPropertyManager.addSelectedImages;
window.handleImageSelection = SellPropertyManager.handleImageSelection;
window.renderImagePreviews = SellPropertyManager.renderImagePreviews;
window.removeSelectedImage = SellPropertyManager.removeSelectedImage;
window.removeExistingImage = SellPropertyManager.removeExistingImage;
window.handleDocFile = SellPropertyManager.handleDocFile;
window.handleDocSelection = SellPropertyManager.handleDocSelection;
window.clearDocSelection = SellPropertyManager.clearDocSelection;
window.resetSellForm = SellPropertyManager.resetSellForm;

// Seller Dashboard / My Properties
window.loadMyProperties = MyPropertiesManager.loadMyProperties;
window.editProperty = MyPropertiesManager.editProperty;
window.resubmitProperty = MyPropertiesManager.resubmitProperty;
window.deleteProperty = MyPropertiesManager.deleteProperty;

// User Profile & Submissions
window.loadProfilePage = ProfileManager.loadProfilePage;
window.setupStandardProfileHub = ProfileManager.setupStandardProfileHub;
window.setupAdminProfileHub = ProfileManager.setupAdminProfileHub;
window.loadAdminProfileCounters = ProfileManager.loadAdminProfileCounters;
window.loadProfileAdminTab = ProfileManager.loadProfileAdminTab;
window.toggleProfileEdit = ProfileManager.toggleProfileEdit;
window.handleProfileUpdate = ProfileManager.handleProfileUpdate;
window.loadProfileSubmissions = ProfileManager.loadProfileSubmissions;
window.filterProfileProperties = ProfileManager.filterProfileProperties;
window.renderProfileSubmissionsList = ProfileManager.renderProfileSubmissionsList;

// Admin Verification & Inspection Workflows
window.loadAdminPendingCount = AdminManager.loadAdminPendingCount;
window.loadAdminQueue = AdminManager.loadAdminQueue;
window.openAdminReviewModal = AdminManager.openAdminReviewModal;
window.viewAdminDocument = AdminManager.viewAdminDocument;
window.downloadAdminDocument = AdminManager.downloadAdminDocument;
window.adminApproveProperty = AdminManager.adminApproveProperty;
window.openAdminRejectModal = AdminManager.openAdminRejectModal;
window.loadAdminBiddingRequests = AdminManager.loadAdminBiddingRequests;
window.adminApproveBidding = AdminManager.adminApproveBidding;
window.openAdminBiddingRejectModal = AdminManager.openAdminBiddingRejectModal;
window.handleAdminBiddingRejectSubmit = AdminManager.handleAdminBiddingRejectSubmit;
window.renderAdminInspectionQueueHtml = AdminManager.renderAdminInspectionQueueHtml;
window.loadAdminInspectionQueue = AdminManager.loadAdminInspectionQueue;
window.openAdminScheduleModal = AdminManager.openAdminScheduleModal;
window.handleAdminScheduleSubmit = AdminManager.handleAdminScheduleSubmit;
window.openAdminCompleteInspectionModal = AdminManager.openAdminCompleteInspectionModal;
window.handleAdminCompleteInspectionSubmit = AdminManager.handleAdminCompleteInspectionSubmit;
window.adminConfirmSale = AdminManager.adminConfirmSale;
window.openAdminCancelDealModal = AdminManager.openAdminCancelDealModal;
window.handleAdminCancelDealSubmit = AdminManager.handleAdminCancelDealSubmit;
window.refreshAdminViews = AdminManager.refreshAdminViews;

// Live Bidding Auction Stream & Buyer History
window.loadLiveAuctionForDetail = AuctionManager.loadLiveAuctionForDetail;
window.startAuctionCountdown = AuctionManager.startAuctionCountdown;
window.quickAdjustBid = AuctionManager.quickAdjustBid;
window.placeLiveBid = AuctionManager.placeLiveBid;
window.openBiddingRequestModal = AuctionManager.openBiddingRequestModal;
window.handleBiddingRequestSubmit = AuctionManager.handleBiddingRequestSubmit;
window.acceptWinningBid = AuctionManager.acceptWinningBid;
window.declineWinningBid = AuctionManager.declineWinningBid;
window.loadMyBids = AuctionManager.loadMyBids;

// Property Purchase & Inspection Requests
window.openPurchaseRequestModal = PropertyRequestsManager.openPurchaseRequestModal;
window.handlePurchaseRequestSubmit = PropertyRequestsManager.handlePurchaseRequestSubmit;
window.loadMyRequests = PropertyRequestsManager.loadMyRequests;
window.openSellerRequestsModal = PropertyRequestsManager.openSellerRequestsModal;
window.sellerForwardRequest = PropertyRequestsManager.sellerForwardRequest;
window.sellerDeclineRequest = PropertyRequestsManager.sellerDeclineRequest;

// ─────────────────────────────────────────────────────────────────────────────
// Event Bindings & Initializers
// ─────────────────────────────────────────────────────────────────────────────

function bindEventHandlers() {
  // Theme Toggle Button
  document.getElementById('theme-toggle-btn')?.addEventListener('click', ThemeManager.toggleTheme);

  // Profile Edit Form Submission
  document.getElementById('form-edit-profile')?.addEventListener('submit', ProfileManager.handleProfileUpdate);

  // Close modals on overlay / close button click
  document.querySelectorAll('.modal-close-btn, .modal-backdrop').forEach(element => {
    element.addEventListener('click', (event) => {
      if (event.target === element) AuthManager.closeAllModals();
    });
  });

  // Search input enter key
  document.getElementById('filter-search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      PropertiesManager.loadPublicProperties(1);
    }
  });

  // Additional form listeners
  AuthManager.setupAuthFormHandlers();
  SellPropertyManager.setupDropzones();
  SellPropertyManager.setupFormSubmission();
  AdminManager.setupAdminFormHandlers();
  PropertyRequestsManager.setupFormHandlers();

  // Bidding request form
  document.getElementById('form-bidding-request')?.addEventListener('submit', AuctionManager.handleBiddingRequestSubmit);
  document.getElementById('form-admin-bidding-reject')?.addEventListener('submit', AdminManager.handleAdminBiddingRejectSubmit);

  // Inspection modals
  document.getElementById('form-admin-schedule')?.addEventListener('submit', AdminManager.handleAdminScheduleSubmit);
  document.getElementById('form-admin-complete-inspection')?.addEventListener('submit', AdminManager.handleAdminCompleteInspectionSubmit);
  document.getElementById('form-admin-cancel-deal')?.addEventListener('submit', AdminManager.handleAdminCancelDealSubmit);
}

// Initialize App on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.initTheme();
  AuthManager.initAuthSession();
  bindEventHandlers();
  Router.initRouter();
  if (window.updateFloatingDock) window.updateFloatingDock();
});
