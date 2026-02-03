-- RACE Protocol Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agent Decisions Table
CREATE TABLE IF NOT EXISTS agent_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL,
    action TEXT NOT NULL,
    params JSONB,
    risk_score DECIMAL(5,4),
    expected_return DECIMAL(10,6),
    reasoning TEXT,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_agent_decisions_agent_id ON agent_decisions(agent_id);
CREATE INDEX idx_agent_decisions_timestamp ON agent_decisions(timestamp DESC);

-- Risk Reports Table
CREATE TABLE IF NOT EXISTS risk_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL,
    collateral_ratio DECIMAL(10,4),
    utilization_rate DECIMAL(5,4),
    volatility_score DECIMAL(5,4),
    liquidity_score DECIMAL(5,4),
    concentration_risk DECIMAL(5,4),
    overall_risk DECIMAL(5,4),
    warnings TEXT[],
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_risk_reports_agent_id ON risk_reports(agent_id);
CREATE INDEX idx_risk_reports_timestamp ON risk_reports(timestamp DESC);

-- Agent States Table
CREATE TABLE IF NOT EXISTS agent_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id TEXT NOT NULL,
    collateral_amount DECIMAL(20,6),
    borrowed_usdc DECIMAL(20,6),
    available_credit DECIMAL(20,6),
    total_assets DECIMAL(20,6),
    position_count INTEGER,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_agent_states_agent_id ON agent_states(agent_id);
CREATE INDEX idx_agent_states_timestamp ON agent_states(timestamp DESC);

-- Market Data Table (for caching)
CREATE TABLE IF NOT EXISTS market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_type TEXT NOT NULL,
    data JSONB NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_market_data_type ON market_data(data_type);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for service role, read for authenticated users)
CREATE POLICY "Enable read access for authenticated users" ON agent_decisions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON agent_decisions
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable read access for authenticated users" ON risk_reports
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON risk_reports
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable read access for authenticated users" ON agent_states
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON agent_states
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable read access for authenticated users" ON market_data
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for service role" ON market_data
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
