// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IRWAVault {
    function getBorrowingPower(address rwaToken, uint256 amount) external view returns (uint256);
}

/**
 * @title LendingPool
 * @notice USDC lending pool for AI agents backed by RWA collateral
 * @dev Implements the lending protocol as described in RACE PRD
 */
contract LendingPool is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    IRWAVault public immutable rwaVault;

    // Interest rate: 8% APY = 800 basis points
    uint256 public constant INTEREST_RATE_BPS = 800;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // Minimum collateral ratio: 150%
    uint256 public constant MIN_COLLATERAL_RATIO = 15000; // 150% in basis points

    struct Loan {
        address borrower;
        uint256 principal;          // Amount borrowed
        uint256 interestAccrued;    // Interest accumulated
        uint256 lastUpdateTime;     // Last time interest was calculated
        bool active;
    }

    // Borrower => Loan
    mapping(address => Loan) public loans;

    // Total USDC available in pool
    uint256 public totalLiquidity;

    // Total USDC borrowed
    uint256 public totalBorrowed;

    // Events
    event LiquidityAdded(address indexed provider, uint256 amount);
    event LiquidityRemoved(address indexed provider, uint256 amount);
    event Borrowed(address indexed borrower, uint256 amount, uint256 timestamp);
    event Repaid(address indexed borrower, uint256 principal, uint256 interest, uint256 timestamp);
    event InterestAccrued(address indexed borrower, uint256 interest);

    constructor(address _usdc, address _rwaVault) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        rwaVault = IRWAVault(_rwaVault);
    }

    /**
     * @notice Add liquidity to the lending pool
     * @param amount Amount of USDC to add
     */
    function addLiquidity(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");

        usdc.transferFrom(msg.sender, address(this), amount);
        totalLiquidity += amount;

        emit LiquidityAdded(msg.sender, amount);
    }

    /**
     * @notice Remove liquidity from the pool (owner only)
     * @param amount Amount of USDC to remove
     */
    function removeLiquidity(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(totalLiquidity - totalBorrowed >= amount, "Insufficient available liquidity");

        totalLiquidity -= amount;
        usdc.transfer(msg.sender, amount);

        emit LiquidityRemoved(msg.sender, amount);
    }

    /**
     * @notice Borrow USDC (called by AI Agent)
     * @param amount Amount of USDC to borrow
     */
    function borrow(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(totalLiquidity - totalBorrowed >= amount, "Insufficient pool liquidity");

        Loan storage loan = loans[msg.sender];

        if (loan.active) {
            // Update existing loan
            _accrueInterest(msg.sender);
            loan.principal += amount;
        } else {
            // Create new loan
            loan.borrower = msg.sender;
            loan.principal = amount;
            loan.interestAccrued = 0;
            loan.lastUpdateTime = block.timestamp;
            loan.active = true;
        }

        totalBorrowed += amount;

        // Transfer USDC to borrower
        usdc.transfer(msg.sender, amount);

        emit Borrowed(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Repay borrowed USDC
     * @param amount Amount to repay (principal + interest)
     */
    function repay(uint256 amount) external nonReentrant {
        Loan storage loan = loans[msg.sender];
        require(loan.active, "No active loan");
        require(amount > 0, "Amount must be > 0");

        // Accrue interest first
        _accrueInterest(msg.sender);

        uint256 totalOwed = loan.principal + loan.interestAccrued;
        require(amount <= totalOwed, "Amount exceeds debt");

        // Transfer USDC from borrower
        usdc.transferFrom(msg.sender, address(this), amount);

        uint256 principalPaid;
        uint256 interestPaid;

        // Pay interest first, then principal
        if (amount >= loan.interestAccrued) {
            interestPaid = loan.interestAccrued;
            principalPaid = amount - interestPaid;

            loan.interestAccrued = 0;
            loan.principal -= principalPaid;
            totalBorrowed -= principalPaid;
        } else {
            interestPaid = amount;
            loan.interestAccrued -= interestPaid;
        }

        // If fully repaid, deactivate loan
        if (loan.principal == 0 && loan.interestAccrued == 0) {
            loan.active = false;
        }

        emit Repaid(msg.sender, principalPaid, interestPaid, block.timestamp);
    }

    /**
     * @notice Get current debt (principal + accrued interest)
     * @param borrower Address of the borrower
     * @return Total debt amount
     */
    function getDebt(address borrower) external view returns (uint256) {
        Loan memory loan = loans[borrower];
        if (!loan.active) return 0;

        uint256 pendingInterest = _calculateInterest(
            loan.principal,
            loan.lastUpdateTime,
            block.timestamp
        );

        return loan.principal + loan.interestAccrued + pendingInterest;
    }

    /**
     * @notice Get loan details
     * @param borrower Address of the borrower
     */
    function getLoan(address borrower) external view returns (
        uint256 principal,
        uint256 interestAccrued,
        uint256 lastUpdateTime,
        bool active
    ) {
        Loan memory loan = loans[borrower];
        return (
            loan.principal,
            loan.interestAccrued,
            loan.lastUpdateTime,
            loan.active
        );
    }

    /**
     * @notice Get available liquidity
     */
    function getAvailableLiquidity() external view returns (uint256) {
        return totalLiquidity - totalBorrowed;
    }

    /**
     * @notice Accrue interest for a borrower
     * @param borrower Address of the borrower
     */
    function _accrueInterest(address borrower) internal {
        Loan storage loan = loans[borrower];
        if (!loan.active || loan.principal == 0) return;

        uint256 interest = _calculateInterest(
            loan.principal,
            loan.lastUpdateTime,
            block.timestamp
        );

        if (interest > 0) {
            loan.interestAccrued += interest;
            loan.lastUpdateTime = block.timestamp;

            emit InterestAccrued(borrower, interest);
        }
    }

    /**
     * @notice Calculate interest for a time period
     * @param principal Principal amount
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @return Interest amount
     */
    function _calculateInterest(
        uint256 principal,
        uint256 startTime,
        uint256 endTime
    ) internal pure returns (uint256) {
        if (endTime <= startTime || principal == 0) return 0;

        uint256 timeElapsed = endTime - startTime;

        // Interest = Principal * Rate * Time / (BASIS_POINTS * SECONDS_PER_YEAR)
        // Using 8% APY = 800 basis points
        return (principal * INTEREST_RATE_BPS * timeElapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
    }
}
