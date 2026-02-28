import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AIAgent, RWAVault, LendingPool, SimpleDEX, MockUSDC, MockRWAToken } from "../typechain-types";

describe("AIAgent - Multi-User Architecture", function () {
  let aiAgent: AIAgent;
  let rwaVault: RWAVault;
  let lendingPool: LendingPool;
  let simpleDEX: SimpleDEX;
  let usdc: MockUSDC;
  let rwaToken: MockRWAToken;

  let owner: SignerWithAddress;
  let controller: SignerWithAddress;
  let userA: SignerWithAddress;
  let userB: SignerWithAddress;
  let userC: SignerWithAddress;

  const INITIAL_RWA_BALANCE = ethers.parseEther("10000");
  const COLLATERAL_AMOUNT_A = ethers.parseEther("1000");
  const COLLATERAL_AMOUNT_B = ethers.parseEther("2000");
  const COLLATERAL_AMOUNT_C = ethers.parseEther("1500");

  beforeEach(async function () {
    [owner, controller, userA, userB, userC] = await ethers.getSigners();

    // Deploy mock tokens
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const MockRWAToken = await ethers.getContractFactory("MockRWAToken");
    rwaToken = await MockRWAToken.deploy();
    await rwaToken.waitForDeployment();

    // Deploy RWAVault
    const RWAVault = await ethers.getContractFactory("RWAVault");
    rwaVault = await RWAVault.deploy(await usdc.getAddress());
    await rwaVault.waitForDeployment();

    // Deploy LendingPool
    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy(
      await usdc.getAddress(),
      await rwaVault.getAddress()
    );
    await lendingPool.waitForDeployment();

    // Deploy SimpleDEX
    const SimpleDEX = await ethers.getContractFactory("SimpleDEX");
    simpleDEX = await SimpleDEX.deploy();
    await simpleDEX.waitForDeployment();

    // Deploy AIAgent
    const AIAgent = await ethers.getContractFactory("AIAgent");
    aiAgent = await AIAgent.deploy(
      await rwaVault.getAddress(),
      await lendingPool.getAddress(),
      await usdc.getAddress(),
      controller.address
    );
    await aiAgent.waitForDeployment();

    // Setup: Mint RWA tokens to users
    await rwaToken.mint(userA.address, INITIAL_RWA_BALANCE);
    await rwaToken.mint(userB.address, INITIAL_RWA_BALANCE);
    await rwaToken.mint(userC.address, INITIAL_RWA_BALANCE);

    // Setup: Add RWA token to vault with 150% collateral ratio (LTV 66.67%)
    await rwaVault.addRWAToken(
      await rwaToken.getAddress(),
      6667,  // 66.67% LTV
      ethers.parseEther("1")  // 1:1 price for testing
    );

    // Setup: Add liquidity to lending pool
    const liquidityAmount = ethers.parseEther("100000");
    await usdc.mint(owner.address, liquidityAmount);
    await usdc.approve(await lendingPool.getAddress(), liquidityAmount);
    await lendingPool.addLiquidity(liquidityAmount);
  });

  describe("Multi-User Initialization", function () {
    it("Should allow multiple users to initialize independently", async function () {
      // User A initializes
      await rwaToken.connect(userA).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_A);

      const configA = {
        owner: userA.address,
        riskTolerance: 5,
        targetROI: 1200,  // 12%
        maxDrawdown: 1500,  // 15%
        strategies: []
      };

      await aiAgent.connect(userA).initializeAgent(
        await rwaToken.getAddress(),
        COLLATERAL_AMOUNT_A,
        configA
      );

      // User B initializes with different collateral
      await rwaToken.connect(userB).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_B);

      const configB = {
        owner: userB.address,
        riskTolerance: 7,
        targetROI: 1500,  // 15%
        maxDrawdown: 2000,  // 20%
        strategies: []
      };

      await aiAgent.connect(userB).initializeAgent(
        await rwaToken.getAddress(),
        COLLATERAL_AMOUNT_B,
        configB
      );

      // Verify User A state
      const stateA = await aiAgent.getUserState(userA.address);
      expect(stateA[2]).to.equal(COLLATERAL_AMOUNT_A);  // collateralAmount

      // Verify User B state
      const stateB = await aiAgent.getUserState(userB.address);
      expect(stateB[2]).to.equal(COLLATERAL_AMOUNT_B);  // collateralAmount

      // Verify states are independent
      expect(stateA[2]).to.not.equal(stateB[2]);
    });

    it("Should track all users correctly", async function () {
      // Initialize all three users
      const users = [
        { signer: userA, amount: COLLATERAL_AMOUNT_A },
        { signer: userB, amount: COLLATERAL_AMOUNT_B },
        { signer: userC, amount: COLLATERAL_AMOUNT_C }
      ];

      for (const user of users) {
        await rwaToken.connect(user.signer).approve(await aiAgent.getAddress(), user.amount);
        await aiAgent.connect(user.signer).initializeAgent(
          await rwaToken.getAddress(),
          user.amount,
          {
            owner: user.signer.address,
            riskTolerance: 5,
            targetROI: 1200,
            maxDrawdown: 1500,
            strategies: []
          }
        );
      }

      // Check total users
      const totalUsers = await aiAgent.getTotalUsers();
      expect(totalUsers).to.equal(3);

      // Get all users
      const allUsers = await aiAgent.getAllUsers();
      expect(allUsers).to.have.lengthOf(3);
      expect(allUsers).to.include(userA.address);
      expect(allUsers).to.include(userB.address);
      expect(allUsers).to.include(userC.address);
    });

    it("Should prevent duplicate initialization", async function () {
      await rwaToken.connect(userA).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_A);

      await aiAgent.connect(userA).initializeAgent(
        await rwaToken.getAddress(),
        COLLATERAL_AMOUNT_A,
        {
          owner: userA.address,
          riskTolerance: 5,
          targetROI: 1200,
          maxDrawdown: 1500,
          strategies: []
        }
      );

      // Try to initialize again
      await rwaToken.connect(userA).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_A);

      await expect(
        aiAgent.connect(userA).initializeAgent(
          await rwaToken.getAddress(),
          COLLATERAL_AMOUNT_A,
          {
            owner: userA.address,
            riskTolerance: 5,
            targetROI: 1200,
            maxDrawdown: 1500,
            strategies: []
          }
        )
      ).to.be.revertedWith("Agent already initialized");
    });

    it("Should update system stats correctly", async function () {
      const statsBeforeA = await aiAgent.getSystemStats();

      // User A initializes
      await rwaToken.connect(userA).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_A);
      await aiAgent.connect(userA).initializeAgent(
        await rwaToken.getAddress(),
        COLLATERAL_AMOUNT_A,
        {
          owner: userA.address,
          riskTolerance: 5,
          targetROI: 1200,
          maxDrawdown: 1500,
          strategies: []
        }
      );

      const statsAfterA = await aiAgent.getSystemStats();
      expect(statsAfterA.totalUsers).to.equal(statsBeforeA.totalUsers + 1n);
      expect(statsAfterA.totalCollateral).to.equal(statsBeforeA.totalCollateral + COLLATERAL_AMOUNT_A);

      // User B initializes
      await rwaToken.connect(userB).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_B);
      await aiAgent.connect(userB).initializeAgent(
        await rwaToken.getAddress(),
        COLLATERAL_AMOUNT_B,
        {
          owner: userB.address,
          riskTolerance: 5,
          targetROI: 1200,
          maxDrawdown: 1500,
          strategies: []
        }
      );

      const statsAfterB = await aiAgent.getSystemStats();
      expect(statsAfterB.totalUsers).to.equal(2);
      expect(statsAfterB.totalCollateral).to.equal(COLLATERAL_AMOUNT_A + COLLATERAL_AMOUNT_B);
    });
  });

  describe("User-Specific Operations", function () {
    beforeEach(async function () {
      // Initialize both users
      await rwaToken.connect(userA).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_A);
      await aiAgent.connect(userA).initializeAgent(
        await rwaToken.getAddress(),
        COLLATERAL_AMOUNT_A,
        {
          owner: userA.address,
          riskTolerance: 5,
          targetROI: 1200,
          maxDrawdown: 1500,
          strategies: []
        }
      );

      await rwaToken.connect(userB).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_B);
      await aiAgent.connect(userB).initializeAgent(
        await rwaToken.getAddress(),
        COLLATERAL_AMOUNT_B,
        {
          owner: userB.address,
          riskTolerance: 5,
          targetROI: 1200,
          maxDrawdown: 1500,
          strategies: []
        }
      );
    });

    it("Should allow users to add collateral independently", async function () {
      const additionalCollateral = ethers.parseEther("500");

      // User A adds collateral
      await rwaToken.connect(userA).approve(await aiAgent.getAddress(), additionalCollateral);
      await aiAgent.connect(userA).addCollateral(additionalCollateral);

      const stateA = await aiAgent.getUserState(userA.address);
      expect(stateA[2]).to.equal(COLLATERAL_AMOUNT_A + additionalCollateral);

      // User B state should be unchanged
      const stateB = await aiAgent.getUserState(userB.address);
      expect(stateB[2]).to.equal(COLLATERAL_AMOUNT_B);
    });

    it("Should maintain separate positions for each user", async function () {
      // Controller makes decision for User A
      const borrowAmount = ethers.parseEther("100");
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "address", "uint256"],
        [borrowAmount, await simpleDEX.getAddress(), await rwaToken.getAddress(), 1]
      );

      await aiAgent.connect(controller).makeInvestmentDecision(
        userA.address,
        1,  // BORROW_AND_INVEST
        params
      );

      // Check positions
      const positionsA = await aiAgent.getUserPositions(userA.address);
      const positionsB = await aiAgent.getUserPositions(userB.address);

      expect(positionsA).to.have.lengthOf(1);
      expect(positionsB).to.have.lengthOf(0);
    });
  });

  describe("Access Control", function () {
    beforeEach(async function () {
      await rwaToken.connect(userA).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_A);
      await aiAgent.connect(userA).initializeAgent(
        await rwaToken.getAddress(),
        COLLATERAL_AMOUNT_A,
        {
          owner: userA.address,
          riskTolerance: 5,
          targetROI: 1200,
          maxDrawdown: 1500,
          strategies: []
        }
      );
    });

    it("Should allow controller to make decisions for any user", async function () {
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "address", "uint256"],
        [ethers.parseEther("100"), await simpleDEX.getAddress(), await rwaToken.getAddress(), 1]
      );

      await expect(
        aiAgent.connect(controller).makeInvestmentDecision(userA.address, 1, params)
      ).to.not.be.reverted;
    });

    it("Should allow user to make decisions for themselves", async function () {
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "address", "uint256"],
        [ethers.parseEther("100"), await simpleDEX.getAddress(), await rwaToken.getAddress(), 1]
      );

      await expect(
        aiAgent.connect(userA).makeInvestmentDecision(userA.address, 1, params)
      ).to.not.be.reverted;
    });

    it("Should prevent user from making decisions for other users", async function () {
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "address", "address", "uint256"],
        [ethers.parseEther("100"), await simpleDEX.getAddress(), await rwaToken.getAddress(), 1]
      );

      await expect(
        aiAgent.connect(userB).makeInvestmentDecision(userA.address, 1, params)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Backward Compatibility", function () {
    it("Should support old agentState() function for msg.sender", async function () {
      await rwaToken.connect(userA).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_A);
      await aiAgent.connect(userA).initializeAgent(
        await rwaToken.getAddress(),
        COLLATERAL_AMOUNT_A,
        {
          owner: userA.address,
          riskTolerance: 5,
          targetROI: 1200,
          maxDrawdown: 1500,
          strategies: []
        }
      );

      // Call old function (should return userA's state when called by userA)
      const state = await aiAgent.connect(userA).agentState();
      expect(state[2]).to.equal(COLLATERAL_AMOUNT_A);
    });

    it("Should support old getAllPositions() function for msg.sender", async function () {
      await rwaToken.connect(userA).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_A);
      await aiAgent.connect(userA).initializeAgent(
        await rwaToken.getAddress(),
        COLLATERAL_AMOUNT_A,
        {
          owner: userA.address,
          riskTolerance: 5,
          targetROI: 1200,
          maxDrawdown: 1500,
          strategies: []
        }
      );

      const positions = await aiAgent.connect(userA).getAllPositions();
      expect(positions).to.have.lengthOf(0);
    });
  });

  describe("Gas Costs", function () {
    it("Should have similar gas costs for multiple users", async function () {
      const configs = [
        { signer: userA, amount: COLLATERAL_AMOUNT_A },
        { signer: userB, amount: COLLATERAL_AMOUNT_B },
        { signer: userC, amount: COLLATERAL_AMOUNT_C }
      ];

      const gasCosts: bigint[] = [];

      for (const config of configs) {
        await rwaToken.connect(config.signer).approve(await aiAgent.getAddress(), config.amount);

        const tx = await aiAgent.connect(config.signer).initializeAgent(
          await rwaToken.getAddress(),
          config.amount,
          {
            owner: config.signer.address,
            riskTolerance: 5,
            targetROI: 1200,
            maxDrawdown: 1500,
            strategies: []
          }
        );

        const receipt = await tx.wait();
        if (receipt) {
          gasCosts.push(receipt.gasUsed);
        }
      }

      // Check that gas costs are within 10% of each other
      const avgGas = gasCosts.reduce((a, b) => a + b, 0n) / BigInt(gasCosts.length);

      for (const cost of gasCosts) {
        const diff = cost > avgGas ? cost - avgGas : avgGas - cost;
        const percentDiff = Number(diff * 100n / avgGas);
        expect(percentDiff).to.be.lessThan(10);
      }

      console.log("Gas costs:", gasCosts.map(g => g.toString()));
      console.log("Average gas:", avgGas.toString());
    });
  });

  describe("Position Pagination", function () {
    it("Should paginate user positions correctly", async function () {
      // Initialize user
      await rwaToken.connect(userA).approve(await aiAgent.getAddress(), COLLATERAL_AMOUNT_A);
      await aiAgent.connect(userA).initializeAgent(
        await rwaToken.getAddress(),
        COLLATERAL_AMOUNT_A,
        {
          owner: userA.address,
          riskTolerance: 5,
          targetROI: 1200,
          maxDrawdown: 1500,
          strategies: []
        }
      );

      // Create multiple positions (would need to implement position creation in test)
      // This is a placeholder for pagination testing
      const [positions, total] = await aiAgent.getUserPositionsPaginated(userA.address, 0, 10);
      expect(total).to.equal(0);  // No positions yet
    });
  });
});
