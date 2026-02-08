// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleDEX
 * @notice Simplified Uniswap-like AMM for testing AI agent trading
 * @dev Implements constant product formula (x * y = k)
 */
contract SimpleDEX is Ownable, ReentrancyGuard {
    // Trading pairs
    struct Pool {
        address token0;
        address token1;
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalLiquidity;
        bool exists;
    }

    // Pool ID => Pool
    mapping(bytes32 => Pool) public pools;

    // User => Pool ID => Liquidity
    mapping(address => mapping(bytes32 => uint256)) public userLiquidity;

    // Fee: 0.3% (30 basis points)
    uint256 public constant FEE_NUMERATOR = 997;
    uint256 public constant FEE_DENOMINATOR = 1000;

    // Events
    event PoolCreated(bytes32 indexed poolId, address token0, address token1);
    event LiquidityAdded(bytes32 indexed poolId, address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity);
    event LiquidityRemoved(bytes32 indexed poolId, address indexed provider, uint256 amount0, uint256 amount1, uint256 liquidity);
    event Swap(bytes32 indexed poolId, address indexed trader, address tokenIn, uint256 amountIn, uint256 amountOut);
    event ReservesAdjusted(bytes32 indexed poolId, uint256 newReserve0, uint256 newReserve1);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Get pool ID for a token pair
     */
    function getPoolId(address token0, address token1) public pure returns (bytes32) {
        (address t0, address t1) = token0 < token1 ? (token0, token1) : (token1, token0);
        return keccak256(abi.encodePacked(t0, t1));
    }

    /**
     * @notice Create a new liquidity pool
     */
    function createPool(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1
    ) external nonReentrant returns (bytes32) {
        require(token0 != token1, "Identical tokens");
        require(amount0 > 0 && amount1 > 0, "Invalid amounts");

        bytes32 poolId = getPoolId(token0, token1);
        require(!pools[poolId].exists, "Pool exists");

        // Order tokens
        address t0 = token0 < token1 ? token0 : token1;
        address t1 = token0 < token1 ? token1 : token0;
        uint256 r0 = token0 < token1 ? amount0 : amount1;
        uint256 r1 = token0 < token1 ? amount1 : amount0;

        // Transfer tokens
        IERC20(t0).transferFrom(msg.sender, address(this), r0);
        IERC20(t1).transferFrom(msg.sender, address(this), r1);

        // Calculate initial liquidity
        uint256 liquidity = sqrt(r0 * r1);

        // Create pool
        pools[poolId].token0 = t0;
        pools[poolId].token1 = t1;
        pools[poolId].reserve0 = r0;
        pools[poolId].reserve1 = r1;
        pools[poolId].totalLiquidity = liquidity;
        pools[poolId].exists = true;

        userLiquidity[msg.sender][poolId] = liquidity;

        emit PoolCreated(poolId, t0, t1);
        emit LiquidityAdded(poolId, msg.sender, r0, r1, liquidity);

        return poolId;
    }

    /**
     * @notice Add liquidity to existing pool
     */
    function addLiquidity(
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired
    ) external nonReentrant returns (uint256 liquidity) {
        bytes32 poolId = getPoolId(token0, token1);
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool doesn't exist");

        // Calculate optimal amounts
        uint256 amount1Optimal = (amount0Desired * pool.reserve1) / pool.reserve0;
        uint256 amount0;
        uint256 amount1;

        if (amount1Optimal <= amount1Desired) {
            amount0 = amount0Desired;
            amount1 = amount1Optimal;
        } else {
            uint256 amount0Optimal = (amount1Desired * pool.reserve0) / pool.reserve1;
            amount0 = amount0Optimal;
            amount1 = amount1Desired;
        }

        // Transfer tokens
        IERC20(token0).transferFrom(msg.sender, address(this), amount0);
        IERC20(token1).transferFrom(msg.sender, address(this), amount1);

        // Calculate liquidity
        liquidity = min(
            (amount0 * pool.totalLiquidity) / pool.reserve0,
            (amount1 * pool.totalLiquidity) / pool.reserve1
        );

        // Update pool
        pool.reserve0 += amount0;
        pool.reserve1 += amount1;
        pool.totalLiquidity += liquidity;

        userLiquidity[msg.sender][poolId] += liquidity;

        emit LiquidityAdded(poolId, msg.sender, amount0, amount1, liquidity);
    }

    /**
     * @notice Swap tokens
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid amount");

        bytes32 poolId = getPoolId(tokenIn, tokenOut);
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool doesn't exist");

        // Determine which token is token0
        bool isToken0 = tokenIn == pool.token0;
        uint256 reserveIn = isToken0 ? pool.reserve0 : pool.reserve1;
        uint256 reserveOut = isToken0 ? pool.reserve1 : pool.reserve0;

        // Calculate output amount with fee
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);

        require(amountOut >= minAmountOut, "Slippage too high");
        require(amountOut < reserveOut, "Insufficient liquidity");

        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);

        // Update reserves
        if (isToken0) {
            pool.reserve0 += amountIn;
            pool.reserve1 -= amountOut;
        } else {
            pool.reserve1 += amountIn;
            pool.reserve0 -= amountOut;
        }

        emit Swap(poolId, msg.sender, tokenIn, amountIn, amountOut);
    }

    /**
     * @notice Get output amount for a swap
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        bytes32 poolId = getPoolId(tokenIn, tokenOut);
        Pool memory pool = pools[poolId];
        require(pool.exists, "Pool doesn't exist");

        bool isToken0 = tokenIn == pool.token0;
        uint256 reserveIn = isToken0 ? pool.reserve0 : pool.reserve1;
        uint256 reserveOut = isToken0 ? pool.reserve1 : pool.reserve0;

        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }

    /**
     * @notice Get current price (token1 per token0)
     */
    function getPrice(address token0, address token1) external view returns (uint256) {
        bytes32 poolId = getPoolId(token0, token1);
        Pool memory pool = pools[poolId];
        require(pool.exists, "Pool doesn't exist");

        bool isToken0 = token0 == pool.token0;
        if (isToken0) {
            return (pool.reserve1 * 1e18) / pool.reserve0;
        } else {
            return (pool.reserve0 * 1e18) / pool.reserve1;
        }
    }

    /**
     * @notice Get pool reserves
     */
    function getReserves(address token0, address token1) external view returns (uint256 reserve0, uint256 reserve1) {
        bytes32 poolId = getPoolId(token0, token1);
        Pool memory pool = pools[poolId];
        require(pool.exists, "Pool doesn't exist");

        bool isToken0 = token0 == pool.token0;
        if (isToken0) {
            return (pool.reserve0, pool.reserve1);
        } else {
            return (pool.reserve1, pool.reserve0);
        }
    }

    /**
     * @notice Adjust pool reserves to match real market prices (admin only)
     * @dev This function allows the owner to synchronize DEX prices with external market prices
     * @param token0 First token address
     * @param token1 Second token address
     * @param newReserve0 New reserve amount for token0
     * @param newReserve1 New reserve amount for token1
     */
    function adjustReserves(
        address token0,
        address token1,
        uint256 newReserve0,
        uint256 newReserve1
    ) external onlyOwner {
        require(newReserve0 > 0 && newReserve1 > 0, "Invalid reserves");

        bytes32 poolId = getPoolId(token0, token1);
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool doesn't exist");

        // Determine which token is token0 in the pool
        bool isToken0 = token0 == pool.token0;

        // Update reserves in the correct order
        if (isToken0) {
            pool.reserve0 = newReserve0;
            pool.reserve1 = newReserve1;
        } else {
            pool.reserve0 = newReserve1;
            pool.reserve1 = newReserve0;
        }

        emit ReservesAdjusted(poolId, pool.reserve0, pool.reserve1);
    }

    // Helper functions
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
