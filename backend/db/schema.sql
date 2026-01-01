-- Proof of Work Token Database Schema

-- Tasks table: stores all task requests and their completion status
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    requester_wallet TEXT NOT NULL,
    agent_wallet TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    compute_tokens_used INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    output_text TEXT,
    output_hash TEXT,
    proof_submitted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    CHECK(status IN ('pending', 'in_progress', 'completed', 'verified', 'failed'))
);

-- Work proofs table: tracks all on-chain proof submissions
CREATE TABLE IF NOT EXISTS work_proofs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    compute_tokens INTEGER NOT NULL,
    output_hash TEXT NOT NULL,
    agent_wallet TEXT NOT NULL,
    transaction_hash TEXT,
    block_number INTEGER,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Agent stats table: aggregated statistics per agent
CREATE TABLE IF NOT EXISTS agent_stats (
    agent_wallet TEXT PRIMARY KEY,
    total_tasks_completed INTEGER DEFAULT 0,
    total_compute_tokens INTEGER DEFAULT 0,
    total_tokens_earned INTEGER DEFAULT 0,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_proofs_task ON work_proofs(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_wallet ON tasks(agent_wallet);
