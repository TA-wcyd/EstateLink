/**
 * EstateLink - Real-Time Chat Widget
 */

export class ChatWidget {
    constructor(requestId, currentUserId, config = {}) {
        this.requestId = parseInt(requestId, 10);
        this.currentUserId = parseInt(currentUserId, 10);
        this.config = config;
        this.wrapper = null;
        this.bodyEl = null;
        this.formEl = null;
        this.inputEl = null;
        this.channelName = `chat-room.${this.requestId}`;

        this.init();
    }

    init() {
        this.render();
        this.loadHistory();
        this.listen();
    }

    headers() {
        const token = localStorage.getItem('estatelink_token') || localStorage.getItem('api_token') || '';
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            'X-CSRF-TOKEN': csrfToken
        };
    }

    escape(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    render() {
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'chat-widget';

        const title = this.escape(this.config.propertyTitle || `Request #${this.requestId}`);
        const schedule = this.escape(this.config.inspectionSchedule || 'Inspection Scheduled');

        const isAdmin = (window.state?.user?.role === 'admin') || (this.config.isAdmin === true);

        this.wrapper.innerHTML = `
            <div class="chat-header">
                <div class="chat-header-info">
                    <span class="chat-header-icon">💬</span>
                    <div>
                        <div class="chat-header-title">${title}</div>
                        <div class="chat-header-sub">${isAdmin ? 'Admin View (Monitoring)' : 'Inspection Chat'}</div>
                    </div>
                </div>
                <button type="button" class="chat-close-btn" aria-label="Close Chat">&times;</button>
            </div>
            <div class="chat-notice-bar">
                📅 <strong>Meeting:</strong> ${schedule}
            </div>
            <div class="chat-body">
                <div class="chat-loading">
                    <div class="chat-spinner"></div>
                    <p>Loading messages...</p>
                </div>
            </div>
            ${isAdmin ? `
                <div class="chat-admin-readonly-bar">
                    🛡️ <strong>Read-Only Mode:</strong> Admin monitoring view. Sending messages is disabled.
                </div>
            ` : `
                <form class="chat-form">
                    <input type="text" class="chat-input" placeholder="Type a message..." maxlength="5000" autocomplete="off" required />
                    <button type="submit" class="chat-send-btn">Send</button>
                </form>
            `}
        `;

        document.body.appendChild(this.wrapper);

        this.bodyEl = this.wrapper.querySelector('.chat-body');
        this.formEl = this.wrapper.querySelector('.chat-form');
        this.inputEl = this.wrapper.querySelector('.chat-input');

        const closeBtn = this.wrapper.querySelector('.chat-close-btn');
        closeBtn.addEventListener('click', () => this.destroy());

        if (this.formEl) {
            this.formEl.addEventListener('submit', (e) => this.send(e));
        }
    }

    showReadOnlyMode(text = '🛡️ Read-Only Mode: Admin monitoring view.') {
        if (this.formEl && this.formEl.parentNode) {
            const noticeBar = document.createElement('div');
            noticeBar.className = 'chat-admin-readonly-bar';
            noticeBar.textContent = text;
            this.formEl.parentNode.replaceChild(noticeBar, this.formEl);
            this.formEl = null;
            this.inputEl = null;
        }
    }

    async loadHistory() {
        try {
            const res = await fetch(`/api/chat-rooms/${this.requestId}`, {
                headers: this.headers()
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to load chat history');
            }

            const data = await res.json();
            if (data.current_user_id) {
                this.currentUserId = parseInt(data.current_user_id, 10);
            }

            if (data.is_admin || data.can_send === false) {
                this.showReadOnlyMode(data.is_admin ? '🛡️ Read-Only Mode: Admin monitoring view.' : '🔒 Read-only conversation.');
            }

            this.bodyEl.innerHTML = '';

            const messages = data.messages || [];
            if (messages.length === 0) {
                this.bodyEl.innerHTML = `<div class="chat-empty">No messages yet. Send a greeting to start coordinating the inspection meeting!</div>`;
            } else {
                messages.forEach(msg => this.appendMessage(msg));
            }

            this.scrollToBottom();
            this.markRead();

            if (data.room && data.room.status === 'closed') {
                this.disableChat('This conversation has been closed.');
            }
        } catch (err) {
            console.error('Chat load error:', err);
            this.bodyEl.innerHTML = `<div class="chat-error">${this.escape(err.message)}</div>`;
        }
    }

    listen() {
        if (!window.Echo) return;

        const channel = window.Echo.private(this.channelName);

        const handleSent = (e) => {
            const senderId = parseInt(e.sender_id, 10);
            if (senderId === this.currentUserId) return;

            // Remove empty placeholder if present
            const emptyEl = this.bodyEl.querySelector('.chat-empty');
            if (emptyEl) emptyEl.remove();

            this.appendMessage(e);
            this.scrollToBottom();
            this.markRead();
        };

        const handleClosed = (e) => {
            const reason = e?.reason || 'closed';
            this.disableChat(`This conversation has been closed (${this.escape(reason)}).`);
        };

        channel.listen('.message.sent', handleSent).listen('message.sent', handleSent);
        channel.listen('.chat.closed', handleClosed).listen('chat.closed', handleClosed);
    }

    async send(e) {
        e.preventDefault();
        const text = this.inputEl.value.trim();
        if (!text) return;

        this.inputEl.value = '';
        this.inputEl.disabled = true;
        const submitBtn = this.formEl.querySelector('.chat-send-btn');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const res = await fetch(`/api/chat-rooms/${this.requestId}/messages`, {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify({ message: text })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message || 'Failed to send message.');
            } else {
                const emptyEl = this.bodyEl.querySelector('.chat-empty');
                if (emptyEl) emptyEl.remove();

                this.appendMessage(data);
                this.scrollToBottom();
            }
        } catch (err) {
            alert('Network error.');
        } finally {
            this.inputEl.disabled = false;
            if (submitBtn) submitBtn.disabled = false;
            this.inputEl.focus();
        }
    }

    async markRead() {
        try {
            await fetch(`/api/chat-rooms/${this.requestId}/read`, {
                method: 'POST',
                headers: this.headers()
            });
        } catch (err) {
            // silent catch
        }
    }

    appendMessage(msgData) {
        const senderId = parseInt(msgData.sender_id, 10);
        const isOwn = senderId === this.currentUserId;

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${isOwn ? 'chat-msg-own' : 'chat-msg-other'}`;

        let timeStr = '';
        if (msgData.created_at) {
            const date = new Date(msgData.created_at);
            timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const senderName = this.escape(msgData.sender_name || 'User');
        const text = this.escape(msgData.message);

        msgDiv.innerHTML = `
            ${!isOwn ? `<div class="chat-sender">${senderName}</div>` : ''}
            <div class="chat-bubble">${text}</div>
            <div class="chat-time">${timeStr}</div>
        `;

        this.bodyEl.appendChild(msgDiv);
    }

    disableChat(reasonText) {
        if (this.inputEl) this.inputEl.disabled = true;
        const submitBtn = this.formEl?.querySelector('.chat-send-btn');
        if (submitBtn) submitBtn.disabled = true;

        let notice = this.wrapper.querySelector('.chat-closed-notice');
        if (!notice) {
            notice = document.createElement('div');
            notice.className = 'chat-closed-notice';
            this.bodyEl.appendChild(notice);
        }
        notice.textContent = reasonText;
        this.scrollToBottom();
    }

    scrollToBottom() {
        if (this.bodyEl) {
            this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
        }
    }

    destroy() {
        if (window.Echo) {
            window.Echo.leave(this.channelName);
        }
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.removeChild(this.wrapper);
        }
        if (window.__activeChat === this) {
            window.__activeChat = null;
        }
    }
}

window.openChat = function (requestId, userId, config = {}) {
    if (window.__activeChat) {
        window.__activeChat.destroy();
    }

    // Fallback userId from state if needed
    const activeUserId = userId || (window.state?.user?.id ? parseInt(window.state.user.id, 10) : 0);

    window.__activeChat = new ChatWidget(requestId, activeUserId, config);
};

// Global click listener for .chat-open-btn
document.addEventListener('click', (event) => {
    const btn = event.target.closest('.chat-open-btn');
    if (btn) {
        event.preventDefault();
        const requestId = parseInt(btn.dataset.requestId, 10);
        const userId = parseInt(btn.dataset.userId || (window.state?.user?.id || 0), 10);
        const config = {
            propertyTitle: btn.dataset.propertyTitle || 'Property Request',
            inspectionSchedule: btn.dataset.inspection || 'Scheduled Meeting'
        };
        if (requestId) {
            window.openChat(requestId, userId, config);
        }
    }
});
