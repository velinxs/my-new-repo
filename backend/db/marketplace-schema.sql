-- GPU Marketplace Extensions to Database Schema

-- Agent registry: GPU owners who provide compute
CREATE TABLE IF NOT EXISTS agents (
    wallet_address TEXT PRIMARY KEY,
    public_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'offline',
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- GPU Capabilities
    gpu_model TEXT,
    gpu_memory_gb INTEGER,
    gpu_count INTEGER DEFAULT 1,

    -- Supported models
    supported_models TEXT, -- JSON array of models they can run

    -- Pricing (in LIBRE tokens)
    price_per_1k_tokens INTEGER DEFAULT 10,
    price_per_image INTEGER DEFAULT 50,
    price_per_video_second INTEGER DEFAULT 100,

    -- Reputation
    reputation_score REAL DEFAULT 1000.0,
    total_requests_completed INTEGER DEFAULT 0,
    total_requests_failed INTEGER DEFAULT 0,
    average_response_time_ms INTEGER DEFAULT 0,

    -- Staking
    staked_tokens INTEGER DEFAULT 0,

    -- Metadata
    agent_version TEXT,
    location TEXT, -- Optional: country/region

    CHECK(status IN ('online', 'offline', 'busy', 'maintenance'))
);

-- Inference requests: tracks all AI requests
CREATE TABLE IF NOT EXISTS inference_requests (
    id TEXT PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    agent_wallet TEXT,

    -- Request details
    request_type TEXT NOT NULL, -- 'chat', 'image', 'video', 'audio'
    model TEXT NOT NULL,
    privacy_tier TEXT NOT NULL DEFAULT 'public',

    -- Status
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_at DATETIME,
    completed_at DATETIME,
    failed_at DATETIME,

    -- Compute metrics
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    inference_time_ms INTEGER DEFAULT 0,

    -- Payment
    cost_libre INTEGER DEFAULT 0,
    paid BOOLEAN DEFAULT 0,

    -- Encrypted data references
    encrypted_input_hash TEXT,
    encrypted_output_hash TEXT,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    CHECK(request_type IN ('chat', 'completion', 'image', 'video', 'audio', 'embedding')),
    CHECK(status IN ('pending', 'assigned', 'processing', 'completed', 'failed', 'cancelled')),
    CHECK(privacy_tier IN ('public', 'private', 'anonymous')),
    FOREIGN KEY (agent_wallet) REFERENCES agents(wallet_address)
);

-- Agent reviews/ratings
CREATE TABLE IF NOT EXISTS agent_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_wallet TEXT NOT NULL,
    user_wallet TEXT NOT NULL,
    request_id TEXT NOT NULL,

    rating INTEGER NOT NULL, -- 1-5 stars
    review_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CHECK(rating >= 1 AND rating <= 5),
    FOREIGN KEY (agent_wallet) REFERENCES agents(wallet_address),
    FOREIGN KEY (request_id) REFERENCES inference_requests(id)
);

-- Agent earnings tracking
CREATE TABLE IF NOT EXISTS agent_earnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_wallet TEXT NOT NULL,
    request_id TEXT NOT NULL,

    libre_earned INTEGER NOT NULL,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    withdrawn BOOLEAN DEFAULT 0,
    transaction_hash TEXT,

    FOREIGN KEY (agent_wallet) REFERENCES agents(wallet_address),
    FOREIGN KEY (request_id) REFERENCES inference_requests(id)
);

-- User balances (off-chain tracking before on-chain settlement)
CREATE TABLE IF NOT EXISTS user_balances (
    wallet_address TEXT PRIMARY KEY,
    libre_balance INTEGER DEFAULT 0,
    libre_staked INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_reputation ON agents(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status ON inference_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_user ON inference_requests(user_wallet);
CREATE INDEX IF NOT EXISTS idx_requests_agent ON inference_requests(agent_wallet);
CREATE INDEX IF NOT EXISTS idx_requests_created ON inference_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_earnings_agent ON agent_earnings(agent_wallet);
CREATE INDEX IF NOT EXISTS idx_reviews_agent ON agent_reviews(agent_wallet);

-- Update existing agent_stats table reference (for backwards compatibility)
-- The 'agents' table above is the new comprehensive version
