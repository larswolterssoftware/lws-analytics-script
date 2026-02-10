import { init } from './index';

const DEFAULT_ENDPOINT = 'https://dashboard.lws-analytics.eu/api/track';

(() => {
    const siteId = window.LWS_ANALYTICS_SITE_ID;
    const endpoint = window.LWS_ANALYTICS_ENDPOINT || DEFAULT_ENDPOINT;
    const debug = window.LWS_ANALYTICS_DEBUG ?? false;

    if (!siteId) {
        if (debug) {
            console.warn(
                '[LWS Analytics] No identifier configured. Set window.LWS_ANALYTICS_SITE_ID before loading the script',
            );
        }
        return;
    }

    init({ siteId, endpoint, debug });
})();
