import { WorkOS } from '@workos-inc/node';
import fs from 'node:fs';
import path from 'node:path';

const WORKOS_SESSION_COOKIE = "workos_session";
const WORKOS_OAUTH_STATE_COOKIE = "workos_oauth_state";
const WORKOS_PKCE_VERIFIER_COOKIE = "workos_pkce_verifier";
const WORKOS_RETURN_TO_COOKIE = "workos_return_to";
function cookieSecureFor(url) {
  return url.protocol === "https:";
}
function toAuthUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName
  };
}
function stripOuterQuotes(value) {
  const trimmed = value.trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if (trimmed.length >= 2 && (first === '"' && last === '"' || first === "'" && last === "'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
function parseWorkosKeysFile(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const k = line.slice(0, eq).trim();
    const v = stripOuterQuotes(line.slice(eq + 1));
    if (!v) continue;
    if (k === "WORKOS_API_KEY" || k === "WORKOS_CLIENT_ID" || k === "WORKOS_REDIRECT_URI" || k === "WORKOS_COOKIE_PASSWORD") {
      out[k] = v;
    }
  }
  return out;
}
function findWorkosKeysPath() {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "workos-keys.txt");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
function readWorkosKeysFile() {
  const p = findWorkosKeysPath();
  if (!p) return {};
  try {
    const text = fs.readFileSync(p, "utf8");
    return parseWorkosKeysFile(text);
  } catch {
    return {};
  }
}
const cachedFromFile = readWorkosKeysFile();
function requireKey(name) {
  const v = cachedFromFile[name] ?? process.env[name];
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(
      `Missing ${name}. Set it in workos-keys.txt (recommended for local dev) or in the environment.`
    );
  }
  return v;
}
function workos() {
  return new WorkOS(requireKey("WORKOS_API_KEY"));
}
function workosClientId() {
  return requireKey("WORKOS_CLIENT_ID");
}
function workosRedirectUri() {
  return requireKey("WORKOS_REDIRECT_URI");
}
function workosCookiePassword() {
  return requireKey("WORKOS_COOKIE_PASSWORD");
}

export { WORKOS_SESSION_COOKIE as W, workosCookiePassword as a, WORKOS_OAUTH_STATE_COOKIE as b, cookieSecureFor as c, WORKOS_PKCE_VERIFIER_COOKIE as d, workosClientId as e, WORKOS_RETURN_TO_COOKIE as f, workosRedirectUri as g, toAuthUser as t, workos as w };
//# sourceMappingURL=workos-NncfcneI.js.map
