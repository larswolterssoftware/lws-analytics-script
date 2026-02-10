import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    init,
    trackEvent,
    trackPageView,
    isReady,
    getInstance,
    type LwsAnalyticsConfig,
    type LwsAnalyticsInstance,
} from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultConfig: LwsAnalyticsConfig = {
    siteId: 'test-site',
    endpoint: 'https://example.com/api/track',
};

function initAndReturn(overrides: Partial<LwsAnalyticsConfig> = {}) {
    return init({ ...defaultConfig, ...overrides });
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
    // Make sure every test starts with a clean slate
    getInstance()?.destroy();

    // Stub fetch globally so no real requests are made
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response()));

    // Provide a working localStorage (jsdom has one, but reset it)
    localStorage.clear();
});

afterEach(() => {
    getInstance()?.destroy();
    vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// init()
// ---------------------------------------------------------------------------

describe('init()', () => {
    it('returns an analytics instance with the expected API', () => {
        const analytics = initAndReturn();

        expect(analytics).toBeDefined();
        expect(analytics.trackPageView).toBeTypeOf('function');
        expect(analytics.trackEvent).toBeTypeOf('function');
        expect(analytics.destroy).toBeTypeOf('function');
    });

    it('marks the SDK as ready after init', () => {
        expect(isReady()).toBe(false);
        initAndReturn();
        expect(isReady()).toBe(true);
    });

    it('exposes the instance via getInstance()', () => {
        expect(getInstance()).toBeNull();
        const analytics = initAndReturn();
        expect(getInstance()).toBe(analytics);
    });

    it('exposes global window.LwsAnalytics', () => {
        initAndReturn();

        expect(window.LwsAnalytics).toBeDefined();
        expect(window.LwsAnalytics!.trackPageView).toBeTypeOf('function');
        expect(window.LwsAnalytics!.trackCustomEvent).toBeTypeOf('function');
    });

    it('sends an initial page view by default', () => {
        initAndReturn();

        expect(fetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(body.type).toBe('page_view');
        expect(body.name).toBe('Page view');
    });

    it('does not send an initial page view when trackPageViewOnInit is false', () => {
        initAndReturn({ trackPageViewOnInit: false });

        expect(fetch).not.toHaveBeenCalled();
    });

    it('destroys the previous instance when init is called again', () => {
        const first = initAndReturn({ trackPageViewOnInit: false });
        const destroySpy = vi.spyOn(first, 'destroy');

        initAndReturn({ trackPageViewOnInit: false });

        expect(destroySpy).toHaveBeenCalledOnce();
    });

    it('warns when siteId is missing', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        init({ siteId: '' });

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('No site ID configured'),
        );
    });

    it('uses the default endpoint when none is provided', () => {
        init({ siteId: 'test-site' });

        expect(fetch).toHaveBeenCalledWith(
            'https://dashboard.lws-analytics.eu/api/track',
            expect.any(Object),
        );
    });
});

// ---------------------------------------------------------------------------
// trackEvent()
// ---------------------------------------------------------------------------

describe('trackEvent()', () => {
    it('sends a custom event payload', () => {
        initAndReturn({ trackPageViewOnInit: false });

        trackEvent('signup');

        expect(fetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(body.type).toBe('custom');
        expect(body.name).toBe('signup');
        expect(body.identifier).toBe('test-site');
    });

    it('warns and does nothing when SDK is not initialized', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        trackEvent('signup');

        expect(fetch).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Not initialized'),
        );
    });

    it('does not send when event name is empty', () => {
        initAndReturn({ trackPageViewOnInit: false, debug: true });

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        trackEvent('');

        expect(fetch).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            '[LWS Analytics]',
            'trackEvent() requires an event name',
        );
    });
});

// ---------------------------------------------------------------------------
// trackPageView()
// ---------------------------------------------------------------------------

describe('trackPageView()', () => {
    it('sends a page view payload', () => {
        initAndReturn({ trackPageViewOnInit: false });

        trackPageView();

        expect(fetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(body.type).toBe('page_view');
        expect(body.name).toBe('Page view');
    });

    it('warns when SDK is not initialized', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        trackPageView();

        expect(fetch).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Not initialized'),
        );
    });
});

