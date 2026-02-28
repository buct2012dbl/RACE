-- RACE Protocol Multi-User Migration
-- This migration adds user_address columns to support per-user AI agents

-- Add user_address column to agent_decisions
ALTER TABLE agent_decisions ADD COLUMN IF NOT EXISTS user_address TEXT;

-- Add user_address column to risk_reports
ALTER TABLE risk_reports ADD COLUMN IF NOT EXISTS user_address TEXT;

-- Add user_address column to agent_states
ALTER TABLE agent_states ADD COLUMN IF NOT EXISTS user_address TEXT;

-- Create composite indexes for (agent_id, user_address) queries
CREATE INDEX IF NOT EXISTS idx_agent_decisions_user ON agent_decisions(agent_id, user_address);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_user_timestamp ON agent_decisions(agent_id, user_address, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_risk_reports_user ON risk_reports(agent_id, user_address);
CREATE INDEX IF NOT EXISTS idx_risk_reports_user_timestamp ON risk_reports(agent_id, user_address, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_states_user ON agent_states(agent_id, user_address);
CREATE INDEX IF NOT EXISTS idx_agent_states_user_timestamp ON agent_states(agent_id, user_address, timestamp DESC);

-- Create user state cache table for performance optimization
CREATE TABLE IF NOT EXISTS user_state_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL,
    user_address TEXT NOT NULL,
    collateral_amount DECIMAL(20,6),
    borrowed_usdc DECIMAL(20,6),
    available_credit DECIMAL(20,6),
    total_assets DECIMAL(20,6),
    position_count INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, user_address)
);

-- Create indexes for user_state_cache
CREATE INDEX IF NOT EXISTS idx_user_state_cache_agent_user ON user_state_cache(agent_id, user_address);
CREATE INDEX IF NOT EXISTS idx_user_state_cache_last_updated ON user_state_cache(last_updated DESC);

-- Enable RLS on user_state_cache
ALTER TABLE user_state_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for user_state_cache
CREATE POLICY "Enable read access for authenticated users" ON user_state_cache
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert/update for service role" ON user_state_cache
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to update user state cache
CREATE OR REPLACE FUNCTION update_user_state_cache(
    p_agent_id TEXT,
    p_user_address TEXT,
    p_collateral_amount DECIMAL,
    p_borrowed_usdc DECIMAL,
    p_available_credit DECIMAL,
    p_total_assets DECIMAL,
    p_position_count INTEGER
) RETURNS void AS $$
BEGIN
    INSERT INTO user_state_cache (
        agent_id,
        user_address,
        collateral_amount,
        borrowed_usdc,
        available_credit,
        total_assets,
        position_count,
        last_updated
    ) VALUES (
        p_agent_id,
        p_user_address,
        p_collateral_amount,
        p_borrowed_usdc,
        p_available_credit,
        p_total_assets,
        p_position_count,
        NOW()
    )
    ON CONFLICT (agent_id, user_address)
    DO UPDATE SET
        collateral_amount = EXCLUDED.collateral_amount,
        borrowed_usdc = EXCLUDED.borrowed_usdc,
        available_credit = EXCLUDED.available_credit,
        total_assets = EXCLUDED.total_assets,
        position_count = EXCLUDED.position_count,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create view for latest user states
CREATE OR REPLACE VIEW v_latest_user_states AS
SELECT DISTINCT ON (agent_id, user_address)
    id,
    agent_id,
    user_address,
    collateral_amount,
    borrowed_usdc,
    available_credit,
    total_assets,
    position_count,
    timestamp,
    created_at
FROM agent_states
WHERE user_address IS NOT NULL
ORDER BY agent_id, user_address, timestamp DESC;

-- Create view for user decision history
CREATE OR REPLACE VIEW v_user_decision_history AS
SELECT
    agent_id,
    user_address,
    action,
    params,
    risk_score,
    expected_return,
    reasoning,
    timestamp,
    created_at
FROM agent_decisions
WHERE user_address IS NOT NULL
ORDER BY timestamp DESC;

-- Create view for user risk history
CREATE OR REPLACE VIEW v_user_risk_history AS
SELECT
    agent_id,
    user_address,
    collateral_ratio,
    utilization_rate,
    volatility_score,
    liquidity_score,
    concentration_risk,
    overall_risk,
    warnings,
    timestamp,
    created_at
FROM risk_reports
WHERE user_address IS NOT NULL
ORDER BY timestamp DESC;

-- Create materialized view for user statistics (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_statistics AS
SELECT
    s.agent_id,
    s.user_address,
    s.collateral_amount,
    s.borrowed_usdc,
    s.available_credit,
    COUNT(DISTINCT d.id) as total_decisions,
    COUNT(DISTINCT CASE WHEN d.action = 'BORROW_AND_INVEST' THEN d.id END) as invest_count,
    COUNT(DISTINCT CASE WHEN d.action = 'TAKE_PROFIT' THEN d.id END) as profit_count,
    COUNT(DISTINCT CASE WHEN d.action = 'STOP_LOSS' THEN d.id END) as stoploss_count,
    AVG(d.risk_score) as avg_risk_score,
    AVG(d.expected_return) as avg_expected_return,
    MAX(s.timestamp) as last_activity
FROM agent_states s
LEFT JOIN agent_decisions d ON s.agent_id = d.agent_id AND s.user_address = d.user_address
WHERE s.user_address IS NOT NULL
GROUP BY s.agent_id, s.user_address, s.collateral_amount, s.borrowed_usdc, s.available_credit;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_user_stats_agent_user ON mv_user_statistics(agent_id, user_address);

-- Create function to refresh user statistics
CREATE OR REPLACE FUNCTION refresh_user_statistics() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_statistics;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_state_cache IS 'Cache table for frequently accessed user state data (30s TTL)';
COMMENT ON COLUMN user_state_cache.last_updated IS 'Last time this cache entry was updated';
COMMENT ON VIEW v_latest_user_states IS 'View showing the most recent state for each user';
COMMENT ON VIEW v_user_decision_history IS 'View showing all user decisions ordered by timestamp';
COMMENT ON VIEW v_user_risk_history IS 'View showing all user risk reports ordered by timestamp';
COMMENT ON MATERIALIZED VIEW mv_user_statistics IS 'Aggregated statistics per user (refresh periodically)';
