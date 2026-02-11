import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getInstance, DEFAULT_ENDPOINT } from '../index';

function setWindowGlobals(
    overrides: Partial<{
        siteId: string;
        debug: boolean;
    }> = {},
) {
    const defaults = {
        siteId: 'test-site',
        debug: false,
    };
    const config = { ...defaults, ...overrides };

    window.LWS_ANALYTICS_SITE_ID = config.siteId;
    window.LWS_ANALYTICS_DEBUG = config.debug;
}

function clearWindowGlobals() {
    delete window.LWS_ANALYTICS_SITE_ID;
    delete window.LWS_ANALYTICS_DEBUG;
    delete window.LwsAnalytics;
}

/**
 * Dynamically import the standalone module with a cache-busting query
 * so each test gets a fresh execution of the IIFE.
 */
let importCounter = 0;
async function loadStandalone() {
    importCounter++;
    await import(/* @vite-ignore */ `../standalone?t=${importCounter}`);
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
    getInstance()?.destroy();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response()));
    localStorage.clear();
    clearWindowGlobals();
});

afterEach(() => {
    getInstance()?.destroy();
    clearWindowGlobals();
    vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Auto-initialization
// ---------------------------------------------------------------------------

describe('standalone script', () => {
    it('auto-initializes when window globals are set', async () => {
        setWindowGlobals();

        await loadStandalone();

        expect(getInstance()).not.toBeNull();
        expect(window.LwsAnalytics).toBeDefined();
    });

    it('sends an initial page view on load', async () => {
        setWindowGlobals();

        await loadStandalone();

        expect(fetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(body.type).toBe('page_view');
        expect(body.identifier).toBe('test-site');
    });

    it('uses the default endpoint when none is configured', async () => {
        setWindowGlobals();

        await loadStandalone();

        expect(fetch).toHaveBeenCalledWith(
            DEFAULT_ENDPOINT,
            expect.any(Object),
        );
    });
});

// ---------------------------------------------------------------------------
// Missing configuration
// ---------------------------------------------------------------------------

describe('standalone script — missing config', () => {
    it('does not initialize when siteId is missing', async () => {
        setWindowGlobals({ siteId: '' });

        await loadStandalone();

        expect(getInstance()).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('does not initialize when no globals are set at all', async () => {
        // Don't call setWindowGlobals()

        await loadStandalone();

        expect(getInstance()).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Debug warnings
// ---------------------------------------------------------------------------

describe('standalone script — debug mode', () => {
    it('warns about missing siteId when debug is enabled', async () => {
        window.LWS_ANALYTICS_DEBUG = true;
        // No siteId set
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await loadStandalone();

        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('No identifier configured'),
        );
    });

    it('does not warn when debug is disabled', async () => {
        // No globals set, debug is off (default)
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await loadStandalone();

        expect(warnSpy).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Global API after standalone init
// ---------------------------------------------------------------------------

describe('standalone script — global API', () => {
    it('exposes window.LwsAnalytics.trackPageView()', async () => {
        setWindowGlobals();

        await loadStandalone();

        (fetch as ReturnType<typeof vi.fn>).mockClear();

        window.LwsAnalytics!.trackPageView();

        expect(fetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(body.type).toBe('page_view');
    });

    it('exposes window.LwsAnalytics.trackCustomEvent()', async () => {
        setWindowGlobals();

        await loadStandalone();

        (fetch as ReturnType<typeof vi.fn>).mockClear();

        window.LwsAnalytics!.trackCustomEvent('form_submit');

        expect(fetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(
            (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
        );
        expect(body.type).toBe('custom');
        expect(body.name).toBe('form_submit');
    });
});
