/**
 * Google Calendar Integration — browser-side using Google Identity Services (GIS)
 * 
 * Uses OAuth 2.0 implicit flow (no backend needed).
 * The user provides their Google Cloud Client ID in Settings,
 * then can connect with one click. Events are fetched read/write via REST API.
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status?: string;
  htmlLink?: string;
  colorId?: string;
  creator?: { email?: string };
  organizer?: { email?: string; displayName?: string };
  attendees?: { email: string; responseStatus?: string }[];
  reminders?: { useDefault: boolean };
  calendarId?: string;  // which calendar it came from
}

export interface GoogleCalendarList {
  id: string;
  summary: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
}

export interface GCalConfig {
  clientId: string;
  accessToken: string | null;
  tokenExpiry: number | null;
  connectedEmail: string | null;
  enabledCalendarIds: string[];  // which calendars to show
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSync: string | null;
  redirectUri?: string; // optional override for published domain
}

// Color mapping for Google Calendar color IDs
const GCAL_COLORS: Record<string, string> = {
  '1': '#7986CB', // Lavender
  '2': '#33B679', // Sage
  '3': '#8E24AA', // Grape
  '4': '#E67C73', // Flamingo
  '5': '#F6BF26', // Banana
  '6': '#F4511E', // Tangerine
  '7': '#039BE5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3F51B5', // Blueberry
  '10': '#0B8043', // Basil
  '11': '#D50000', // Tomato
};

export function getGCalColor(colorId?: string): string {
  return colorId && GCAL_COLORS[colorId] ? GCAL_COLORS[colorId] : '#039BE5';
}

// ─── Storage ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mc_gcal_config';

const DEFAULT_CONFIG: GCalConfig = {
  clientId: '',
  accessToken: null,
  tokenExpiry: null,
  connectedEmail: null,
  enabledCalendarIds: [],
  autoSync: true,
  syncIntervalMinutes: 5,
  lastSync: null,
};

export function getGCalConfig(): GCalConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function setGCalConfig(partial: Partial<GCalConfig>): GCalConfig {
  const current = getGCalConfig();
  const updated = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearGCalConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isGCalConnected(): boolean {
  const cfg = getGCalConfig();
  return !!(cfg.accessToken && cfg.tokenExpiry && cfg.tokenExpiry > Date.now());
}

export function getGCalClientId(): string {
  return getGCalConfig().clientId;
}

// ─── GIS Script loading ────────────────────────────────────────────────────────

let gisLoaded = false;
let gisLoadPromise: Promise<void> | null = null;

export function loadGisScript(): Promise<void> {
  if (gisLoaded) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise((resolve, reject) => {
    // Check if already in DOM
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      gisLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => { gisLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

// ─── OAuth Token ────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

/**
 * Initiates OAuth 2.0 sign-in using a popup window.
 * Uses the implicit grant flow via window.open to avoid iframe blocking.
 */
export async function signInWithGoogle(clientId: string): Promise<{
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  email?: string;
  error?: string;
}> {
  const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';
  const cfg = getGCalConfig();
  const REDIRECT_URI = cfg.redirectUri || (window.location.origin + '/oauth-callback.html');

  const state = crypto.randomUUID();

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('include_granted_scopes', 'true');

  const popup = window.open(authUrl.toString(), 'google-oauth', 'width=500,height=650,popup=yes');

  if (!popup) {
    return { success: false, error: 'Popup blocked — please allow popups for this site and try again.' };
  }

  return new Promise((resolve) => {
    let resolved = false;

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'google-oauth-callback') return;
      if (event.data?.state !== state) return;
      if (resolved) return;
      resolved = true;

      window.removeEventListener('message', handleMessage);
      clearInterval(pollTimer);
      popup.close();

      const { access_token, expires_in, error } = event.data;

      if (error || !access_token) {
        resolve({ success: false, error: error || 'No access token received' });
        return;
      }

      // Get user email
      let email = '';
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const data = await userInfo.json();
        email = data.email || '';
      } catch { /* ignore */ }

      resolve({ success: true, accessToken: access_token, expiresIn: Number(expires_in), email });
    };

    window.addEventListener('message', handleMessage);

    // Poll in case popup is closed without completing
    const pollTimer = setInterval(() => {
      if (popup.closed && !resolved) {
        resolved = true;
        window.removeEventListener('message', handleMessage);
        clearInterval(pollTimer);
        resolve({ success: false, error: 'Sign-in cancelled' });
      }
    }, 500);

    // Timeout after 5 minutes
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        window.removeEventListener('message', handleMessage);
        clearInterval(pollTimer);
        popup.close();
        resolve({ success: false, error: 'Sign-in timed out' });
      }
    }, 300_000);
  });
}