// ---------------------------------------------------------------------------
// Payload structure
// ---------------------------------------------------------------------------

describe('payload structure', () => {
    it('includes all expected fields', () => {
        initAndReturn({ trackPageViewOnInit: false });
        trackEvent('test_event');

        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );

        expect(body).toMatchObject({
            identifier: 'test-site',
            type: 'custom',
            name: 'test_event',
        });

        // These fields should be present (values depend on environment)
        expect(body).toHaveProperty('client_id');
        expect(body).toHaveProperty('url');
        expect(body).toHaveProperty('path');
        expect(body).toHaveProperty('user_agent');
        expect(body).toHaveProperty('language');
        expect(body).toHaveProperty('device_width');
        expect(body).toHaveProperty('device_height');
        expect(body).toHaveProperty('timezone_offset');
        expect(body).toHaveProperty('timestamp');
        expect(body).toHaveProperty('referer');
    });

    it('sends the payload with correct fetch options', () => {
        initAndReturn({ trackPageViewOnInit: false });
        trackEvent('test_event');

        expect(fetch).toHaveBeenCalledWith(
            'https://example.com/api/track',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: true,
            }),
        );
    });
});

// ---------------------------------------------------------------------------
// Client ID persistence
// ---------------------------------------------------------------------------

describe('client ID', () => {
    it('persists the client ID in localStorage', () => {
        initAndReturn({ trackPageViewOnInit: false });
        trackEvent('first');

        const body1 = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        const storedId = localStorage.getItem('lws_analytics_client_id');

        expect(storedId).toBeTruthy();
        expect(body1.client_id).toBe(storedId);
    });

    it('reuses the same client ID across events', () => {
        initAndReturn({ trackPageViewOnInit: false });
        trackEvent('first');
        trackEvent('second');

        const body1 = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        const body2 = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body,
        );

        expect(body1.client_id).toBe(body2.client_id);
    });

    it('generates a fallback ID when localStorage is unavailable', () => {
        // Make localStorage throw
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });

        initAndReturn({ trackPageViewOnInit: false });
        trackEvent('test');

        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(body.client_id).toMatch(/^session_/);
    });
});

// ---------------------------------------------------------------------------
// Click tracking
// ---------------------------------------------------------------------------

