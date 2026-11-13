/** Shared organisation login — no user database. */

// A new name deliberately invalidates the previous ten-hour sessions.
export const SESSION_COOKIE_NAME = "dba_session_v2";

/** Sessions are renewed on user activity, never by a background heartbeat. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60;

export const DASHBOARD_HOME = "/in-behandeling";
