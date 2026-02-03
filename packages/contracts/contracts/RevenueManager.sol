// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RevenueManager
 * @notice Manages revenue distribution for AI agents
 */
contract RevenueManager is Ownable {
    struct RevenueShare {
        address recipient;
        uint256 share;        // Share in basis points (10000 = 100%)
        uint256 claimed;
        uint256 totalEarned;
    }

    // Protocol fee (2%)
    uint256 public constant PROTOCOL_FEE = 200;
    uint256 public constant BASIS_POINTS = 10000;

    // Revenue shares per agent
    mapping(address => RevenueShare[]) public revenueShares;

    // Treasury address
    address public treasury;

    // USDC token
    address public usdc;

    // Events
    event RevenueDistributed(address indexed agent, uint256 totalRevenue, uint256 timestamp);
    event RevenueShareUpdated(address indexed agent, address indexed recipient, uint256 share);
    event RevenueReinvested(address indexed agent, uint256 amount);

    constructor(address _usdc, address _treasury) Ownable(msg.sender) {
        usdc = _usdc;
        treasury = _treasury;
    }

    /**
     * @notice Calculate and distribute revenue for an agent
     */
    function distributeRevenue(address agent) external {
        uint256 totalRevenue = _calculateAgentRevenue(agent);
        require(totalRevenue > 0, "No revenue to distribute");

        // Calculate protocol fee
        uint256 protocolFee = (totalRevenue * PROTOCOL_FEE) / BASIS_POINTS;
        uint256 netRevenue = totalRevenue - protocolFee;

        // Get revenue shares
        RevenueShare[] storage shares = revenueShares[agent];
        require(shares.length > 0, "No revenue shares configured");

        // Distribute to recipients
        for (uint256 i = 0; i < shares.length; i++) {
            uint256 amount = (netRevenue * shares[i].share) / BASIS_POINTS;

            if (shares[i].recipient == address(0)) {
                // Reinvest
                _reinvestRevenue(agent, amount);
            } else {
                // Transfer to recipient
                IERC20(usdc).transfer(shares[i].recipient, amount);
                shares[i].claimed += amount;
                shares[i].totalEarned += amount;
            }
        }

        // Transfer protocol fee to treasury
        IERC20(usdc).transfer(treasury, protocolFee);

        emit RevenueDistributed(agent, totalRevenue, block.timestamp);
    }

    /**
     * @notice Set default revenue shares for an agent
     */
    function setDefaultRevenueShares(address agent, address owner) external onlyOwner {
        delete revenueShares[agent];

        // Asset owner: 60%
        revenueShares[agent].push(RevenueShare({
            recipient: owner,
            share: 6000,
            claimed: 0,
            totalEarned: 0
        }));

        // Reinvestment pool: 20%
        revenueShares[agent].push(RevenueShare({
            recipient: address(0),
            share: 2000,
            claimed: 0,
            totalEarned: 0
        }));

        // Risk reserve: 10%
        revenueShares[agent].push(RevenueShare({
            recipient: treasury,
            share: 1000,
            claimed: 0,
            totalEarned: 0
        }));

        // Agent maintenance: 10%
        revenueShares[agent].push(RevenueShare({
            recipient: agent,
            share: 1000,
            claimed: 0,
            totalEarned: 0
        }));
    }

    /**
     * @notice Calculate agent revenue
     */
    function _calculateAgentRevenue(address agent) internal view returns (uint256) {
        // In production, calculate actual revenue from positions
        // For now, return balance
        return IERC20(usdc).balanceOf(agent);
    }

    /**
     * @notice Reinvest revenue back into agent
     */
    function _reinvestRevenue(address agent, uint256 amount) internal {
        // Transfer to agent for reinvestment
        IERC20(usdc).transfer(agent, amount);
        emit RevenueReinvested(agent, amount);
    }

    /**
     * @notice Get revenue shares for an agent
     */
    function getRevenueShares(address agent) external view returns (RevenueShare[] memory) {
        return revenueShares[agent];
    }

    /**
     * @notice Update treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
}
