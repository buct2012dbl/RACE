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

    // User Automation Preferences
    enum Strategy {
        CONSERVATIVE,
        BALANCED,
        AGGRESSIVE
    }

    struct UserPreferences {
        bool autoDecisionsEnabled;      // User enables/disables AI automation
        address decisionController;      // User can set their own controller
        uint256 maxBorrowPerDecision;   // User sets max borrow limit
        uint256 cooldownPeriod;         // Min time between decisions (seconds)
        uint256 lastDecisionTime;       // Track last decision timestamp
        Strategy strategy;               // User's preferred strategy
    }

    // State - Multi-User Architecture
    mapping(address => AgentState) public userStates;
    mapping(address => UserPreferences) public userPreferences;

    // User tracking
    address[] private allUsers;
    mapping(address => bool) private hasAgent;

    // System-level analytics
    struct SystemStats {
        uint256 totalCollateral;
        uint256 totalBorrowed;
        uint256 totalUsers;
        uint256 totalPositions;
    }
    SystemStats public systemStats;

    address public controller;      // AI decision engine address
    address public rwaVault;
    address public lendingPool;
    address public usdc;

    // Constants
    uint256 public constant BASIS_POINTS = 10000;

    // Events - Multi-User
    event AgentInitialized(address indexed user, address indexed owner, address rwaCollateral, uint256 amount);
    event DecisionExecuted(address indexed user, InvestmentAction action, uint256 timestamp, bytes params);
    event PositionOpened(address indexed user, address protocol, address asset, uint256 amount);
    event PositionClosed(address indexed user, address protocol, address asset, uint256 amount, int256 pnl);
    event BorrowExecuted(address indexed user, uint256 amount);
    event RepaymentExecuted(address indexed user, uint256 amount);

    // Automation Events
    event AutomationEnabled(address indexed user, address indexed controller, uint256 maxBorrow, uint256 cooldown, Strategy strategy);
    event AutomationDisabled(address indexed user);
    event AutomationUpdated(address indexed user, uint256 maxBorrow, uint256 cooldown, Strategy strategy);

    modifier onlyController() {
        require(msg.sender == controller, "Only controller");
        _;
    }

    modifier onlyControllerOrUser(address user) {
        UserPreferences memory prefs = userPreferences[user];

        // Allow if caller is the user themselves
        if (msg.sender == user) {
            _;
            return;
        }

        // Allow if automation is enabled and caller is authorized controller
        require(
            prefs.autoDecisionsEnabled && msg.sender == prefs.decisionController,
            "Not authorized"
        );

        // Check cooldown period
        require(
            block.timestamp >= prefs.lastDecisionTime + prefs.cooldownPeriod,
            "Cooldown period active"
        );

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
     * @notice Initialize AI agent with RWA collateral (per-user)
     */
    function initializeAgent(
        address rwaCollateral,
        uint256 collateralAmount,
        AgentConfig memory config
    ) external nonReentrant {
        require(!hasAgent[msg.sender], "Agent already initialized");
        require(collateralAmount > 0, "Invalid collateral amount");

        // Transfer RWA collateral
        IERC20(rwaCollateral).transferFrom(msg.sender, address(this), collateralAmount);

        // Calculate borrowing capacity (0 if RWA not yet registered in vault)
        uint256 borrowCapacity = 0;
        try IRWAVault(rwaVault).getBorrowingPower(rwaCollateral, collateralAmount) returns (uint256 capacity) {
            borrowCapacity = capacity;
        } catch {}

        // Initialize user state
        AgentState storage state = userStates[msg.sender];
        state.config = config;
        state.rwaCollateral = rwaCollateral;
        state.collateralAmount = collateralAmount;
        state.borrowedUSDC = 0;
        state.availableCredit = borrowCapacity;
        state.totalAssets = 0;

        // Track user
        allUsers.push(msg.sender);
        hasAgent[msg.sender] = true;

        // Update system stats
        systemStats.totalCollateral += collateralAmount;
        systemStats.totalUsers += 1;

        emit AgentInitialized(msg.sender, msg.sender, rwaCollateral, collateralAmount);
    }

    /**
     * @notice Add more collateral to the agent
     * @param amount Amount of RWA tokens to add
     */
    function addCollateral(uint256 amount) external nonReentrant {
        require(hasAgent[msg.sender], "Agent not initialized");
        require(amount > 0, "Invalid amount");

        AgentState storage state = userStates[msg.sender];

        // Transfer RWA collateral from sender
        IERC20(state.rwaCollateral).transferFrom(msg.sender, address(this), amount);

        // Update collateral amount
        state.collateralAmount += amount;

        // Recalculate borrowing capacity (0 if RWA not yet registered in vault)
        uint256 newBorrowCapacity = state.availableCredit + state.borrowedUSDC;
        try IRWAVault(rwaVault).getBorrowingPower(state.rwaCollateral, state.collateralAmount) returns (uint256 capacity) {
            newBorrowCapacity = capacity;
        } catch {}

        // Update available credit (total capacity minus already borrowed)
        state.availableCredit = newBorrowCapacity - state.borrowedUSDC;

        // Update system stats
        systemStats.totalCollateral += amount;

        emit CollateralAdded(msg.sender, state.rwaCollateral, amount);
    }

    // Event for collateral added
    event CollateralAdded(address indexed user, address indexed token, uint256 amount);

    // ============ Automation Control Functions ============

    /**
     * @notice Enable automated AI decisions for your agent
     * @param controllerAddress Address of the AI controller (can be global controller or custom)
     * @param maxBorrow Maximum amount the AI can borrow in a single decision
     * @param cooldown Minimum seconds between automated decisions
     * @param strategyType Strategy preference (0=Conservative, 1=Balanced, 2=Aggressive)
     */
    function enableAutomation(
        address controllerAddress,
        uint256 maxBorrow,
        uint256 cooldown,
        Strategy strategyType
    ) external {
        require(hasAgent[msg.sender], "Agent not initialized");
        require(controllerAddress != address(0), "Invalid controller");
        require(maxBorrow > 0, "Invalid max borrow");
        require(cooldown >= 60, "Cooldown must be >= 60 seconds");

        userPreferences[msg.sender] = UserPreferences({
            autoDecisionsEnabled: true,
            decisionController: controllerAddress,
            maxBorrowPerDecision: maxBorrow,
            cooldownPeriod: cooldown,
            lastDecisionTime: 0,
            strategy: strategyType
        });

        emit AutomationEnabled(msg.sender, controllerAddress, maxBorrow, cooldown, strategyType);
    }

    /**
     * @notice Disable automated AI decisions
     */
    function disableAutomation() external {
        require(hasAgent[msg.sender], "Agent not initialized");
        userPreferences[msg.sender].autoDecisionsEnabled = false;

        emit AutomationDisabled(msg.sender);
    }

    /**
     * @notice Update automation settings
     * @param maxBorrow New maximum borrow amount
     * @param cooldown New cooldown period
     * @param strategyType New strategy
     */
    function updateAutomation(
        uint256 maxBorrow,
        uint256 cooldown,
        Strategy strategyType
    ) external {
        require(hasAgent[msg.sender], "Agent not initialized");
        require(userPreferences[msg.sender].autoDecisionsEnabled, "Automation not enabled");
        require(maxBorrow > 0, "Invalid max borrow");
        require(cooldown >= 60, "Cooldown must be >= 60 seconds");

        UserPreferences storage prefs = userPreferences[msg.sender];
        prefs.maxBorrowPerDecision = maxBorrow;
        prefs.cooldownPeriod = cooldown;
        prefs.strategy = strategyType;

        emit AutomationUpdated(msg.sender, maxBorrow, cooldown, strategyType);
    }

    /**
     * @notice Check if user has automation enabled
     * @param user User address to check
     */
    function isAutomationEnabled(address user) external view returns (bool) {
        return userPreferences[user].autoDecisionsEnabled;
    }

    /**
     * @notice Get user's automation preferences
     * @param user User address
     */
    function getUserPreferences(address user) external view returns (UserPreferences memory) {
        return userPreferences[user];
    }

    /**
     * @notice Check if user can receive automated decision (respects cooldown)
     * @param user User address
     */
    function canMakeAutomatedDecision(address user) external view returns (bool) {
        UserPreferences memory prefs = userPreferences[user];

        if (!prefs.autoDecisionsEnabled) {
            return false;
        }

        if (block.timestamp < prefs.lastDecisionTime + prefs.cooldownPeriod) {
            return false;
        }

        return true;
    }

    /**
     * @notice Execute autonomous investment decision for a specific user
     * @param user The user address to make decision for
     * @param action The investment action to take
     * @param params Encoded parameters for the action
     */
    function makeInvestmentDecision(
        address user,
        InvestmentAction action,
        bytes memory params
    ) external onlyControllerOrUser(user) nonReentrant {
        require(hasAgent[user], "User has no agent");

        // Update last decision time if automated
        if (msg.sender != user && userPreferences[user].autoDecisionsEnabled) {
            userPreferences[user].lastDecisionTime = block.timestamp;
        }

        if (action == InvestmentAction.BORROW_AND_INVEST) {
            _executeBorrowAndInvest(user, params);
        } else if (action == InvestmentAction.REBALANCE) {
            _executeRebalance(user, params);
        } else if (action == InvestmentAction.TAKE_PROFIT) {
            _executeTakeProfit(user, params);
        } else if (action == InvestmentAction.STOP_LOSS) {
            _executeStopLoss(user, params);
        }

        emit DecisionExecuted(user, action, block.timestamp, params);
    }

    /**
     * @notice Borrow USDC and invest for a specific user
     */
    function _executeBorrowAndInvest(address user, bytes memory params) internal {
        (
            uint256 borrowAmount,
            address dexAddress,
            address tokenOut,
            uint256 minAmountOut
        ) = abi.decode(params, (uint256, address, address, uint256));

        AgentState storage state = userStates[user];
        require(borrowAmount <= state.availableCredit, "Insufficient credit");

        // Borrow USDC from lending pool
        ILendingPool(lendingPool).borrow(borrowAmount);
        state.borrowedUSDC += borrowAmount;
        state.availableCredit -= borrowAmount;

        // Update system stats
        systemStats.totalBorrowed += borrowAmount;

        emit BorrowExecuted(user, borrowAmount);

        // Swap USDC for target token on DEX
        IERC20(usdc).approve(dexAddress, borrowAmount);

        uint256 amountOut = ISimpleDEX(dexAddress).swap(
            usdc,
            tokenOut,
            borrowAmount,
            minAmountOut
        );

        // Get entry price (USDC per token)
        uint256 entryPrice = ISimpleDEX(dexAddress).getPrice(tokenOut, usdc);

        // Calculate stop loss (10% below entry) and take profit (20% above entry)
        uint256 stopLossPrice = (entryPrice * 90) / 100;  // -10%
        uint256 takeProfitPrice = (entryPrice * 120) / 100;  // +20%

        // Record position
        Position memory newPosition = Position({
            protocol: dexAddress,
            asset: tokenOut,
            amount: amountOut,
            entryPrice: entryPrice,
            timestamp: block.timestamp,
            stopLoss: stopLossPrice,
            takeProfit: takeProfitPrice
        });

        state.positions.push(newPosition);
        state.totalAssets += amountOut;

        // Update system stats
        systemStats.totalPositions += 1;

        emit PositionOpened(user, dexAddress, tokenOut, amountOut);
    }

    /**
     * @notice Rebalance portfolio for a specific user
     */
    function _executeRebalance(address user, bytes memory params) internal {
        // Implementation for rebalancing logic
        (uint256[] memory closeIndices, uint256[] memory newAllocations) =
            abi.decode(params, (uint256[], uint256[]));

        // Close specified positions
        for (uint256 i = 0; i < closeIndices.length; i++) {
            _closePosition(user, closeIndices[i]);
        }

        // Reallocate based on new strategy
        // Implementation depends on specific rebalancing logic
    }

    /**
     * @notice Execute take profit for a specific user
     */
    function _executeTakeProfit(address user, bytes memory params) internal {
        uint256 positionIndex = abi.decode(params, (uint256));
        _closePosition(user, positionIndex);
    }

    /**
     * @notice Execute stop loss for a specific user
     */
    function _executeStopLoss(address user, bytes memory params) internal {
        uint256 positionIndex = abi.decode(params, (uint256));
        _closePosition(user, positionIndex);
    }

    /**
     * @notice Close a position for a specific user
     */
    function _closePosition(address user, uint256 index) internal {
        AgentState storage state = userStates[user];
        require(index < state.positions.length, "Invalid position");

        Position memory position = state.positions[index];

        // Swap tokens back to USDC on DEX
        IERC20(position.asset).approve(position.protocol, position.amount);

        uint256 usdcReceived = ISimpleDEX(position.protocol).swap(
            position.asset,
            usdc,
            position.amount,
            0  // Accept any amount (in production, calculate proper slippage)
        );

        // Repay borrowed USDC to lending pool
        uint256 repayAmount = usdcReceived;
        if (repayAmount > state.borrowedUSDC) {
            repayAmount = state.borrowedUSDC;
        }

        IERC20(usdc).approve(lendingPool, repayAmount);
        ILendingPool(lendingPool).repay(repayAmount);

        // Update state
        state.borrowedUSDC -= repayAmount;
        state.availableCredit += repayAmount;
        state.totalAssets -= position.amount;

        // Update system stats
        systemStats.totalBorrowed -= repayAmount;
        systemStats.totalPositions -= 1;

        // Calculate PnL (simplified)
        int256 pnl = int256(usdcReceived) - int256(position.amount * position.entryPrice / 1e18);

        // Remove position (swap with last and pop)
        state.positions[index] = state.positions[state.positions.length - 1];
        state.positions.pop();

        emit PositionClosed(user, position.protocol, position.asset, usdcReceived, pnl);
    }

    // ============ User-Specific Getter Functions ============

    /**
     * @notice Get user's agent state
     */
    function getUserState(address user) external view returns (AgentState memory) {
        return userStates[user];
    }

    /**
     * @notice Get user's position count
     */
    function getUserPositionCount(address user) external view returns (uint256) {
        return userStates[user].positions.length;
    }

    /**
     * @notice Get specific position for a user
     */
    function getUserPosition(address user, uint256 index) external view returns (Position memory) {
        require(index < userStates[user].positions.length, "Invalid index");
        return userStates[user].positions[index];
    }

    /**
     * @notice Get all positions for a user
     */
    function getUserPositions(address user) external view returns (Position[] memory) {
        return userStates[user].positions;
    }

    /**
     * @notice Get paginated positions for a user
     */
    function getUserPositionsPaginated(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (Position[] memory positions, uint256 total) {
        total = userStates[user].positions.length;

        if (offset >= total) {
            return (new Position[](0), total);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 length = end - offset;
        positions = new Position[](length);

        for (uint256 i = 0; i < length; i++) {
            positions[i] = userStates[user].positions[offset + i];
        }

        return (positions, total);
    }

    /**
     * @notice Get all users who have initialized agents
     */
    function getAllUsers() external view returns (address[] memory) {
        return allUsers;
    }

    /**
     * @notice Get system-wide statistics
     */
    function getSystemStats() external view returns (SystemStats memory) {
        return systemStats;
    }

    /**
     * @notice Get total number of users
     */
    function getTotalUsers() external view returns (uint256) {
        return systemStats.totalUsers;
    }

    /**
     * @notice Check if user has initialized an agent
     */
    function hasInitialized(address user) external view returns (bool) {
        return hasAgent[user];
    }

    // ============ Backward Compatibility Functions ============

    /**
     * @notice Get current agent state (for msg.sender)
     * @dev Backward compatible with old interface
     */
    function getState() external view returns (AgentState memory) {
        return userStates[msg.sender];
    }

    /**
     * @notice Get position count (for msg.sender)
     * @dev Backward compatible with old interface
     */
    function getPositionCount() external view returns (uint256) {
        return userStates[msg.sender].positions.length;
    }

    /**
     * @notice Get position by index (for msg.sender)
     * @dev Backward compatible with old interface
     */
    function getPosition(uint256 index) external view returns (Position memory) {
        require(index < userStates[msg.sender].positions.length, "Invalid index");
        return userStates[msg.sender].positions[index];
    }

    /**
     * @notice Get all positions (for msg.sender)
     * @dev Backward compatible with old interface
     */
    function getAllPositions() external view returns (Position[] memory) {
        return userStates[msg.sender].positions;
    }

    /**
     * @notice Public getter for agentState (for msg.sender)
     * @dev Backward compatible - mimics old public state variable
     */
    function agentState() external view returns (AgentState memory) {
        return userStates[msg.sender];
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
