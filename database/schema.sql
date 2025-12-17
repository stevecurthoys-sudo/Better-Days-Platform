-- Better Days Platform - Database Schema
-- Unified membership system for democratic community platform

-- Users: Single verified identity across all branches
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- User profiles with location and preferences
CREATE TABLE user_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    location_data JSONB,
    avatar_url VARCHAR(500),
    communication_prefs JSONB DEFAULT '{"video_enabled": true, "audio_enabled": true}',
    service_provider BOOLEAN DEFAULT FALSE,
    membership_tier INTEGER DEFAULT 1
);

-- Forums: Can be geographic, guild, or topic-based
CREATE TABLE forums (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tier INTEGER NOT NULL CHECK (tier >= 1),
    forum_type VARCHAR(50) DEFAULT 'geographic', -- 'geographic', 'guild', 'topic'
    max_members INTEGER DEFAULT 10,
    current_members INTEGER DEFAULT 1,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- Forum members with representative status
CREATE TABLE forum_members (
    id BIGSERIAL PRIMARY KEY,
    forum_id BIGINT REFERENCES forums(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    is_representative BOOLEAN DEFAULT FALSE,
    elected_at TIMESTAMP,
    term_ends_at TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(forum_id, user_id)
);

-- Proposals for democratic decision-making
CREATE TABLE proposals (
    id BIGSERIAL PRIMARY KEY,
    forum_id BIGINT REFERENCES forums(id) ON DELETE CASCADE,
    created_by BIGINT REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    agreement_text TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voting_starts_at TIMESTAMP,
    voting_ends_at TIMESTAMP,
    approval_threshold DECIMAL(5,4) DEFAULT 0.6
);

-- Individual votes with comprehension verification flag
CREATE TABLE votes (
    id BIGSERIAL PRIMARY KEY,
    proposal_id BIGINT REFERENCES proposals(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    vote_value INTEGER CHECK (vote_value IN (-1, 0, 1)), -- -1=against, 0=abstain, 1=for
    understanding_passed BOOLEAN DEFAULT FALSE,
    casted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, user_id)
);

-- Service providers in the marketplace
CREATE TABLE service_providers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    service_type VARCHAR(100) NOT NULL, -- cleaner, gardener, electrician, etc.
    description TEXT,
    hourly_rate DECIMAL(10,2),
    service_radius_km INTEGER DEFAULT 5,
    is_verified BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    membership_fee DECIMAL(10,2) DEFAULT 10.00,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_forum_members_user ON forum_members(user_id);
CREATE INDEX idx_forum_members_forum ON forum_members(forum_id);
CREATE INDEX idx_proposals_forum ON proposals(forum_id);
CREATE INDEX idx_votes_proposal ON votes(proposal_id);
CREATE INDEX idx_votes_user ON votes(user_id);

-- Sample data for testing
INSERT INTO users (email, password_hash, display_name, verified) VALUES
('test@betterdays.app', 'hashed_password_123', 'Alex Johnson', TRUE),
('neighbor@betterdays.app', 'hashed_password_456', 'Sam Wilson', TRUE);

INSERT INTO user_profiles (user_id, bio, service_provider) VALUES
(1, 'Community organizer and gardening enthusiast', FALSE),
(2, 'Licensed electrician with 10 years experience', TRUE);