describe('click tracking', () => {
    it('tracks clicks on elements with data-lwsa-event attribute', () => {
        initAndReturn({ trackPageViewOnInit: false });

        const button = document.createElement('button');
        button.setAttribute('data-lwsa-event', 'cta_click');
        document.body.appendChild(button);

        button.click();

        expect(fetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(body.type).toBe('custom');
        expect(body.name).toBe('cta_click');

        document.body.removeChild(button);
    });

    it('tracks clicks on nested children of data-lwsa-event elements', () => {
        initAndReturn({ trackPageViewOnInit: false });

        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-lwsa-event', 'card_click');
        const span = document.createElement('span');
        span.textContent = 'Click me';
        wrapper.appendChild(span);
        document.body.appendChild(wrapper);

        span.click();

        expect(fetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(body.name).toBe('card_click');

        document.body.removeChild(wrapper);
    });

    it('does not track clicks on elements without data-lwsa-event', () => {
        initAndReturn({ trackPageViewOnInit: false });

        const button = document.createElement('button');
        document.body.appendChild(button);

        button.click();

        expect(fetch).not.toHaveBeenCalled();

        document.body.removeChild(button);
    });

    it('does not track clicks when trackClicks is disabled', () => {
        initAndReturn({ trackPageViewOnInit: false, trackClicks: false });

        const button = document.createElement('button');
        button.setAttribute('data-lwsa-event', 'cta_click');
        document.body.appendChild(button);

        button.click();

        expect(fetch).not.toHaveBeenCalled();

        document.body.removeChild(button);
    });
});

// ---------------------------------------------------------------------------
// SPA navigation tracking
// ---------------------------------------------------------------------------

describe('SPA navigation tracking', () => {
    it('tracks page views on pushState', () => {
        initAndReturn({ trackPageViewOnInit: false });

        // Clear any calls from init
        (fetch as ReturnType<typeof vi.fn>).mockClear();

        history.pushState({}, '', '/new-page');

        expect(fetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(body.type).toBe('page_view');

        // Clean up URL
        history.pushState({}, '', '/');
    });

    it('tracks page views on replaceState', () => {
        initAndReturn({ trackPageViewOnInit: false });
        (fetch as ReturnType<typeof vi.fn>).mockClear();

        history.replaceState({}, '', '/replaced-page');

        expect(fetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(body.type).toBe('page_view');

        history.replaceState({}, '', '/');
    });

    it('does not double-track when URL has not changed', () => {
        initAndReturn({ trackPageViewOnInit: false });
        (fetch as ReturnType<typeof vi.fn>).mockClear();

        // Push to same URL twice
        const url = '/same-page-' + Date.now();
        history.pushState({}, '', url);
        history.pushState({}, '', url);

        expect(fetch).toHaveBeenCalledTimes(1);

        history.pushState({}, '', '/');
    });

    it('does not track SPA navigation when trackSpaNavigation is disabled', () => {
        initAndReturn({
            trackPageViewOnInit: false,
            trackSpaNavigation: false,
        });
        (fetch as ReturnType<typeof vi.fn>).mockClear();

        history.pushState({}, '', '/should-not-track');

        expect(fetch).not.toHaveBeenCalled();

        history.replaceState({}, '', '/');
    });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('destroy()', () => {
    it('cleans up the instance', () => {
        const analytics = initAndReturn({ trackPageViewOnInit: false });

        analytics.destroy();

        expect(isReady()).toBe(false);
        expect(getInstance()).toBeNull();
    });

    it('stops click tracking after destroy', () => {
        const analytics = initAndReturn({ trackPageViewOnInit: false });
        analytics.destroy();

        const button = document.createElement('button');
        button.setAttribute('data-lwsa-event', 'cta_click');
        document.body.appendChild(button);

        button.click();

        expect(fetch).not.toHaveBeenCalled();

        document.body.removeChild(button);
    });

    it('stops SPA tracking after destroy', () => {
        const analytics = initAndReturn({ trackPageViewOnInit: false });
        analytics.destroy();

        (fetch as ReturnType<typeof vi.fn>).mockClear();

        history.pushState({}, '', '/after-destroy');

        expect(fetch).not.toHaveBeenCalled();

        history.replaceState({}, '', '/');
    });
});

// ---------------------------------------------------------------------------
// Debug logging
// ---------------------------------------------------------------------------

describe('debug mode', () => {
    it('logs messages when debug is enabled', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        initAndReturn({ trackPageViewOnInit: false, debug: true });
        trackEvent('test');

        expect(logSpy).toHaveBeenCalledWith(
            '[LWS Analytics]',
            expect.stringContaining('Sending payload'),
            expect.any(Object),
        );
    });

    it('does not log when debug is disabled', () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        initAndReturn({ trackPageViewOnInit: false, debug: false });
        trackEvent('test');

        const lwsCalls = logSpy.mock.calls.filter(
            (call) => call[0] === '[LWS Analytics]',
        );
        expect(lwsCalls).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
    it('handles fetch failure gracefully', async () => {
        (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
            new Error('Network error'),
        );

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        initAndReturn({ trackPageViewOnInit: false, debug: true });
        trackEvent('test');

        // Wait for the rejected promise to be caught
        await vi.waitFor(() => {
            expect(warnSpy).toHaveBeenCalledWith(
                '[LWS Analytics]',
                'Failed to send payload:',
                expect.any(Error),
            );
        });
    });

    it('does not send payload when endpoint is explicitly set to empty string', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Init with empty endpoint — overrides the default
        init({ siteId: 'test', endpoint: '' });

        // Reset fetch mock to only count calls after init
        (fetch as ReturnType<typeof vi.fn>).mockClear();

        trackEvent('test');

        // fetch should not be called because endpoint is empty
        expect(fetch).not.toHaveBeenCalled();
    });
});
