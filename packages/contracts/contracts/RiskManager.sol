// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AIAgent.sol";

/**
 * @title RiskManager
 * @notice Multi-layer risk management system
 */
contract RiskManager is Ownable {
    struct RiskMetrics {
        uint256 collateralRatio;
        uint256 utilizationRate;
        uint256 volatilityScore;
        uint256 liquidityScore;
        uint256 concentrationRisk;
    }

    struct RiskThresholds {
        uint256 minCollateralRatio;     // Minimum 150%
        uint256 maxUtilization;         // Maximum 80%
        uint256 maxVolatility;          // Maximum volatility score
        uint256 minLiquidity;           // Minimum liquidity score
        uint256 maxConcentration;       // Maximum 70%
    }

    // Default thresholds
    RiskThresholds public defaultThresholds = RiskThresholds({
        minCollateralRatio: 15000,  // 150%
        maxUtilization: 8000,       // 80%
        maxVolatility: 7000,        // 70
        minLiquidity: 3000,         // 30
        maxConcentration: 7000      // 70%
    });

    // Agent-specific thresholds
    mapping(address => RiskThresholds) public agentThresholds;

    // Risk events
    mapping(address => RiskMetrics) public latestMetrics;

    // Constants
    uint256 public constant BASIS_POINTS = 10000;

    // Events
    event RiskAssessed(address indexed agent, RiskMetrics metrics);
    event RiskMitigationTriggered(address indexed agent, string riskType, RiskMetrics metrics);
    event ThresholdsUpdated(address indexed agent, RiskThresholds thresholds);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Monitor agent risk in real-time
     */
    function monitorAgentRisk(address agent) external returns (RiskMetrics memory) {
        AIAgent.AgentState memory state = AIAgent(agent).getState();

        RiskMetrics memory metrics;

        // Calculate collateral ratio
        metrics.collateralRatio = _calculateCollateralRatio(state);

        // Calculate utilization rate
        metrics.utilizationRate = _calculateUtilizationRate(state);

        // Calculate volatility score
        metrics.volatilityScore = _calculateVolatilityScore(state);

        // Calculate liquidity score
        metrics.liquidityScore = _calculateLiquidityScore(state);

        // Calculate concentration risk
        metrics.concentrationRisk = _calculateConcentrationRisk(state);

        // Store latest metrics
        latestMetrics[agent] = metrics;

        // Check thresholds
        RiskThresholds memory thresholds = agentThresholds[agent].minCollateralRatio > 0
            ? agentThresholds[agent]
            : defaultThresholds;

        if (metrics.collateralRatio < thresholds.minCollateralRatio) {
            _triggerRiskMitigation(agent, "LOW_COLLATERAL_RATIO", metrics);
        }

        if (metrics.concentrationRisk > thresholds.maxConcentration) {
            _triggerRiskMitigation(agent, "HIGH_CONCENTRATION", metrics);
        }

        if (metrics.utilizationRate > thresholds.maxUtilization) {
            _triggerRiskMitigation(agent, "HIGH_UTILIZATION", metrics);
        }

        emit RiskAssessed(agent, metrics);

        return metrics;
    }

    /**
     * @notice Calculate collateral ratio
     */
    function _calculateCollateralRatio(AIAgent.AgentState memory state)
        internal
        pure
        returns (uint256)
    {
        if (state.borrowedUSDC == 0) return type(uint256).max;

        uint256 totalCollateralValue = state.collateralAmount + state.totalAssets;
        return (totalCollateralValue * BASIS_POINTS) / state.borrowedUSDC;
    }

    /**
     * @notice Calculate utilization rate
     */
    function _calculateUtilizationRate(AIAgent.AgentState memory state)
        internal
        pure
        returns (uint256)
    {
        uint256 totalCredit = state.availableCredit + state.borrowedUSDC;
        if (totalCredit == 0) return 0;

        return (state.borrowedUSDC * BASIS_POINTS) / totalCredit;
    }

    /**
     * @notice Calculate volatility score
     */
    function _calculateVolatilityScore(AIAgent.AgentState memory state)
        internal
        pure
        returns (uint256)
    {
        // Simplified - in production use historical price data
        uint256 positionCount = state.positions.length;
        if (positionCount == 0) return 0;

        // Higher position count = potentially higher volatility
        return positionCount > 10 ? 8000 : positionCount * 800;
    }

    /**
     * @notice Calculate liquidity score
     */
    function _calculateLiquidityScore(AIAgent.AgentState memory state)
        internal
        pure
        returns (uint256)
    {
        // Simplified - in production check actual protocol liquidity
        uint256 availableRatio = state.availableCredit * BASIS_POINTS /
            (state.availableCredit + state.borrowedUSDC + 1);

        return availableRatio;
    }

    /**
     * @notice Calculate concentration risk
     */
    function _calculateConcentrationRisk(AIAgent.AgentState memory state)
        internal
        pure
        returns (uint256)
    {
        if (state.positions.length == 0) return 0;

        // Find largest position
        uint256 maxPosition = 0;
        uint256 totalValue = 0;

        for (uint256 i = 0; i < state.positions.length; i++) {
            uint256 positionValue = state.positions[i].amount;
            totalValue += positionValue;

            if (positionValue > maxPosition) {
                maxPosition = positionValue;
            }
        }

        if (totalValue == 0) return 0;

        return (maxPosition * BASIS_POINTS) / totalValue;
    }

    /**
     * @notice Trigger risk mitigation
     */
    function _triggerRiskMitigation(
        address agent,
        string memory riskType,
        RiskMetrics memory metrics
    ) internal {
        emit RiskMitigationTriggered(agent, riskType, metrics);

        // In production, implement actual mitigation actions:
        // - Partial liquidation
        // - Reduce LTV
        // - Force rebalancing
        // - Pause trading
    }

    /**
     * @notice Set agent-specific thresholds
     */
    function setAgentThresholds(address agent, RiskThresholds memory thresholds)
        external
        onlyOwner
    {
        agentThresholds[agent] = thresholds;
        emit ThresholdsUpdated(agent, thresholds);
    }

    /**
     * @notice Get agent risk metrics
     */
    function getAgentMetrics(address agent) external view returns (RiskMetrics memory) {
        return latestMetrics[agent];
    }
}
