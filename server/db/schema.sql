-- ostl. database schema
-- Run this once against your PostgreSQL database:
--   psql -U postgres -d ostl -f db/schema.sql

-- Game catalog: every published game on the platform
CREATE TABLE IF NOT EXISTS game_catalog (
    id            SERIAL PRIMARY KEY,
    slug          VARCHAR(100) UNIQUE NOT NULL,
    title         VARCHAR(200) NOT NULL,
    description   TEXT DEFAULT '',
    thumbnail_url VARCHAR(500) DEFAULT '',
    min_players   INTEGER DEFAULT 2,
    max_players   INTEGER DEFAULT 2,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    is_active     BOOLEAN DEFAULT TRUE
);

-- Match history: every completed match
CREATE TABLE IF NOT EXISTS match_history (
    id            SERIAL PRIMARY KEY,
    room_id       VARCHAR(100) NOT NULL,
    game_slug     VARCHAR(100) REFERENCES game_catalog(slug) ON DELETE SET NULL,
    player1_uuid  VARCHAR(100) NOT NULL,
    player2_uuid  VARCHAR(100) NOT NULL,
    started_at    TIMESTAMPTZ DEFAULT NOW(),
    ended_at      TIMESTAMPTZ DEFAULT NOW(),
    duration_ms   INTEGER DEFAULT 0,
    winner_uuid   VARCHAR(100)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_match_history_game    ON match_history(game_slug);
CREATE INDEX IF NOT EXISTS idx_match_history_player1 ON match_history(player1_uuid);
CREATE INDEX IF NOT EXISTS idx_match_history_player2 ON match_history(player2_uuid);
CREATE INDEX IF NOT EXISTS idx_match_history_ended   ON match_history(ended_at);

-- Seed the existing dummy game so the platform has at least one entry
INSERT INTO game_catalog (slug, title, description, thumbnail_url)
VALUES (
    'dummy-game',
    'Ostl Sandbox Engine',
    'The premier benchmark test for the P2P WebRTC data channels. Move your square with WASD / Arrow Keys.',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop'
)
ON CONFLICT (slug) DO NOTHING;
