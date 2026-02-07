// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AIAgent
 * @notice Autonomous AI agent for DeFi operations
 */
contract AIAgent is Ownable, ReentrancyGuard {
    enum InvestmentAction {
        HOLD,
        BORROW_AND_INVEST,
        REBALANCE,
        TAKE_PROFIT,
        STOP_LOSS
    }

    struct AgentConfig {
        address owner;
        uint256 riskTolerance;      // 1-10 scale
        uint256 targetROI;          // Target annual ROI in basis points
        uint256 maxDrawdown;        // Max drawdown in basis points
        address[] strategies;       // Available strategies
    }

    struct Position {
        address protocol;
        address asset;
        uint256 amount;
        uint256 entryPrice;
        uint256 timestamp;
        uint256 stopLoss;
        uint256 takeProfit;
    }

    struct AgentState {
        AgentConfig config;
        address rwaCollateral;
        uint256 collateralAmount;
        uint256 borrowedUSDC;
        uint256 availableCredit;
        uint256 totalAssets;
        Position[] positions;
    }

    // State
    AgentState public agentState;
    address public controller;      // AI decision engine address
    address public rwaVault;
    address public lendingPool;
    address public usdc;

    // Constants
    uint256 public constant BASIS_POINTS = 10000;

    // Events
    event AgentInitialized(address indexed owner, address rwaCollateral, uint256 amount);
    event DecisionExecuted(InvestmentAction action, uint256 timestamp, bytes params);
    event PositionOpened(address protocol, address asset, uint256 amount);
    event PositionClosed(address protocol, address asset, uint256 amount, int256 pnl);
    event BorrowExecuted(uint256 amount);
    event RepaymentExecuted(uint256 amount);

    modifier onlyController() {
        require(msg.sender == controller, "Only controller");
        _;
    }

    modifier onlyAutonomous() {
        require(msg.sender == controller || msg.sender == address(this), "Not autonomous");
        _;
    }

    constructor(
        address _rwaVault,
        address _lendingPool,
        address _usdc,
        address _controller
    ) Ownable(msg.sender) {
        rwaVault = _rwaVault;
        lendingPool = _lendingPool;
        usdc = _usdc;
        controller = _controller;
    }

    /**
     * @notice Initialize AI agent with RWA collateral
     */
    function initializeAgent(
        address rwaCollateral,
        uint256 collateralAmount,
        AgentConfig memory config
    ) external nonReentrant {
        require(agentState.rwaCollateral == address(0), "Already initialized");

        // Transfer RWA collateral
        IERC20(rwaCollateral).transferFrom(msg.sender, address(this), collateralAmount);

        // Calculate borrowing capacity
        uint256 borrowCapacity = IRWAVault(rwaVault).getBorrowingPower(
            rwaCollateral,
            collateralAmount
        );

        // Initialize state
        agentState.config = config;
        agentState.rwaCollateral = rwaCollateral;
        agentState.collateralAmount = collateralAmount;
        agentState.borrowedUSDC = 0;
        agentState.availableCredit = borrowCapacity;
        agentState.totalAssets = 0;

        emit AgentInitialized(msg.sender, rwaCollateral, collateralAmount);
    }

    /**
     * @notice Add more collateral to the agent
     * @param amount Amount of RWA tokens to add
     */
    function addCollateral(uint256 amount) external nonReentrant {
        require(agentState.rwaCollateral != address(0), "Agent not initialized");
        require(amount > 0, "Invalid amount");

        // Transfer RWA collateral from sender
        IERC20(agentState.rwaCollateral).transferFrom(msg.sender, address(this), amount);

        // Update collateral amount
        agentState.collateralAmount += amount;

        // Recalculate borrowing capacity
        uint256 newBorrowCapacity = IRWAVault(rwaVault).getBorrowingPower(
            agentState.rwaCollateral,
            agentState.collateralAmount
        );

        // Update available credit (total capacity minus already borrowed)
        agentState.availableCredit = newBorrowCapacity - agentState.borrowedUSDC;

        emit CollateralAdded(msg.sender, agentState.rwaCollateral, amount);
    }

    // Event for collateral added
    event CollateralAdded(address indexed user, address indexed token, uint256 amount);

    /**
     * @notice Execute autonomous investment decision
     */
    function makeInvestmentDecision(
        InvestmentAction action,
        bytes memory params
    ) external onlyController nonReentrant {
        if (action == InvestmentAction.BORROW_AND_INVEST) {
            _executeBorrowAndInvest(params);
        } else if (action == InvestmentAction.REBALANCE) {
            _executeRebalance(params);
        } else if (action == InvestmentAction.TAKE_PROFIT) {
            _executeTakeProfit(params);
        } else if (action == InvestmentAction.STOP_LOSS) {
            _executeStopLoss(params);
        }

        emit DecisionExecuted(action, block.timestamp, params);
    }

    /**
     * @notice Borrow USDC and invest
     */
    function _executeBorrowAndInvest(bytes memory params) internal {
        (
            uint256 borrowAmount,
            address dexAddress,
            address tokenOut,
            uint256 minAmountOut
        ) = abi.decode(params, (uint256, address, address, uint256));

        require(borrowAmount <= agentState.availableCredit, "Insufficient credit");

        // Borrow USDC from lending pool
        ILendingPool(lendingPool).borrow(borrowAmount);
        agentState.borrowedUSDC += borrowAmount;
        agentState.availableCredit -= borrowAmount;

        emit BorrowExecuted(borrowAmount);

        // Swap USDC for target token on DEX
        IERC20(usdc).approve(dexAddress, borrowAmount);

        uint256 amountOut = ISimpleDEX(dexAddress).swap(
            usdc,
            tokenOut,
            borrowAmount,
            minAmountOut
        );

        // Get entry price
        uint256 entryPrice = ISimpleDEX(dexAddress).getPrice(usdc, tokenOut);

        // Record position
        Position memory newPosition = Position({
            protocol: dexAddress,
            asset: tokenOut,
            amount: amountOut,
            entryPrice: entryPrice,
            timestamp: block.timestamp,
            stopLoss: 0,
            takeProfit: 0
        });

        agentState.positions.push(newPosition);
        agentState.totalAssets += amountOut;

        emit PositionOpened(dexAddress, tokenOut, amountOut);
    }

    /**
     * @notice Rebalance portfolio
     */
    function _executeRebalance(bytes memory params) internal {
        // Implementation for rebalancing logic
        (uint256[] memory closeIndices, uint256[] memory newAllocations) =
            abi.decode(params, (uint256[], uint256[]));

        // Close specified positions
        for (uint256 i = 0; i < closeIndices.length; i++) {
            _closePosition(closeIndices[i]);
        }

        // Reallocate based on new strategy
        // Implementation depends on specific rebalancing logic
    }

    /**
     * @notice Execute take profit
     */
    function _executeTakeProfit(bytes memory params) internal {
        uint256 positionIndex = abi.decode(params, (uint256));
        _closePosition(positionIndex);
    }

    /**
     * @notice Execute stop loss
     */
    function _executeStopLoss(bytes memory params) internal {
        uint256 positionIndex = abi.decode(params, (uint256));
        _closePosition(positionIndex);
    }

    /**
     * @notice Close a position
     */
    function _closePosition(uint256 index) internal {
        require(index < agentState.positions.length, "Invalid position");

        Position memory position = agentState.positions[index];

        // Withdraw from protocol
        uint256 withdrawn = IYieldProtocol(position.protocol).withdraw(
            position.amount,
            position.asset
        );

        // Calculate PnL
        uint256 currentPrice = _getPrice(position.asset);
        int256 pnl = int256(withdrawn) - int256(position.amount * position.entryPrice / 1e18);

        // Remove position (swap with last and pop)
        agentState.positions[index] = agentState.positions[agentState.positions.length - 1];
        agentState.positions.pop();

        emit PositionClosed(position.protocol, position.asset, withdrawn, pnl);
    }

    /**
     * @notice Get current agent state
     */
    function getState() external view returns (AgentState memory) {
        return agentState;
    }

    /**
     * @notice Get position count
     */
    function getPositionCount() external view returns (uint256) {
        return agentState.positions.length;
    }

    /**
     * @notice Get position by index
     */
    function getPosition(uint256 index) external view returns (Position memory) {
        require(index < agentState.positions.length, "Invalid index");
        return agentState.positions[index];
    }

    /**
     * @notice Get all positions
     */
    function getAllPositions() external view returns (Position[] memory) {
        return agentState.positions;
    }

    /**
     * @notice Calculate stop loss level
     */
    function _calculateStopLoss(address asset) internal view returns (uint256) {
        uint256 currentPrice = _getPrice(asset);
        // 10% stop loss
        return currentPrice * 9000 / BASIS_POINTS;
    }

    /**
     * @notice Calculate take profit level
     */
    function _calculateTakeProfit(address asset) internal view returns (uint256) {
        uint256 currentPrice = _getPrice(asset);
        // 20% take profit
        return currentPrice * 12000 / BASIS_POINTS;
    }

    /**
     * @notice Get asset price (placeholder)
     */
    function _getPrice(address asset) internal view returns (uint256) {
        // In production, integrate with oracle
        return 1e18; // Placeholder
    }

    /**
     * @notice Update controller address
     */
    function setController(address _controller) external onlyOwner {
        controller = _controller;
    }
}

// Interfaces
interface IRWAVault {
    function getBorrowingPower(address rwaToken, uint256 amount) external view returns (uint256);
}

interface ILendingPool {
    function borrow(uint256 amount) external;
    function repay(uint256 amount) external;
}

interface IYieldProtocol {
    function deposit(uint256 amount, address asset) external returns (uint256);
    function withdraw(uint256 shares, address asset) external returns (uint256);
}

interface ISimpleDEX {
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256);
    function getPrice(address token0, address token1) external view returns (uint256);
    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256);
}
