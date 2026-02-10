/**
 * LWS Analytics Global Type Declarations
 *
 * This file augments the global Window interface with LWS Analytics types.
 * Include this file in your tsconfig.json to get type support for the global
 * window.LwsAnalytics object.
 *
 * In your tsconfig.json, add:
 * {
 *   "compilerOptions": {
 *     "types": ["@lws-analytics/script/global"]
 *   }
 * }
 *
 * Or reference it directly:
 * /// <reference types="@lws-analytics/script/global" />
 */

interface LwsAnalyticsApi {
    /**
     * Manually track a page view
     */
    trackPageView: () => void;

    /**
     * Track a custom event
     * @param name - The name of the custom event
     */
    trackCustomEvent: (name: string) => void;
}

declare global {
    interface Window {
        /**
         * LWS Analytics site identifier (required)
         */
        LWS_ANALYTICS_SITE_ID?: string;

        /**
         * LWS Analytics endpoint URL (required)
         */
        LWS_ANALYTICS_ENDPOINT?: string;

        /**
         * Enable debug mode for LWS Analytics
         */
        LWS_ANALYTICS_DEBUG?: boolean;

        /**
         * LWS Analytics API object
         */
        LwsAnalytics?: LwsAnalyticsApi;
    }
}

export {};
