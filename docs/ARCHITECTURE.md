# Auditable Tournament Scoring System — Architecture Specification

## 1. System Overview
The **Auditable Tournament Scoring System** is designed for scorekeepers and tournament officials to conduct verified, tamper-evident scoring at local tournaments. 

The core architectural principle: **A score is not merely a number; a score is the deterministic result of an ordered, immutable sequence of validated score events.**

## 2. Structural Layering
- **Client (React.js + Vite)**:
  - Touch-first, high-visibility scoring pad.
  - Client-side debouncing and optimistic local UUID generation for idempotency keys.
  - Explicit multi-state presentation: `ONLINE`, `OFFLINE`, `SYNCING`, `CONFIRMED`, `REJECTED`, `LOCKED`.
  - Zero authoritative state is kept purely in client memory or `localStorage`.
- **API Server (Node.js + Express)**:
  - RESTful architecture mounted under `/api/v1`.
  - Security headers via `Helmet`, CORS restrictions, rate limiting on sensitive endpoints.
  - Zod validation schemas for headers, parameters, and bodies.
  - Role-based authorization middleware enforcing least privilege (`ADMIN`, `OFFICIAL`, `SCOREKEEPER`, `VIEWER`).
- **Database Engine (PostgreSQL)**:
  - Supports standard PostgreSQL via `DATABASE_URL` (with `pg.Pool`).
  - Contains self-hosted embedded PostgreSQL engine (`@electric-sql/pglite`) for local zero-config runs and continuous integration.
  - ACID transactions, row-level locking (`SELECT ... FOR UPDATE`), optimistic versioning (`matches.version`), foreign keys, check constraints, and composite unique indexes.

## 3. Concurrency & Idempotency Design
- **Idempotency**: Every scoring command includes a client-generated UUID `idempotency_key`. The backend database enforces `UNIQUE (idempotency_key)`. If a request is resent due to double clicks, network timeout, or browser refresh, the server identifies the duplicate and returns the previously processed result with `isDuplicate: true` without re-applying points.
- **Concurrency**: When scoring commands arrive simultaneously from two desk operators, transactions acquire a row-level lock on the match record. If a client transmits a stale `expectedVersion`, the backend returns `409 STALE_VERSION`, instructing the client to pull the latest authoritative score.

## 4. Undo and Correction Strategy
- Destructive deletions (`DELETE FROM score_events`) are strictly prohibited.
- Undos and score corrections create a new `score_events` record with `event_type = 'SCORE_CORRECTION'`, negative/compensating points, linked `references_event_id`, and a mandatory human-readable `reason` (minimum 4 characters).
- Both the original event and the correction remain permanently visible in the audit timeline.
- An official reconciliation endpoint (`/matches/:id/reconcile`) computes the sum of all historical events and verifies parity with materialized match scores.
