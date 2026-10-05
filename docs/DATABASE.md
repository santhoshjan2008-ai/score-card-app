# PostgreSQL Database Schema & Integrity Model

## 1. Schema Tables & Relationships

### `users`
- `id UUID PRIMARY KEY`: Unique user identity.
- `username VARCHAR(50) UNIQUE NOT NULL`: Unique handle.
- `email VARCHAR(255) UNIQUE NOT NULL`: Notification and login identity.
- `password_hash VARCHAR(255) NOT NULL`: Secure bcrypt hash (10 rounds).
- `role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'OFFICIAL', 'SCOREKEEPER', 'VIEWER'))`.
- `is_active BOOLEAN NOT NULL DEFAULT true`.
- `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.

### `tournaments`
- `id UUID PRIMARY KEY`.
- `name VARCHAR(150) NOT NULL`.
- `description TEXT`.
- `status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'ARCHIVED'))`.
- `organizer_id UUID REFERENCES users(id)`.
- `settings JSONB NOT NULL DEFAULT '{"allowedIncrements": [1, 2, 3]}'`.
- `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.

### `participants`
- `id UUID PRIMARY KEY`.
- `tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE`.
- `name VARCHAR(100) NOT NULL`.
- `seed_number INTEGER`.
- `CONSTRAINT uq_tournament_participant UNIQUE (tournament_id, name)`.

### `matches`
- `id UUID PRIMARY KEY`.
- `tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE`.
- `match_number VARCHAR(50) NOT NULL`.
- `status VARCHAR(20) NOT NULL CHECK (status IN ('SCHEDULED', 'LIVE', 'FINISHED', 'LOCKED'))`.
- `version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)`: Concurrency control counter.
- `started_at TIMESTAMPTZ`, `finished_at TIMESTAMPTZ`, `locked_at TIMESTAMPTZ`.
- `locked_by_user_id UUID REFERENCES users(id)`.
- `CONSTRAINT uq_tournament_match_number UNIQUE (tournament_id, match_number)`.

### `match_participants`
- `id UUID PRIMARY KEY`.
- `match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE`.
- `participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT`.
- `slot VARCHAR(10) NOT NULL CHECK (slot IN ('A', 'B'))`.
- `current_score INTEGER NOT NULL DEFAULT 0 CHECK (current_score >= 0)`: Materialized score.
- `CONSTRAINT uq_match_participant UNIQUE (match_id, participant_id)`.
- `CONSTRAINT uq_match_slot UNIQUE (match_id, slot)`.

### `score_events`
- `id UUID PRIMARY KEY`.
- `match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE`.
- `participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT`.
- `actor_id UUID NOT NULL REFERENCES users(id)`.
- `event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('SCORE_INCREMENT', 'SCORE_CORRECTION', 'SCORE_REVERSAL', 'PENALTY'))`.
- `points INTEGER NOT NULL`.
- `idempotency_key VARCHAR(100) NOT NULL UNIQUE`.
- `references_event_id UUID REFERENCES score_events(id)`: Points to original event for corrections.
- `reason TEXT`: Mandatory for corrections.
- `match_version_at_time INTEGER NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`.

### `audit_logs`
- `id UUID PRIMARY KEY`.
- `actor_id UUID REFERENCES users(id)`.
- `action VARCHAR(50) NOT NULL`.
- `target_entity_type VARCHAR(50) NOT NULL`, `target_entity_id VARCHAR(100) NOT NULL`.
- `payload_before JSONB`, `payload_after JSONB`.
- `reason TEXT`, `ip_address VARCHAR(45)`.
- `created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`.

## 2. Invariants Protected by the Database
1. A score event can never reference a non-existent match or participant (Foreign Key Constraints).
2. Duplicate idempotency keys are blocked by `UNIQUE(idempotency_key)`.
3. Negative point balances on participants are blocked by `CHECK (current_score >= 0)`.
4. Only valid lifecycle statuses are accepted (`CHECK constraints`).
5. All migrations are tracked in `_schema_migrations`.
