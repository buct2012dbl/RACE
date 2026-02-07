// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RWAVault
 * @notice Manages Real World Asset tokenization and collateral
 */
contract RWAVault is Ownable, ReentrancyGuard {
    struct RWA {
        address token;          // RWA token address
        uint256 amount;         // Collateral amount
        uint256 valuation;      // Current valuation in USDC
        uint256 ltv;            // Loan-to-value ratio (basis points)
        address validator;      // Valuation validator
        uint256 lastUpdated;    // Last update timestamp
    }

    struct BondMetadata {
        uint256 faceValue;
        uint256 maturityDate;
        string isin;
        bool active;
    }

    // RWA registry
    mapping(address => RWA) public rwaRegistry;
    mapping(address => BondMetadata) public bondMetadata;

    // KYC/Compliance
    mapping(address => bool) public kycVerified;

    // Constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant DEFAULT_LTV = 8000; // 80%

    // Events
    event RWAMinted(address indexed token, address indexed owner, uint256 amount);
    event RWARegistered(address indexed token, uint256 valuation, uint256 ltv);
    event RWAValuationUpdated(address indexed token, uint256 newValuation);
    event CollateralAdded(address indexed agent, address indexed token, uint256 amount);
    event CollateralRemoved(address indexed agent, address indexed token, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Mint Treasury Bond Token
     * @param faceValue Face value of the bond
     * @param maturityDate Maturity date timestamp
     * @param isin International Securities Identification Number
     */
    function mintTreasuryBondToken(
        uint256 faceValue,
        uint256 maturityDate,
        string memory isin
    ) external returns (address token) {
        require(kycVerified[msg.sender], "KYC verification required");
        require(faceValue > 0, "Invalid face value");
        require(maturityDate > block.timestamp, "Invalid maturity date");

        // Create RWA token (simplified - in production use proper token factory)
        RWAToken rwaToken = new RWAToken(
            string(abi.encodePacked("US Treasury Bond ", isin)),
            "USTBT",
            faceValue
        );
        token = address(rwaToken);

        // Calculate current valuation
        uint256 valuation = calculateValuation(faceValue, maturityDate);

        // Register RWA
        rwaRegistry[token] = RWA({
            token: token,
            amount: faceValue,
            valuation: valuation,
            ltv: DEFAULT_LTV,
            validator: msg.sender,
            lastUpdated: block.timestamp
        });

        // Store bond metadata
        bondMetadata[token] = BondMetadata({
            faceValue: faceValue,
            maturityDate: maturityDate,
            isin: isin,
            active: true
        });

        emit RWAMinted(token, msg.sender, faceValue);
    }

    /**
     * @notice Calculate borrowing power based on RWA collateral
     * @param rwaToken RWA token address
     * @param amount Amount of RWA tokens
     */
    function getBorrowingPower(address rwaToken, uint256 amount)
        public
        view
        returns (uint256)
    {
        RWA memory rwa = rwaRegistry[rwaToken];
        require(rwa.token != address(0), "RWA not registered");

        uint256 currentValue = getCurrentValue(rwa);
        uint256 totalValue = (currentValue * amount) / rwa.amount;

        return (totalValue * rwa.ltv) / BASIS_POINTS;
    }

    /**
     * @notice Update RWA valuation
     * @param rwaToken RWA token address
     * @param newValuation New valuation in USDC
     */
    function updateValuation(address rwaToken, uint256 newValuation)
        external
        onlyOwner
    {
        RWA storage rwa = rwaRegistry[rwaToken];
        require(rwa.token != address(0), "RWA not registered");

        rwa.valuation = newValuation;
        rwa.lastUpdated = block.timestamp;

        emit RWAValuationUpdated(rwaToken, newValuation);
    }

    /**
     * @notice Add collateral to agent
     * @param agent Agent address
     * @param rwaToken RWA token address
     * @param amount Amount to add
     */
    function addCollateral(address agent, address rwaToken, uint256 amount)
        external
        nonReentrant
    {
        require(rwaRegistry[rwaToken].token != address(0), "RWA not registered");

        IERC20(rwaToken).transferFrom(msg.sender, address(this), amount);

        emit CollateralAdded(agent, rwaToken, amount);
    }

    /**
     * @notice Set KYC verification status
     * @param user User address
     * @param verified Verification status
     */
    function setKYCVerified(address user, bool verified) external onlyOwner {
        kycVerified[user] = verified;
    }

    /**
     * @notice Register an external RWA token
     * @param rwaToken RWA token address
     * @param valuation Initial valuation in USDC
     * @param ltv Loan-to-value ratio in basis points
     */
    function registerRWA(
        address rwaToken,
        uint256 valuation,
        uint256 ltv
    ) external onlyOwner {
        require(rwaToken != address(0), "Invalid token address");
        require(rwaRegistry[rwaToken].token == address(0), "Already registered");
        require(ltv <= BASIS_POINTS, "Invalid LTV");

        // Get token supply for amount
        uint256 tokenAmount = IERC20(rwaToken).totalSupply();

        rwaRegistry[rwaToken] = RWA({
            token: rwaToken,
            amount: tokenAmount,
            valuation: valuation,
            ltv: ltv,
            validator: msg.sender,
            lastUpdated: block.timestamp
        });

        emit RWARegistered(rwaToken, valuation, ltv);
    }

    /**
     * @notice Calculate bond valuation
     * @param faceValue Face value
     * @param maturityDate Maturity date
     */
    function calculateValuation(uint256 faceValue, uint256 maturityDate)
        public
        view
        returns (uint256)
    {
        // Simplified valuation - in production use proper pricing model
        uint256 timeToMaturity = maturityDate > block.timestamp
            ? maturityDate - block.timestamp
            : 0;

        // Assume 5% annual yield
        uint256 discount = (timeToMaturity * 500) / (365 days * BASIS_POINTS);

        return faceValue - (faceValue * discount / BASIS_POINTS);
    }

    /**
     * @notice Get current RWA value
     * @param rwa RWA struct
     */
    function getCurrentValue(RWA memory rwa) public pure returns (uint256) {
        return rwa.valuation;
    }
}

/**
 * @title RWAToken
 * @notice Simple ERC20 token representing RWA
 */
contract RWAToken is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }
}
