/**
 * Entry point file for Comparator module (comparator.js)
 * Exposes global functions for HTML inline onclick handlers.
 */
import { ComparatorManager } from './modules/Comparator';

// Expose ComparatorManager methods on window object
window.ComparatorManager = ComparatorManager;
window.toggleCompare           = ComparatorManager.toggleCompare;
window.isInCompare             = ComparatorManager.isInCompare;
window.clearCompare            = ComparatorManager.clearCompare;
window.clearCompareState       = ComparatorManager.clearCompareState;
window.removeCompareItem       = ComparatorManager.removeCompareItem;
window.updateFloatingDock      = ComparatorManager.updateFloatingDock;
window.loadComparisonPage      = ComparatorManager.loadComparisonPage;
window.toggleHighlightDifferences  = ComparatorManager.toggleHighlightDifferences;
window.copyComparisonShareLink = ComparatorManager.copyComparisonShareLink;
window.printComparisonSheet    = ComparatorManager.printComparisonSheet;
window.openAddToCompareModal   = ComparatorManager.openAddToCompareModal;
window.searchApprovedPropertiesForModal = ComparatorManager.searchApprovedPropertiesForModal;
window.filterDecisionAssistant = ComparatorManager.filterDecisionAssistant;
window.highlightCompareColumn  = ComparatorManager.highlightCompareColumn;
window.navigateToComparePage   = ComparatorManager.navigateToComparePage;
