# @lws-analytics/script

A complete analytics SDK for LWS Analytics. Works with React, Vue, Next.js, and any JavaScript/TypeScript project.

**No external script tag required** - just install the package and start tracking.

## Installation

```bash
npm install @lws-analytics/script
```

## Quick start

```typescript
import { init, trackEvent } from '@lws-analytics/script';

// Initialize once in your app entry point
init({
    siteId: 'your-site-id',
    endpoint: 'https://dashboard.lws-analytics.eu/api/track',
});

// Track custom events anywhere in your app
trackEvent('button_click');
```

## Features

- ✅ **Full TypeScript support** - Complete type definitions included
- ✅ **SPA navigation tracking** - Automatically tracks page views on route changes
- ✅ **Click tracking** - Track clicks on elements with `data-lwsa-event` attribute
- ✅ **SSR compatible** - Safe to use with Next.js, Nuxt, etc.
- ✅ **Lightweight** - No dependencies
- ✅ **Privacy-friendly** - No cookies, uses localStorage for client ID

## React example

```tsx
// app/layout.tsx or index.tsx
import { init } from '@lws-analytics/script';

// Initialize once at app startup
init({
    siteId: 'your-site-id',
    endpoint: 'https://dashboard.lws-analytics.eu/api/track',
});

export default function RootLayout({ children }) {
    return <html><body>{children}</body></html>;
}
```

```tsx
// components/MyButton.tsx
import { trackEvent } from '@lws-analytics/script';

function MyButton() {
    const handleClick = () => {
        trackEvent('cta_button_clicked');
    };

    return <button onClick={handleClick}>Click me</button>;
}
```

### Using data attributes

```tsx
// Clicks are automatically tracked
<button data-lwsa-event="create_account_clicked">
    Create account
</button>

<a href="/pricing" data-lwsa-event="pricing_link_clicked">
    See pricing
</a>
```

## Next.js example

```tsx
// app/providers.tsx
'use client';

import { useEffect } from 'react';
import { init } from '@lws-analytics/script';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        init({
            siteId: 'your-site-id',
            endpoint: 'https://dashboard.lws-analytics.eu/api/track',
        });
    }, []);

    return <>{children}</>;
}
```

```tsx
// app/layout.tsx
import { AnalyticsProvider } from './providers';

export default function RootLayout({ children }) {
    return (
        <html>
            <body>
                <AnalyticsProvider>{children}</AnalyticsProvider>
            </body>
        </html>
    );
}
```

## API reference

### `init(config)`

Initialize the analytics SDK. Call this once at app startup.

| Parameter                    | Type      | Default | Description                                     |
|------------------------------|-----------|---------|-------------------------------------------------|
| `config.siteId`              | `string`  | -       | Your site identifier (required)                 |
| `config.endpoint`            | `string`  | -       | The analytics endpoint URL (required)           |
| `config.debug`               | `boolean` | `false` | Enable debug logging                            |
| `config.trackPageViewOnInit` | `boolean` | `true`  | Automatically track page view on init           |
| `config.trackSpaNavigation`  | `boolean` | `true`  | Track page views on SPA navigation              |
| `config.trackClicks`         | `boolean` | `true`  | Track clicks on elements with `data-lwsa-event` |

**Returns:** `LwsAnalyticsInstance` with `trackPageView()`, `trackEvent()`, and `destroy()` methods.

### `trackEvent(eventName)`

Track a custom event.

| Parameter   | Type     | Description           |
|-------------|----------|-----------------------|
| `eventName` | `string` | The name of the event |

### `trackPageView()`

Manually trigger a page view. Useful if you disabled automatic tracking.

### `isReady()`

Returns `true` if analytics is initialized.

### `getInstance()`

Returns the current analytics instance, or `null` if not initialized.

## Using global types (alternative)

If you're using the external script instead of this package, you can still get TypeScript support:

**In your `tsconfig.json`:**

```json
{
    "compilerOptions": {
        "types": ["@lws-analytics/script/global"]
    }
}
```

Then use the global functions:

```typescript
window.lwsa?.('button_click');
window.LwsAnalytics?.trackPageView();
```

## License

MIT
