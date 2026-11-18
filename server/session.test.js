import assert from "node:assert/strict";
import test from "node:test";
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from "./session.js";

function responseStub() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}

test("reads the session cookie without confusing it with other cookies", () => {
  assert.equal(
    readSessionCookie({ headers: { cookie: "theme=dark; fintrack_session=header.payload.signature" } }),
    "header.payload.signature",
  );
  assert.equal(readSessionCookie({ headers: { cookie: "theme=dark" } }), "");
});

test("sets a browser-only session cookie and clears it on logout", () => {
  const response = responseStub();
  setSessionCookie(response, "header.payload.signature");
  assert.match(response.headers["Set-Cookie"], /^fintrack_session=header\.payload\.signature;/);
  assert.match(response.headers["Set-Cookie"], /HttpOnly/);
  assert.match(response.headers["Set-Cookie"], /SameSite=Lax/);
  assert.match(response.headers["Set-Cookie"], /Path=\/api/);

  clearSessionCookie(response);
  assert.match(response.headers["Set-Cookie"], /^fintrack_session=;/);
  assert.match(response.headers["Set-Cookie"], /Max-Age=0/);
});
