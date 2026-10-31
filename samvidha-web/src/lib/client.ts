"use client";

/**
 * Shared client helpers: session handling, credential remembering and
 * portal API access. The PHPSESSID lives only in sessionStorage for the
 * lifetime of the tab; remembered credentials (optional) live in
 * localStorage on this device only so the app can re-authenticate itself
 * whenever the portal session expires — data always streams live.
 */

export interface SamvidhaSession {
  username: string;
  phpSessId: string;
  csrfToken: string;
  loggedIn: boolean;
}

const AUTH_KEY = "samvidha_auth";

export function getSession(): SamvidhaSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("samvidha_session");
    return raw ? (JSON.parse(raw) as SamvidhaSession) : null;
  } catch {
    return null;
  }
}

export function setSession(session: SamvidhaSession) {
  sessionStorage.setItem("samvidha_session", JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem("samvidha_session");
}

/* ------------------------------------------------------------------ */
/* Remembered credentials (this device only)                           */
/* ------------------------------------------------------------------ */

export interface SavedCredentials {
  username: string;
  password: string;
}

export function saveCredentials(creds: SavedCredentials) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(creds));
}

export function getSavedCredentials(): SavedCredentials | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as SavedCredentials) : null;
  } catch {
    return null;
  }
}

export function clearCredentials() {
  localStorage.removeItem(AUTH_KEY);
}

/** Log in against the portal and remember both session and credentials. */
export async function loginAndRemember(username: string, password: string) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (json.success && json.session) {
    setSession(json.session);
    saveCredentials({ username, password });
    return json.session as SamvidhaSession;
  }
  throw new Error(json.error || "Invalid username or password.");
}

/* ------------------------------------------------------------------ */
/* API with transparent re-authentication                              */
/* ------------------------------------------------------------------ */

async function callApi(path: string, body: Record<string, unknown>) {
  const session = getSession();
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session, ...body }),
  });
}

/**
 * POST to a portal-backed API route. If the portal session has expired,
 * silently re-authenticates with the remembered credentials and retries
 * once, so every page keeps streaming live data.
 */
export async function apiPost<T = any>(
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  let res = await callApi(path, body);
  let json: any;
  try {
    json = await res.json();
  } catch {
    json = { success: false, error: "Bad response from server." };
  }

  const authFailed =
    res.status === 401 || (json && json.success === false && /authenticat|session/i.test(json.error || ""));

  if (authFailed) {
    const creds = getSavedCredentials();
    if (creds) {
      try {
        await loginAndRemember(creds.username, creds.password);
        res = await callApi(path, body);
        json = await res.json();
      } catch {
        // fall through — caller handles the unsuccessful payload
      }
    }
  }
  return json as T;
}

/** Fire a sync event that every mounted page listens to for a live refresh. */
export function triggerSync() {
  window.dispatchEvent(new CustomEvent("iare:sync"));
}

/** Format a freshness stamp: "31 Oct, 10:42:07 AM". */
export function formatStamp(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return (
    date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    ", " +
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })
  );
}
