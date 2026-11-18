export const SESSION_COOKIE_NAME = "fintrack_session";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

function cookieAttributes(maxAge) {
  return [
    "Path=/api",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
}

export function readSessionCookie(req) {
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const entry = (req.headers.cookie || "").split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : "";
}

export function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=${token}; ${cookieAttributes(SESSION_MAX_AGE)}`);
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; ${cookieAttributes(0)}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}
