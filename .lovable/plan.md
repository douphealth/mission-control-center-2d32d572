

## Root Cause

The `invalid_client` / `ERR_BLOCKED_BY_RESPONSE` error happens because of an **origin mismatch**:

- Your Google Cloud Console has `https://mission-control-center-2d32d572.pages.dev` configured
- But you're testing from the **Lovable preview** where the origin is `https://id-preview--fa805700-eac5-449b-9240-02073fdf794a.lovable.app`
- The **Published URL Override** field is **empty**, so the app sends the preview origin to Google, which doesn't match anything whitelisted
- Your project is also **not published**, so there's no way to test from the pages.dev domain directly

The session replay confirms: the popup opens, Google rejects it immediately, popup closes, you see "Sign-in cancelled".

## Plan

### 1. Auto-detect and pre-fill the redirect override when in iframe
When the app detects it's running inside an iframe (Lovable preview), automatically suggest and pre-fill the Published URL Override field with the user's configured pages.dev domain. This eliminates the manual step that's currently being missed.

### 2. Block the Connect button when override is needed but missing
When in an iframe and no redirect override is set, disable the "Connect with Google" button and show a clear inline message: "Set your Published URL Override below before connecting — Google OAuth cannot work from the preview origin."

### 3. Update the postMessage origin check in signInWithGoogle
Currently line 192 checks `event.origin !== window.location.origin`. When using a redirect override pointing to a different domain, the callback page posts from the override's origin, not the preview origin. This check must account for the override domain.

### 4. Update the setup guide to mention the redirect URI in step 3
The setup guide currently tells users to add `window.location.origin` as the JS origin, but doesn't mention the redirect URI. Add a step for adding the redirect URI shown in the "Add these to your Google Cloud Console" box.

### Technical Details

**Files to edit:**
- `src/pages/SettingsPage.tsx` — Pre-fill override when in iframe, disable Connect when override missing in iframe, update setup guide step 3
- `src/lib/googleCalendar.ts` — Fix postMessage origin check on line 192 to accept messages from the redirect override's origin
- `public/oauth-callback.html` — Update to post message with `'*'` target origin (or the opener's origin), since opener and callback may be on different domains

**Key code change in `googleCalendar.ts`:**
```typescript
// Line 192: accept messages from override origin too
const expectedOrigin = cfg.redirectUri 
  ? new URL(cfg.redirectUri).origin 
  : window.location.origin;
if (event.origin !== expectedOrigin) return;
```

**Key change in `oauth-callback.html`:**
```javascript
// Post to opener regardless of origin mismatch
// The state parameter provides CSRF protection
window.opener.postMessage({ ... }, '*');
```

**Key change in `SettingsPage.tsx`:**
```typescript
// When in iframe, show mandatory override with helpful pre-fill
if (isInIframe && !gcalRedirectOverride) {
  // Show warning + disable Connect button
}
```

