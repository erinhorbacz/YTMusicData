import { getAdminToken } from "./config.js";

// The browser generates a random dataset id once (localStorage) and sends it
// as X-Dataset-Id on every request; it scopes that visitor's uploaded data.
const SID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function sidOf(req) {
    const sid = req.get("X-Dataset-Id");
    return sid && SID_PATTERN.test(sid) ? sid : null;
}

// Admin actions (replace the site default, drive enrichment) need the token
// — but only once one is configured; local dev without ADMIN_TOKEN is open.
export function isAdmin(req) {
    const token = getAdminToken();
    if (!token) return true;
    return req.get("X-Admin-Token") === token;
}