/**
 * Silently refresh the token (no popup unless needed)
 */
export async function refreshToken(): Promise<boolean> {
  const cfg = getGCalConfig();
  if (!cfg.clientId) return false;

  try {
    await loadGisScript();
    if (!window.google?.accounts?.oauth2) return false;

    return new Promise((resolve) => {
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: cfg.clientId,
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
        callback: (response: any) => {
          if (response.error) {
            resolve(false);
            return;
          }
          setGCalConfig({
            accessToken: response.access_token,
            tokenExpiry: Date.now() + Number(response.expires_in) * 1000,
          });
          resolve(true);
        },
        error_callback: () => resolve(false),
      });

      tokenClient.requestAccessToken({ prompt: '' });
    });
  } catch {
    return false;
  }
}

/**
 * Sign out / disconnect
 */
export function signOutGoogle(): void {
  const cfg = getGCalConfig();
  if (cfg.accessToken && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(cfg.accessToken);
    } catch { /* ignore */ }
  }
  setGCalConfig({
    accessToken: null,
    tokenExpiry: null,
    connectedEmail: null,
    enabledCalendarIds: [],
    lastSync: null,
  });
}

// ─── API Calls ──────────────────────────────────────────────────────────────────

async function gcalFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let cfg = getGCalConfig();
  
  // Auto-refresh if expired
  if (!cfg.accessToken || !cfg.tokenExpiry || cfg.tokenExpiry < Date.now()) {
    const refreshed = await refreshToken();
    if (!refreshed) throw new Error('Token expired — please reconnect Google Calendar');
    cfg = getGCalConfig();
  }

  const resp = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${cfg.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (resp.status === 401) {
    // Try refresh once
    const refreshed = await refreshToken();
    if (refreshed) {
      const newCfg = getGCalConfig();
      return fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${newCfg.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
    }
    throw new Error('Authentication failed — please reconnect');
  }

  return resp;
}

/**
 * List all calendars the user has access to
 */
export async function listCalendars(): Promise<GoogleCalendarList[]> {
  const resp = await gcalFetch('https://www.googleapis.com/calendar/v3/users/me/calendarList');
  if (!resp.ok) throw new Error(`Failed to list calendars: ${resp.statusText}`);
  const data = await resp.json();
  return (data.items || []).map((cal: any) => ({
    id: cal.id,
    summary: cal.summary || cal.id,
    backgroundColor: cal.backgroundColor,
    foregroundColor: cal.foregroundColor,
    primary: cal.primary || false,
    selected: cal.selected !== false,
  }));
}

/**
 * Fetch events from a specific calendar within a date range
 */
export async function fetchCalendarEvents(
  calendarId: string,
  timeMin: string, // ISO string
  timeMax: string, // ISO string
  maxResults: number = 250,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const resp = await gcalFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`
  );
  if (!resp.ok) throw new Error(`Failed to fetch events: ${resp.statusText}`);
  const data = await resp.json();
  return (data.items || []).map((ev: any) => ({ ...ev, calendarId }));
}

/**
 * Fetch events from ALL enabled calendars
 */
export async function fetchAllEvents(
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const cfg = getGCalConfig();
  const calendarIds = cfg.enabledCalendarIds.length > 0
    ? cfg.enabledCalendarIds
    : ['primary'];

  const results = await Promise.allSettled(
    calendarIds.map(id => fetchCalendarEvents(id, timeMin, timeMax))
  );

  const events: GoogleCalendarEvent[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') events.push(...r.value);
  }

  // Update last sync
  setGCalConfig({ lastSync: new Date().toISOString() });

  return events;
}

/**
 * Create a new event in Google Calendar
 */
export async function createGCalEvent(
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
  }
): Promise<GoogleCalendarEvent> {
  const resp = await gcalFetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      body: JSON.stringify(event),
    }
  );
  if (!resp.ok) throw new Error(`Failed to create event: ${resp.statusText}`);
  return resp.json();
}

/**
 * Push a local task as an event to Google Calendar
 */
export async function pushTaskToGCal(task: {
  title: string;
  description?: string;
  dueDate: string;
}): Promise<GoogleCalendarEvent | null> {
  if (!isGCalConnected()) return null;

  try {
    return await createGCalEvent('primary', {
      summary: `📋 ${task.title}`,
      description: task.description || '',
      start: { date: task.dueDate },
      end: { date: task.dueDate },
    });
  } catch (e) {
    console.error('Failed to push task to Google Calendar:', e);
    return null;
  }
}

// ─── Cached events store (in-memory) ────────────────────────────────────────────

let cachedEvents: GoogleCalendarEvent[] = [];
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export function getCachedGCalEvents(): GoogleCalendarEvent[] {
  return cachedEvents;
}

export async function syncGCalEvents(
  timeMin: string,
  timeMax: string,
  forceRefresh = false,
): Promise<GoogleCalendarEvent[]> {
  if (!isGCalConnected()) return [];

  // Use cache if fresh
  if (!forceRefresh && cachedEvents.length > 0 && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedEvents;
  }

  try {
    cachedEvents = await fetchAllEvents(timeMin, timeMax);
    cacheTimestamp = Date.now();
    return cachedEvents;
  } catch (e) {
    console.error('Google Calendar sync error:', e);
    return cachedEvents; // return stale cache
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Convert a Google Calendar event to a format compatible with CalendarPage CalEvent
 */
export function gCalEventToCalEvent(gev: GoogleCalendarEvent, calColor?: string): {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  color: string;
  category: string;
  description?: string;
  isTask: false;
  isGoogleEvent: true;
  allDay: boolean;
  htmlLink?: string;
  googleEventId: string;
} {
  const isAllDay = !!gev.start.date;
  let date: string;
  let endDate: string | undefined;
  let startTime: string | undefined;
  let endTime: string | undefined;

  if (isAllDay) {
    date = gev.start.date!;
    // Google all-day end dates are exclusive, so subtract 1 day
    if (gev.end.date && gev.end.date !== gev.start.date) {
      const endD = new Date(gev.end.date);
      endD.setDate(endD.getDate() - 1);
      const ed = endD.toISOString().split('T')[0];
      endDate = ed !== date ? ed : undefined;
    }
  } else {
    const startDt = new Date(gev.start.dateTime!);
    const endDt = new Date(gev.end.dateTime!);
    date = startDt.toISOString().split('T')[0];
    startTime = startDt.toTimeString().slice(0, 5);
    endTime = endDt.toTimeString().slice(0, 5);
    const endDateStr = endDt.toISOString().split('T')[0];
    endDate = endDateStr !== date ? endDateStr : undefined;
  }

  return {
    id: `gcal-${gev.id}`,
    title: gev.summary || '(No title)',
    date,
    endDate,
    startTime,
    endTime,
    color: calColor || getGCalColor(gev.colorId),
    category: 'Google Calendar',
    description: gev.description,
    isTask: false,
    isGoogleEvent: true,
    allDay: isAllDay,
    htmlLink: gev.htmlLink,
    googleEventId: gev.id,
  };
}
