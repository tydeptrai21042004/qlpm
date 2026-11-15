# Backend

All business APIs are implemented on the server. The Express app is created in [`app.js`](app.js), with route groups under [`routes/`](routes/) and PostgreSQL access in [`db/index.js`](db/index.js). `server.js` at the repository root is only the Node/Vercel launcher.

## Design

- `app.js`: same-origin security policy, request size/type limits, user lookup, route registration, static frontend, errors. It exposes `createApp(adapter)` so API-contract tests can supply a fake SQL adapter.
- `routes/*.js`: actual HTTP handlers, staff/student authorization, SQL statements and response contracts. Route modules receive query, audit, notifications and password hashing through a context object.
- `domain/policies.js`: pure business input validation, imported by the live route handlers and covered by unit tests.
- `lib/validation.js`: safe identifiers, text, integers, enumerated values, password verification and cookie handling.
- `db/index.js`: Neon driver with a parameterized `.query(sql, params)` interface; schema bootstrap and compatibility migrations. It is not imported by the browser.

## Mutating data

Room assignment, transfer and checkout use single PostgreSQL statements with writable CTEs and capacity constraints. Those SQL statements must be exercised against a disposable Neon branch before deployment. The HTTP contract tests use fake SQL responses and **do not** validate PostgreSQL concurrency.

## HTTP status conventions

`200/201`: success; `400`: malformed fields; `401`: no valid session; `403`: insufficient privileges; `404`: missing/inaccessible record; `409`: conflicting state; `413`: oversized request; `415`: content type mismatch; `429`: login lockout; `500/503`: unexpected infrastructure failure.

For endpoints and request payloads see [`../docs/API_REFERENCE.md`](../docs/API_REFERENCE.md).
