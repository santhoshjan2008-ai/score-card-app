-- 001_initial_schema.sql
-- Auditable Tournament Scoring System Schema

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'OFFICIAL', 'SCOREKEEPER', 'VIEWER')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'ARCHIVED')),
    organizer_id UUID REFERENCES users(id),
    settings JSONB NOT NULL DEFAULT '{"maxPoints": null, "pointsPerWin": 1, "allowedIncrements": [1, 2, 3]}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    seed_number INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tournament_participant UNIQUE (tournament_id, name)
);

CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    match_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'LIVE', 'FINISHED', 'LOCKED')),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    locked_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tournament_match_number UNIQUE (tournament_id, match_number)
);

CREATE TABLE IF NOT EXISTS match_participants (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    slot VARCHAR(10) NOT NULL CHECK (slot IN ('A', 'B')),
    current_score INTEGER NOT NULL DEFAULT 0 CHECK (current_score >= 0),
    CONSTRAINT uq_match_participant UNIQUE (match_id, participant_id),
    CONSTRAINT uq_match_slot UNIQUE (match_id, slot)
);

CREATE TABLE IF NOT EXISTS score_events (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    actor_id UUID NOT NULL REFERENCES users(id),
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('SCORE_INCREMENT', 'SCORE_CORRECTION', 'SCORE_REVERSAL', 'PENALTY')),
    points INTEGER NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    references_event_id UUID REFERENCES score_events(id),
    reason TEXT,
    match_version_at_time INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    actor_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id VARCHAR(100) NOT NULL,
    payload_before JSONB,
    payload_after JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Performance and Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_score_events_match_id ON score_events(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_score_events_idempotency ON score_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
