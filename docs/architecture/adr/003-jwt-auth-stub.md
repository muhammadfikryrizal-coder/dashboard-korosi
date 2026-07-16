# ADR 003: JWT authentication stub

## Status

Accepted

## Context

Current auth is hardcoded `admin` / `pipeline2026` stored in `localStorage` ([`src/lib/auth.js`](../../../src/lib/auth.js)). That is unsuitable once an API exposes operational data.

Per `senior-architect` auth guidance for API-first apps: token-based auth for SPA clients.

## Decision

Implement a **JWT bearer stub**:

- Passwords stored with bcrypt
- `POST /api/v1/auth/login` returns access token
- Protected routes require `Authorization: Bearer <token>`
- Seed user from env (`DEMO_USERNAME` / `DEMO_PASSWORD`)

No OAuth/OIDC/SSO in this scaffold.

## Consequences

**Pros**

- Stateless API auth suitable for SPA
- Easy to swap issuer later (Auth0, corporate IdP)
- Removes plaintext password from frontend source as source of truth

**Cons**

- Token revocation needs denylist/short TTL (not built yet)
- Frontend not wired yet — demo login remains until option-3 work

## Alternatives considered

| Option | Why not now |
|--------|-------------|
| Session cookies | Fine later; JWT is simpler for pure API scaffold |
| API keys only | No per-user role model for operators |
| Keep frontend-only demo auth | Does not protect the new API |
