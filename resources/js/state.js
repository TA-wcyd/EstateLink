/**
 * EstateLink - Global Application State
 */
export const state = {
  token: localStorage.getItem('estatelink_token') || null,
  user: JSON.parse(localStorage.getItem('estatelink_user') || 'null'),
  theme: localStorage.getItem('estatelink_theme') || 'light',
  signInRole: 'user', // 'user' (Buyer/Seller) or 'admin'
  currentRoute: '/',
  sellForm: {
    selectedImages: [],   // Array of File objects
    existingImages: [],   // Array of {id, url, is_primary} when editing
    nidFile: null,
    propFile: null,
    editId: null
  },
  adminQueueTab: 'pending',
  profileProperties: [],
  profileSubmissionsTab: 'all',
  auctionPollingInterval: null,
  auctionCountdownInterval: null,
  activeAuctionData: null
};
