"""Configuration management"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration"""

    # AI Models
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    PRIMARY_MODEL = "gpt-4o"
    RISK_MODEL = "claude-3-5-sonnet-20241022"

    # Blockchain
    WEB3_PROVIDER_URI = os.getenv("WEB3_PROVIDER_URI", "https://rpc.arc.testnet")
    PRIVATE_KEY = os.getenv("PRIVATE_KEY")

    # Contract Addresses
    RWA_VAULT_ADDRESS = os.getenv("RWA_VAULT_ADDRESS")
    AI_AGENT_ADDRESS = os.getenv("AI_AGENT_ADDRESS")
    RISK_MANAGER_ADDRESS = os.getenv("RISK_MANAGER_ADDRESS")

    # Supabase Database
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
    DATABASE_URL = os.getenv("DATABASE_URL")

    # Upstash Redis
    UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL")
    UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")

    # Decision Parameters
    DECISION_INTERVAL = 300  # 5 minutes
    RISK_CHECK_INTERVAL = 60  # 1 minute
    MAX_POSITION_SIZE = 0.3  # 30% of portfolio
    MIN_SHARPE_RATIO = 1.5

    # Risk Thresholds
    MAX_DRAWDOWN = 0.15  # 15%
    MIN_COLLATERAL_RATIO = 1.5  # 150%
    MAX_CONCENTRATION = 0.7  # 70%

config = Config()
