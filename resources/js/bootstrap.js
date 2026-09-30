/**
 * We'll load the axios HTTP library which allows us to easily issue requests
 * to our Laravel back-end. This library automatically handles sending the
 * CSRF token as a header based on the value of the "XSRF" token cookie.
 */

import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.Pusher = Pusher;

const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY || (typeof window !== 'undefined' && window.VITE_PUSHER_APP_KEY) || null;

if (pusherKey && pusherKey !== 'undefined') {
    try {
        window.Echo = new Echo({
            broadcaster: 'pusher',
            key: pusherKey,
            cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
            wsHost: import.meta.env.VITE_PUSHER_HOST || undefined,
            wsPort: import.meta.env.VITE_PUSHER_PORT || undefined,
            wssPort: import.meta.env.VITE_PUSHER_PORT || undefined,
            forceTLS: (import.meta.env.VITE_PUSHER_SCHEME || 'https') === 'https',
            enabledTransports: ['ws', 'wss'],
            authEndpoint: '/broadcasting/auth',
            auth: {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Authorization': 'Bearer ' + (localStorage.getItem('estatelink_token') || localStorage.getItem('api_token') || '')
                }
            }
        });
    } catch (e) {
        console.warn('Pusher/Echo initialization failed:', e);
    }
} else {
    // Provide a safe fallback Echo object so methods like window.Echo.channel() don't throw errors
    window.Echo = {
        channel: () => ({ listen: () => ({}), stopListening: () => ({}) }),
        private: () => ({ listen: () => ({}), stopListening: () => ({}) }),
        join: () => ({ here: () => ({ joining: () => ({ leaving: () => ({ listen: () => ({}) }) }) }) }),
        leave: () => {}
    };
}
