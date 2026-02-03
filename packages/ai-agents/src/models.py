"""Data models for AI agents"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from enum import Enum

class InvestmentAction(str, Enum):
    """Investment action types"""
    HOLD = "HOLD"
    BORROW_AND_INVEST = "BORROW_AND_INVEST"
    REBALANCE = "REBALANCE"
    TAKE_PROFIT = "TAKE_PROFIT"
    STOP_LOSS = "STOP_LOSS"

class Position(BaseModel):
    """Position data model"""
    protocol: str
    asset: str
    amount: float
    entry_price: float
    timestamp: int
    stop_loss: float
    take_profit: float

class AgentConfig(BaseModel):
    """Agent configuration"""
    owner: str
    risk_tolerance: int  # 1-10
    target_roi: float  # Annual ROI in basis points
    max_drawdown: float
    strategies: List[str]

class AgentState(BaseModel):
    """Agent state"""
    config: AgentConfig
    rwa_collateral: str
    collateral_amount: float
    borrowed_usdc: float
    available_credit: float
    total_assets: float
    positions: List[Position]

class MarketData(BaseModel):
    """Market data"""
    timestamp: int
    prices: Dict[str, float]
    yield_curves: Dict[str, Dict[str, Any]]
    volatility: Dict[str, float]
    liquidity: Dict[str, float]
    treasury_yield: float

class Opportunity(BaseModel):
    """Investment opportunity"""
    protocol: str
    asset: str
    expected_return: float
    risk_score: float
    liquidity_score: float
    confidence: float

class Decision(BaseModel):
    """Investment decision"""
    action: InvestmentAction
    params: Dict[str, Any]
    risk_score: float
    expected_return: float
    timestamp: int
    reasoning: str

class RiskReport(BaseModel):
    """Risk assessment report"""
    collateral_ratio: float
    utilization_rate: float
    volatility_score: float
    liquidity_score: float
    concentration_risk: float
    overall_risk: float
    warnings: List[str]
