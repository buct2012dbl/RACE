// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OracleAggregator
 * @notice Aggregates data from multiple oracle sources
 */
contract OracleAggregator is Ownable {
    struct DataSource {
        address oracle;
        uint256 weight;
        uint256 timestamp;
        uint256 value;
    }

    struct MarketSignals {
        uint256 treasuryYield;
        uint256 volatilityIndex;
        uint256 liquidityScore;
        int256 marketSentiment;
    }

    // RWA oracles
    mapping(address => DataSource[]) public rwaOracles;

    // Market data
    MarketSignals public latestSignals;

    // Minimum required oracles
    uint256 public constant MIN_ORACLES = 3;

    // Events
    event OracleAdded(address indexed rwaToken, address indexed oracle, uint256 weight);
    event OracleRemoved(address indexed rwaToken, address indexed oracle);
    event ValueUpdated(address indexed rwaToken, uint256 value, uint256 timestamp);
    event MarketSignalsUpdated(MarketSignals signals, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Get RWA value from multiple oracles
     */
    function getRWAValue(address rwaToken) public view returns (uint256) {
        DataSource[] memory sources = rwaOracles[rwaToken];
        require(sources.length >= MIN_ORACLES, "Insufficient oracles");

        uint256 totalWeight = 0;
        uint256 weightedSum = 0;

        // Calculate weighted average
        for (uint256 i = 0; i < sources.length; i++) {
            weightedSum += sources[i].value * sources[i].weight;
            totalWeight += sources[i].weight;
        }

        require(totalWeight > 0, "No oracle weight");

        return weightedSum / totalWeight;
    }

    /**
     * @notice Add oracle for RWA token
     */
    function addOracle(
        address rwaToken,
        address oracle,
        uint256 weight
    ) external onlyOwner {
        require(oracle != address(0), "Invalid oracle");
        require(weight > 0, "Invalid weight");

        rwaOracles[rwaToken].push(DataSource({
            oracle: oracle,
            weight: weight,
            timestamp: block.timestamp,
            value: 0
        }));

        emit OracleAdded(rwaToken, oracle, weight);
    }

    /**
     * @notice Update oracle value
     */
    function updateOracleValue(
        address rwaToken,
        uint256 oracleIndex,
        uint256 value
    ) external onlyOwner {
        DataSource[] storage sources = rwaOracles[rwaToken];
        require(oracleIndex < sources.length, "Invalid index");

        sources[oracleIndex].value = value;
        sources[oracleIndex].timestamp = block.timestamp;

        emit ValueUpdated(rwaToken, value, block.timestamp);
    }

    /**
     * @notice Get market signals
     */
    function getMarketSignals() public view returns (MarketSignals memory) {
        return latestSignals;
    }

    /**
     * @notice Update market signals
     */
    function updateMarketSignals(
        uint256 treasuryYield,
        uint256 volatilityIndex,
        uint256 liquidityScore,
        int256 marketSentiment
    ) external onlyOwner {
        latestSignals = MarketSignals({
            treasuryYield: treasuryYield,
            volatilityIndex: volatilityIndex,
            liquidityScore: liquidityScore,
            marketSentiment: marketSentiment
        });

        emit MarketSignalsUpdated(latestSignals, block.timestamp);
    }

    /**
     * @notice Get US Treasury yield (mock)
     */
    function getUSTreasuryYield() public view returns (uint256) {
        return latestSignals.treasuryYield;
    }

    /**
     * @notice Get DeFi rates (mock)
     */
    function getDeFiRates() public pure returns (uint256[] memory) {
        uint256[] memory rates = new uint256[](3);
        rates[0] = 800;  // 8% Aave
        rates[1] = 750;  // 7.5% Compound
        rates[2] = 900;  // 9% Curve
        return rates;
    }

    /**
     * @notice Get volatility index
     */
    function getVolatilityIndex() public view returns (uint256) {
        return latestSignals.volatilityIndex;
    }

    /**
     * @notice Get liquidity score
     */
    function getLiquidityScore() public view returns (uint256) {
        return latestSignals.liquidityScore;
    }

    /**
     * @notice Get market sentiment
     */
    function getMarketSentiment() public view returns (int256) {
        return latestSignals.marketSentiment;
    }

    /**
     * @notice Get oracle count for RWA token
     */
    function getOracleCount(address rwaToken) external view returns (uint256) {
        return rwaOracles[rwaToken].length;
    }
}
