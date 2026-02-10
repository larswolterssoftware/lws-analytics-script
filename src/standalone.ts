/**
 * LWS Analytics — Standalone Script
 *
 * Auto-initializes from window globals. Drop this into any HTML/WordPress site:
 *
 * ```html
 * <script>
 *     window.LWS_ANALYTICS_SITE_ID = 'your-site-id';
 *     window.LWS_ANALYTICS_ENDPOINT = 'https://dashboard.lws-analytics.eu/api/track';
 * </script>
 * <script src="https://dashboard.lws-analytics.eu/script.js"></script>
 * ```
 */

import { init } from './index';

(() => {
    const siteId = window.LWS_ANALYTICS_SITE_ID;
    const endpoint = window.LWS_ANALYTICS_ENDPOINT;
    const debug = window.LWS_ANALYTICS_DEBUG ?? false;

    if (!siteId) {
        if (debug) {
            console.warn(
                '[LWS Analytics] No identifier configured. Set window.LWS_ANALYTICS_SITE_ID before loading the script',
            );
        }
        return;
    }

    if (!endpoint) {
        if (debug) {
            console.warn(
                '[LWS Analytics] No endpoint configured. Set window.LWS_ANALYTICS_ENDPOINT before loading the script',
            );
        }
        return;
    }

    init({ siteId, endpoint, debug });
})();
