# RACE Protocol Backend API

NestJS backend API for the RACE Protocol.

## Features

- **Agents API**: Manage and monitor AI agents
- **Contracts API**: Interact with smart contracts
- **Analytics API**: Get performance metrics and analytics
- **Swagger Documentation**: Auto-generated API docs

## Installation

```bash
npm install
```

## Running

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Documentation

Once running, visit: http://localhost:3002/api

## Endpoints

### Agents
- `GET /agents` - Get all agents
- `GET /agents/:address` - Get agent details
- `GET /agents/:address/performance` - Get performance metrics
- `GET /agents/:address/decisions` - Get decision history
- `POST /agents/:address/execute` - Execute decision

### Contracts
- `GET /contracts/addresses` - Get contract addresses
- `GET /contracts/stats` - Get protocol statistics

### Analytics
- `GET /analytics/dashboard` - Get dashboard data
- `GET /analytics/performance?period=7d` - Get performance data

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
PORT=3002
WEB3_PROVIDER_URI=https://rpc.arc.testnet
```

## Architecture

```
src/
├── agents/          # AI agent management
├── contracts/       # Smart contract interactions
├── analytics/       # Analytics and reporting
├── app.module.ts    # Root module
└── main.ts          # Entry point
```
