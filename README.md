# RACE Protocol - RWA-Powered Autonomous Commerce Engine

A fully autonomous AI agent network that transforms Real World Assets (RWA) into on-chain productive capital, driving automated DeFi commerce activities.

## 🏗️ Architecture

```
race-protocol/
├── packages/
│   ├── contracts/       # Smart contracts (Solidity)
│   ├── frontend/        # Next.js 15 web application
│   ├── backend/         # NestJS API server
│   └── ai-agents/       # Python AI decision engine
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- Python >= 3.11
- npm >= 10.0.0

### Installation

```bash
# Install dependencies
npm install

# Setup Python environment
cd packages/ai-agents
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Development

```bash
# Run all services
npm run dev

# Run specific services
npm run frontend:dev
npm run backend:dev
npm run contracts:compile
npm run ai:dev
```

## 📦 Packages

### Smart Contracts (`packages/contracts`)
- RWA Vault for asset tokenization
- AI Agent core contracts with ERC-6551
- Risk management and liquidation protection
- Oracle aggregator system
- Revenue distribution

### Frontend (`packages/frontend`)
- Next.js 15 with App Router
- Wagmi 2.x + Viem 2.x for multi-chain support
- shadcn/ui + Tailwind CSS
- Real-time agent monitoring dashboard

### Backend (`packages/backend`)
- NestJS API server
- PostgreSQL + TimescaleDB
- Redis caching
- Agent orchestration

### AI Agents (`packages/ai-agents`)
- LangChain-based decision engine
- GPT-4o + Claude 3.5 Sonnet integration
- Market analysis and risk assessment
- Autonomous trading strategies

## 🌐 Supported Chains

- Ethereum Mainnet
- Arc Testnet
- Monad Testnet

## 📝 License

MIT
