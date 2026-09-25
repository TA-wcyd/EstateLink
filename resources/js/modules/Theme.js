/**
 * Theme Module - Dark / Light mode management
 */
import { state } from '../state';

export class ThemeManager {
  static initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeButton = document.getElementById('theme-toggle-btn');
    if (themeButton) {
      themeButton.textContent = state.theme === 'dark' ? '☀️' : '🌙';
      themeButton.title = state.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
  }

  static toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('estatelink_theme', state.theme);
    ThemeManager.initTheme();
  }
}
