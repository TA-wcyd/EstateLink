/**
 * EstateLink - Shared Utilities (Toast notifications, formatters, HTML escape, pagination)
 */

export function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-box';
    document.body.appendChild(toastContainer);
  }

  const toastItem = document.createElement('div');
  toastItem.className = `toast-message ${type}`;
  toastItem.textContent = message;
  toastContainer.appendChild(toastItem);

  setTimeout(() => {
    toastItem.style.opacity = '0';
    toastItem.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toastItem.remove(), 300);
  }, 3500);
}

export function formatCurrency(amount) {
  if (amount === undefined || amount === null) return 'Tk 0';
  return 'Tk ' + Number(amount).toLocaleString('en-IN');
}

export function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderPagination(paginatorData, container, handlerName) {
  if (!container || !paginatorData || paginatorData.last_page <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  const current = paginatorData.current_page;
  const last = paginatorData.last_page;

  let html = '';
  const handlerFn = typeof handlerName === 'string' ? handlerName : 'loadPublicProperties';

  html += `<button class="page-btn" ${current === 1 ? 'disabled' : ''} onclick="${handlerFn}(${current - 1})">‹ Prev</button>`;

  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || (i >= current - 1 && i <= current + 1)) {
      html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="${handlerFn}(${i})">${i}</button>`;
    } else if (i === current - 2 || i === current + 2) {
      html += `<span style="padding: 0 4px; color: var(--color-text-muted);">...</span>`;
    }
  }

  html += `<button class="page-btn" ${current === last ? 'disabled' : ''} onclick="${handlerFn}(${current + 1})">Next ›</button>`;
  container.innerHTML = html;
}
