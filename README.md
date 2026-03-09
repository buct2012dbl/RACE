<div align="center">

# 🏛️ RACE Protocol

### RWA-Powered Autonomous Commerce Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![Python Version](https://img.shields.io/badge/python-%3E%3D3.11-blue)](https://www.python.org/)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.20-363636?logo=solidity)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)](https://nestjs.com/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19-FFF100?logo=hardhat)](https://hardhat.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**A fully autonomous AI agent network that transforms Real World Assets (RWA) into on-chain productive capital, driving automated DeFi commerce activities.**

[Features](#-key-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Documentation](#-packages)

</div>

---

## 🎯 Overview

RACE Protocol is a cutting-edge decentralized platform that bridges traditional finance with DeFi through intelligent automation. By tokenizing Real World Assets and deploying AI-powered autonomous agents, RACE enables:

- **Automated Asset Management**: AI agents manage RWA-backed portfolios 24/7
- **Risk-Optimized Trading**: Machine learning models assess market conditions and execute strategies
- **Multi-Chain Operations**: Seamless deployment across Ethereum, Arc, and Monad networks
- **Transparent Governance**: On-chain decision tracking and revenue distribution

## ✨ Key Features

### 🤖 Autonomous AI Agents
- **ERC-6551 Token-Bound Accounts**: Each agent is a smart contract wallet with independent decision-making
- **Multi-Model Intelligence**: Powered by GPT-4o and Claude 3.5 Sonnet for diverse strategy execution
- **LangChain Integration**: Advanced reasoning chains for complex DeFi operations
- **Real-time Market Analysis**: Continuous monitoring and adaptive strategy adjustment

### 🏦 RWA Tokenization
- **Vault System**: Secure collateralization of real-world assets
- **Oracle Integration**: Multi-source price feeds for accurate asset valuation
- **Liquidation Protection**: Automated risk management and position monitoring
- **Revenue Distribution**: Fair profit sharing among stakeholders

### 🔗 Multi-Chain Support
- **Ethereum Mainnet**: Production-ready deployment
- **Arc Testnet**: High-performance testing environment
- **Monad Testnet**: Next-gen blockchain compatibility

### 📊 Professional Dashboard
- **Newsprint Design System**: Clean, newspaper-inspired UI with Playfair Display typography
- **Real-time Monitoring**: Live agent performance metrics and portfolio tracking
- **Multi-User Management**: Configure and monitor multiple AI agents simultaneously
- **Automation Controls**: Fine-tune agent behavior and risk parameters

## 🏗️ Architecture

```
race-protocol/
├── packages/
│   ├── contracts/          # Smart Contracts (Solidity)
│   │   ├── AIAgent.sol            # ERC-6551 autonomous agent
│   │   ├── RWAVault.sol           # Asset tokenization vault
│   │   ├── RiskManager.sol        # Liquidation protection
│   │   ├── OracleAggregator.sol   # Multi-oracle price feeds
│   │   ├── RevenueManager.sol     # Profit distribution
│   │   ├── LendingPool.sol        # DeFi lending integration
│   │   └── SimpleDEX.sol          # Decentralized exchange
│   │
│   ├── frontend/           # Next.js 14 Web Application
│   │   ├── App Router              # Modern Next.js routing
│   │   ├── Wagmi v2 + Viem         # Multi-chain wallet connection
│   │   ├── RainbowKit v2           # Beautiful wallet UI
│   │   ├── Tailwind CSS 3          # Utility-first styling
│   │   ├── Recharts                # Data visualization
│   │   └── Jotai + TanStack Query  # State management
│   │
│   ├── backend/            # NestJS API Server
│   │   ├── REST API                # Agent orchestration endpoints
│   │   ├── Swagger Docs            # Auto-generated API documentation
│   │   ├── Ethers.js v6            # Blockchain interaction
│   │   └── Class Validator         # Request validation
│   │
│   └── ai-agents/          # Python AI Decision Engine
│       ├── LangChain               # AI reasoning framework
│       ├── OpenAI GPT-4o           # Primary decision model
│       ├── Anthropic Claude 3.5    # Secondary analysis model
│       └── Market Analyzers        # Trading strategy modules
```

## 🚀 Quick Start

### Prerequisites

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-%3E%3D3.11-3776AB?logo=python&logoColor=white)
![npm](https://img.shields.io/badge/npm-%3E%3D10.0.0-CB3837?logo=npm&logoColor=white)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/race-protocol.git
cd race-protocol

# Install all dependencies
npm install

# Setup Python environment for AI agents
cd packages/ai-agents
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

### Environment Configuration

Create `.env` files in each package:

**`packages/contracts/.env`**
```env
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_key
ARC_RPC_URL=https://arc-testnet-rpc.example.com
MONAD_RPC_URL=https://monad-testnet-rpc.example.com
```

**`packages/frontend/.env.local`**
```env
NEXT_PUBLIC_RWA_VAULT_ADDRESS=0x...
NEXT_PUBLIC_AI_AGENT_ADDRESS=0x...
NEXT_PUBLIC_RISK_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**`packages/backend/.env`**
```env
PORT=5000
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-key
CONTRACT_ADDRESS=0x...
```

**`packages/ai-agents/.env`**
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-key
```

### Development

```bash
# Run all services concurrently (requires Turbo)
npm run dev

# Or run services individually:

# Terminal 1: Frontend (http://localhost:3000)
npm run frontend:dev

# Terminal 2: Backend API (http://localhost:5000)
npm run backend:dev

# Terminal 3: AI Agents
npm run ai:dev

# Terminal 4: Compile & deploy contracts
npm run contracts:compile
npm run contracts:deploy
```

## 📦 Packages

### 🔐 Smart Contracts (`packages/contracts`)

![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity)
![Hardhat](https://img.shields.io/badge/Hardhat-2.19-FFF100)
![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.0-4E5EE4)

**Core Contracts:**
- **AIAgent.sol** (22KB): ERC-6551 token-bound account with autonomous trading capabilities
- **RWAVault.sol** (7KB): Collateral management and asset tokenization
- **RiskManager.sol** (6.6KB): Liquidation protection and health factor monitoring
- **OracleAggregator.sol** (4.7KB): Multi-source price feed aggregation
- **RevenueManager.sol** (4.5KB): Automated profit distribution
- **LendingPool.sol** (7.7KB): DeFi lending protocol integration
- **SimpleDEX.sol** (9.6KB): Decentralized exchange for asset swaps

**Commands:**
```bash
cd packages/contracts
npm run compile          # Compile contracts
npm run test            # Run test suite
npm run deploy          # Deploy to local network
npm run deploy:arc      # Deploy to Arc Testnet
npm run deploy:monad    # Deploy to Monad Testnet
```

### 🎨 Frontend (`packages/frontend`)

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)

**Tech Stack:**
- **Framework**: Next.js 14 with App Router
- **Blockchain**: Wagmi v2 + Viem v2 + RainbowKit v2
- **Styling**: Tailwind CSS 3 with custom Newsprint design system
- **State**: Jotai (atomic state) + TanStack Query v5 (server state)
- **Charts**: Recharts with custom styling
- **Icons**: Lucide React
- **Animations**: Framer Motion

**Design System:**
- **Typography**: Playfair Display (headlines), Lora (body), Inter (UI), JetBrains Mono (code)
- **Colors**: Newsprint palette (#F9F9F7 bg, #111111 ink, #CC0000 accent)
- **Layout**: Zero border-radius, dot-grid backgrounds, hard shadows

**Commands:**
```bash
cd packages/frontend
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

### ⚙️ Backend (`packages/backend`)

![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Swagger](https://img.shields.io/badge/Swagger-7-85EA2D?logo=swagger)

**Features:**
- RESTful API for agent orchestration
- Swagger/OpenAPI documentation
- Ethers.js v6 for blockchain interaction
- Class-validator for request validation
- Modular architecture with dependency injection

**API Endpoints:**
- `GET /api/agents` - List all AI agents
- `POST /api/agents` - Create new agent
- `GET /api/agents/:id` - Get agent details
- `POST /api/agents/:id/execute` - Execute trading strategy
- `GET /api/market/prices` - Fetch current market prices
- `GET /api/portfolio/:address` - Get portfolio stats

**Commands:**
```bash
cd packages/backend
npm run start:dev    # Development mode with hot reload
npm run start:prod   # Production mode
npm run build        # Build for production
npm run test         # Run tests
```

### 🧠 AI Agents (`packages/ai-agents`)

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![LangChain](https://img.shields.io/badge/LangChain-0.1-1C3C3C)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai)

**AI Models:**
- **GPT-4o**: Primary decision-making and strategy generation
- **Claude 3.5 Sonnet**: Risk analysis and market sentiment
- **LangChain**: Reasoning chains and tool orchestration

**Capabilities:**
- Market trend analysis and prediction
- Risk assessment and portfolio optimization
- Automated trading strategy execution
- Multi-agent coordination
- Real-time decision logging

**Commands:**
```bash
cd packages/ai-agents
source venv/bin/activate
python -m src.main              # Start AI agent service
python -m src.backtest          # Run strategy backtesting
python -m pytest tests/         # Run test suite
```

## 🌐 Supported Networks

| Network | Chain ID | Status | RPC URL |
|---------|----------|--------|---------|
| Ethereum Mainnet | 1 | ✅ Production | `https://eth-mainnet.g.alchemy.com` |
| Arc Testnet | 1234 | 🧪 Testing | `https://arc-testnet-rpc.example.com` |
| Monad Testnet | 5678 | 🧪 Testing | `https://monad-testnet-rpc.example.com` |

## 🛠️ Technology Stack

<div align="center">

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Wagmi](https://img.shields.io/badge/Wagmi-2-000000)
![RainbowKit](https://img.shields.io/badge/RainbowKit-2-FF6B6B)

### Backend
![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Ethers.js](https://img.shields.io/badge/Ethers.js-6-2535A0)

### Smart Contracts
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity&logoColor=white)
![Hardhat](https://img.shields.io/badge/Hardhat-2.19-FFF100?logo=hardhat&logoColor=black)
![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-5.0-4E5EE4)

### AI/ML
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-0.1-1C3C3C)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic-Claude-191919)

</div>

## 📚 Documentation

- **Smart Contracts**: See `packages/contracts/README.md` for contract documentation
- **API Reference**: Visit `http://localhost:5000/api/docs` when backend is running
- **Frontend Components**: Check `packages/frontend/src/components/` for UI documentation
- **AI Agents**: Read `packages/ai-agents/docs/` for strategy documentation

## 🧪 Testing

```bash
# Run all tests
npm run test

# Test specific packages
npm run contracts:test    # Smart contract tests
cd packages/frontend && npm run test    # Frontend tests
cd packages/backend && npm run test     # Backend tests
cd packages/ai-agents && pytest         # AI agent tests
```

## 🚢 Deployment

### Smart Contracts
```bash
# Deploy to Arc Testnet
npm run contracts:deploy:arc

# Deploy to Monad Testnet
npm run contracts:deploy:monad

# Verify contracts
cd packages/contracts
npx hardhat verify --network arc <CONTRACT_ADDRESS>
```

### Frontend
```bash
cd packages/frontend
npm run build
# Deploy to Vercel, Netlify, or your preferred hosting
```

### Backend
```bash
cd packages/backend
npm run build
npm run start:prod
# Deploy to AWS, GCP, or your preferred cloud provider
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [https://race-frontend.vercel.app/](https://race-frontend.vercel.app/)
- **Twitter**: [@DawneraGames](https://x.com/DawneraGames)

---

<div align="center">

**Built with ❤️ by the RACE Protocol Team**

[![GitHub stars](https://img.shields.io/github/stars/buct2012dbl/race-protocol?style=social)](https://github.com/buct2012dbl/race-protocol)
[![Twitter Follow](https://img.shields.io/twitter/follow/RACEProtocol?style=social)](https://twitter.com/RACEProtocol)

</div>
