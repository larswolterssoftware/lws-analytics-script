/// <reference path="../global.d.ts" />

export interface LwsAnalyticsConfig {
    /**
     * Site identifier (required)
     */
    siteId: string;

    /**
     * Analytics endpoint URL (required)
     */
    endpoint: string;

    /**
     * Enable debug mode
     */
    debug?: boolean;

    /**
     * Automatically track page views on init (default: true)
     */
    trackPageViewOnInit?: boolean;

    /**
     * Enable SPA navigation tracking (default: true)
     */
    trackSpaNavigation?: boolean;

    /**
     * Enable click tracking for elements with data-lwsa-event attribute (default: true)
     */
    trackClicks?: boolean;
}

export interface LwsAnalyticsInstance {
    /**
     * Track a page view
     */
    trackPageView: () => void;

    /**
     * Track a custom event
     * @param name - The name of the custom event
     */
    trackEvent: (name: string) => void;

    /**
     * Destroy the analytics instance and remove event listeners
     */
    destroy: () => void;
}

// Internal state
let instance: LwsAnalyticsInstance | null = null;
let config: LwsAnalyticsConfig | null = null;
let lastTrackedUrl: string | null = null;
let originalPushState: typeof history.pushState | null = null;
let originalReplaceState: typeof history.replaceState | null = null;

const STORAGE_KEY = 'lws_analytics_client_id';

const EVENT_TYPES = {
    PAGE_VIEW: 'page_view',
    CUSTOM: 'custom',
} as const;

function log(...args: unknown[]): void {
    if (config?.debug) {
        console.log('[LWS Analytics]', ...args);
    }
}

function warn(...args: unknown[]): void {
    if (config?.debug) {
        console.warn('[LWS Analytics]', ...args);
    }
}

function generateUniqueId(): string {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return (
        'cid_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    );
}

function getClientId(): string {
    try {
        let clientId = localStorage.getItem(STORAGE_KEY);
        if (!clientId) {
            clientId = generateUniqueId();
            localStorage.setItem(STORAGE_KEY, clientId);
        }
        return clientId;
    } catch {
        // localStorage unavailable (private browsing, etc.)
        return 'session_' + generateUniqueId();
    }
}

function buildPayload(type: string, name: string): Record<string, unknown> {
    return {
        identifier: config?.siteId,
        type: type,
        name: name,
        client_id: getClientId(),
        url: window.location.href,
        path: window.location.pathname,
        referer: document.referrer || null,
        user_agent: navigator.userAgent,
        language: navigator.language || null,
        device_width: window.screen.width,
        device_height: window.screen.height,
        timezone_offset: new Date().getTimezoneOffset(),
        timestamp: new Date().toISOString(),
    };
}

function sendPayload(payload: Record<string, unknown>): void {
    if (!config?.endpoint) {
        warn('No endpoint configured');
        return;
    }

    log('Sending payload:', payload);

    fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
    }).catch((error) => {
        warn('Failed to send payload:', error);
    });
}

function trackPageViewInternal(): void {
    sendPayload(buildPayload(EVENT_TYPES.PAGE_VIEW, 'Page view'));
}

function trackEventInternal(name: string): void {
    if (!name) {
        warn('trackEvent() requires an event name');
        return;
    }
    sendPayload(buildPayload(EVENT_TYPES.CUSTOM, name));
}

function handleClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    const element = target?.closest('[data-lwsa-event]');
    if (!element) return;

    const eventName = element.getAttribute('data-lwsa-event');
    if (eventName) {
        log('Click detected on element:', element);
        log('Event name:', eventName);
        trackEventInternal(eventName);
    }
}

function handleUrlChange(): void {
    const currentUrl = window.location.href;
    if (currentUrl !== lastTrackedUrl) {
        lastTrackedUrl = currentUrl;
        trackPageViewInternal();
    }
}

function handlePopState(): void {
    handleUrlChange();
}

function setupSpaTracking(): void {
    lastTrackedUrl = window.location.href;

    // Override pushState
    originalPushState = history.pushState;
    history.pushState = function (...args) {
        originalPushState?.apply(this, args);
        handleUrlChange();
    };

    // Override replaceState
    originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
        originalReplaceState?.apply(this, args);
        handleUrlChange();
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handlePopState);
}

function teardownSpaTracking(): void {
    if (originalPushState) {
        history.pushState = originalPushState;
        originalPushState = null;
    }
    if (originalReplaceState) {
        history.replaceState = originalReplaceState;
        originalReplaceState = null;
    }
    window.removeEventListener('popstate', handlePopState);
}

// Initialize LWS Analytics
export function init(options: LwsAnalyticsConfig): LwsAnalyticsInstance {
    if (typeof window === 'undefined') {
        console.warn(
            '[LWS Analytics] Cannot initialize in non-browser environment',
        );
        // Return a no-op instance for SSR
        return {
            trackPageView: () => {},
            trackEvent: () => {},
            destroy: () => {},
        };
    }

    // Destroy existing instance if any
    if (instance) {
        instance.destroy();
    }

    // Validate config
    if (!options.siteId) {
        console.warn('[LWS Analytics] No siteId configured');
    }
    if (!options.endpoint) {
        console.warn('[LWS Analytics] No endpoint configured');
    }

    // Set config with defaults
    config = {
        trackPageViewOnInit: true,
        trackSpaNavigation: true,
        trackClicks: true,
        ...options,
    };

    // Setup click tracking
    if (config.trackClicks) {
        document.addEventListener('click', handleClick);
    }

    // Setup SPA navigation tracking
    if (config.trackSpaNavigation) {
        setupSpaTracking();
    }

    // Track initial page view
    if (config.trackPageViewOnInit) {
        if (document.readyState === 'loading') {
            document.addEventListener(
                'DOMContentLoaded',
                trackPageViewInternal,
                { once: true },
            );
        } else {
            trackPageViewInternal();
        }
    }

    // Create instance
    instance = {
        trackPageView: trackPageViewInternal,
        trackEvent: trackEventInternal,
        destroy: () => {
            if (config?.trackClicks) {
                document.removeEventListener('click', handleClick);
            }
            if (config?.trackSpaNavigation) {
                teardownSpaTracking();
            }
            config = null;
            instance = null;
            lastTrackedUrl = null;
        },
    };

    // Also expose globally for compatibility
    window.LwsAnalytics = {
        trackPageView: trackPageViewInternal,
        trackCustomEvent: trackEventInternal,
    };
    log('Initialized with config:', config);

    return instance;
}

/**
 * Track a custom event (requires init() to be called first)
 * @param eventName - The name of the event to track
 */
export function trackEvent(eventName: string): void {
    if (!instance) {
        console.warn('[LWS Analytics] Not initialized. Call init() first.');
        return;
    }
    instance.trackEvent(eventName);
}

/**
 * Track a page view (requires init() to be called first)
 */
export function trackPageView(): void {
    if (!instance) {
        console.warn('[LWS Analytics] Not initialized. Call init() first.');
        return;
    }
    instance.trackPageView();
}

/**
 * Check if LWS Analytics is initialized and ready
 */
export function isReady(): boolean {
    return instance !== null;
}

/**
 * Get the current analytics instance
 */
export function getInstance(): LwsAnalyticsInstance | null {
    return instance;
}

// Re-export types
export type { LwsAnalyticsInstance as LwsAnalytics };
