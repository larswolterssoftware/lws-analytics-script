import { init } from './index';

(() => {
    const siteId = window.LWS_ANALYTICS_SITE_ID;
    const debug = window.LWS_ANALYTICS_DEBUG ?? false;

    if (!siteId) {
        if (debug) {
            console.warn(
                '[LWS Analytics] No identifier configured, please set window.LWS_ANALYTICS_SITE_ID before loading the script',
            );
        }
        return;
    }

    init({ siteId, debug });
})();
