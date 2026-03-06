

## Problem Analysis

There are **two distinct issues** causing the errors:

### Issue 1: `ERR_BLOCKED_BY_RESPONSE` (Lovable preview)
The Lovable editor runs your app inside an **iframe**. When `window.open()` is called from within an iframe, `window.location.origin` returns the Lovable preview URL (e.g., `https://id-preview--fa805700-eac5-449b-9240-02073fdf794a.lovable.app`). This origin is **not** whitelisted in your Google Cloud Console, so Google blocks it. Additionally, popup behavior from iframes is unreliable.

### Issue 2: `Error 401: invalid_client` (pages.dev)
The redirect URI is computed dynamically as `window.location.origin + '/oauth-callback.html'`. If the **Authorized JavaScript Origins** in Google Cloud Console don't include the exact `pages.dev` domain, or there's a mismatch, Google returns `invalid_client`.

## Plan

### 1. Show the exact redirect URI in the settings UI
Display the computed redirect URI right below the Client ID input so the user can see exactly what URL needs to be whitelisted. This removes all guesswork. Include a copy button.

### 2. Also show the required JavaScript Origin
Display `window.location.origin` so the user knows exactly what to add to **Authorized JavaScript Origins** in Google Cloud Console.

### 3. Add a configurable redirect URI override
Allow the user to optionally set a custom redirect URI (e.g., their published `pages.dev` URL) so the OAuth flow always uses a consistent, known domain regardless of where the app is loaded from. This is critical for the Lovable preview case.

### 4. Warn when running inside an iframe
Detect if the app is inside an iframe (`window.self !== window.top`) and show a clear warning that Google OAuth must be tested from the published/deployed URL, not the Lovable preview.

### Technical Details

**Files to edit:**
- `src/pages/SettingsPage.tsx` -- Add redirect URI display, JS origin display, iframe warning, and optional redirect override input
- `src/lib/googleCalendar.ts` -- Read optional redirect URI override from config; add `redirectUri` to `GCalConfig`

**Config change in `GCalConfig`:**
```typescript
redirectUri?: string; // optional override for published domain
```

**Redirect URI logic:**
```typescript
const REDIRECT_URI = cfg.redirectUri || (window.location.origin + '/oauth-callback.html');
```

**Iframe detection in Settings UI:**
```typescript
const isInIframe = window.self !== window.top;
// Show warning banner if true
```

