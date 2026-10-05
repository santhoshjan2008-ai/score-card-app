# Auditable Tournament Scoring System

An auditable, concurrency-protected desk scoring web application designed to reduce tournament scoring disputes through verified event sourcing, tamper-evident audit trails, role-based authorization, and robust disaster recovery procedures.

---

## 1. Project Purpose & Real-World Principle

Local tournaments often suffer from disputes caused by:
- Accidental button double clicks
- Duplicate network requests and browser retries
- Scorekeepers operating simultaneously from multiple devices
- Stale browser tabs overwriting recent points
- Unrecorded score corrections and deleted history
- Ambiguity over who recorded a score and when

### Core Principle
> **A score is not merely a mutable number. It is the deterministic outcome of a sequence of validated, immutable scoring events.**

This application creates a trustworthy digital scoring process where every score command is authorized, validated against tournament rules, executed inside an atomic database transaction, and recorded with an audit trail.

*Important Note*: Software alone cannot guarantee that human disputes will never occur. Instead, this system improves accuracy, transparency, accountability, and auditable dispute resolution before, during, and after competitive matches.

---

## 2. Technology Stack & Architecture

- **Frontend**: React 19 (Vite), pure modern Vanilla CSS design system (responsive for tablets, laptops, and touchscreens).
- **Backend**: Node.js, Express, Helmet, CORS, Cookie-Parser, Zod schema validation, Rate Limiting.
- **Database**: PostgreSQL (with standard `DATABASE_URL` pool support + embedded disk-backed PostgreSQL engine for zero-setup execution).
- **Security**: Bcrypt password hashing, JWT/cookie authentication, role-based permission middleware (`ADMIN`, `OFFICIAL`, `SCOREKEEPER`, `VIEWER`).

```text
React.js Frontend (Desk UI)
       ↓ (REST API /api/v1 - Idempotency Keys, JWT/Cookies)
Node.js Express Server
       ↓ (ACID Transactions, Row-Level Locks, Optimistic Versioning)
PostgreSQL Database (Schema Migrations, Immutable Events, Audit Logs)
```

---

## 3. Roles and Permission Model

| Role | Permissions & Capabilities |
| :--- | :--- |
| **ADMIN** | Full management: create tournaments, configure rules, register participants, manage users, modify roles, unlock locked matches with mandatory reason, review all audit logs. |
| **OFFICIAL** | Supervise matches, mark matches LIVE, FINISH matches, LOCK matches, perform authorized score corrections with mandatory reasons, inspect reconciliation and audit logs. |
| **SCOREKEEPER** | Operate active scoring desks for assigned LIVE matches, enter validated score commands (`+1`, `+2`, `+3`), view real-time score history. Cannot finish/lock matches, cannot edit locked matches. |
| **VIEWER** | Read-only access to tournaments, matches, live scores, and finished results. All scoring and modifying endpoints return `403 Forbidden`. |

---

## 4. Setup and Installation

### Prerequisites
- **Node.js**: v20+ (tested on Node.js v24)
- **npm**: v10+

### Clone & Install Dependencies
```bash
git clone <repository_url>
cd score-card-app
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(By default, if `DATABASE_URL` is omitted, the backend automatically boots a disk-backed PostgreSQL engine in `./.pgdata` with complete ACID compliance).*

---

## 5. Database Migrations & Seed Data

### Run Migrations
Applies SQL schemas, primary keys, foreign keys, CHECK constraints, and composite unique indexes:
```bash
npm run migrate
```

### Seed Development Data
Populates sample tournaments, participants, and demo accounts:
```bash
npm run seed
```

### Pre-Configured Demo Accounts (Development Only)
| Username | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `admin` | `password123!` | `ADMIN` | Full administrative capabilities |
| `official` | `password123!` | `OFFICIAL` | Head official, can lock and correct scores |
| `scorekeeper1` | `password123!` | `SCOREKEEPER` | Primary desk operator |
| `scorekeeper2` | `password123!` | `SCOREKEEPER` | Concurrent desk operator |
| `viewer` | `password123!` | `VIEWER` | Public spectator (read-only) |

---

## 6. Running the Application

### Development Mode (Runs Frontend & Backend concurrently)
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api/v1`
- Health check: `http://localhost:4000/api/v1/health`

### Production Build
```bash
npm run build
npm run start
```

---

## 7. Running Automated Tests

The test suite validates scoring rules, authentication, role authorization, concurrency, idempotency, match locking, corrections, and the complete Section 51 Final Acceptance Journey:

```bash
# Run all automated tests
npm run test

# Run backend tests individually
npm run test:backend
```

**Test Coverage Summary**:
- `auth.test.js`: Login, generic failure messages, token verification, role enforcement.
- `scoringRules.test.js`: Valid points, rejection of negative increments, net score calculation.
- `scoring.test.js`: Score increment transactions, idempotency deduplication, locked match protection, stale tab detection (409 Conflict), official corrections, and score reconciliation.
- `finalAcceptance.test.js`: Complete 14-step tournament lifecycle execution from tournament creation to match lock and dispute resolution.

---

## 8. Integrity and Dispute-Reduction Mechanisms

1. **Idempotency**: Every scoring button press generates a unique client UUID (`idempotency_key`). Repeated submissions (double clicks, network timeouts) return the original confirmed score without incrementing again.
2. **Concurrency Protection**: Critical scoring commands execute with `SELECT ... FOR UPDATE` row locks and optimistic `match.version` checking. Stale tabs are alerted with `409 STALE_VERSION` and automatically refreshed.
3. **No Destructive Deletion (Undo)**: Undoing a score creates an auditable reversal event (`SCORE_CORRECTION`) referencing the original event ID and requiring a written explanation.
4. **Match Locking**: Finalized matches are locked by Officials. The backend unconditionally blocks score commands on locked matches (`403 MATCH_LOCKED`). Unlocking requires Admin privilege and an audited reason.
5. **Reconciliation Verification**: Desk operators can run `/matches/:id/reconcile` at any time to verify that the displayed score strictly equals the sum of event history.

---

## 9. Backups & Disaster Recovery

- In production PostgreSQL, configure regular WAL backups and `pg_dump`:
  ```bash
  pg_dump -U postgres -d scorecard_db -F c -b -v -f ./backups/scorecard_$(date +%Y%m%d_%H%M%S).dump
  ```
- Detailed restoration procedures and desk emergency operations are documented in [RUNBOOK_AND_DISASTER_RECOVERY.md](docs/RUNBOOK_AND_DISASTER_RECOVERY.md).

---

## 10. Pilot Testing Limitations & Known Risks

1. **Pilot Scope**: This system is designed for controlled pilot testing at local club tournaments before deployment to high-stakes sanctioned events.
2. **Network Dependency**: While client-side debouncing and retry handling are present, authoritative scoring requires backend connectivity to guarantee server-side transaction consistency.
3. **Hardware**: Operators should use tablets or laptops with touch-enabled screens or physical keyboards with adequate battery backup.