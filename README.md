# ⚡ Proof of Useful Work Token

> AI Labor Backed Cryptocurrency - MVP

A crypto token where value is backed by verified AI agent labor. Instead of wasteful proof-of-work mining, tokens are minted proportional to useful work done by AI agents. LLM compute tokens become the proof of work.

## 🎯 Concept

Traditional cryptocurrency mining wastes enormous computational resources on meaningless hash calculations. This project flips that model:

1. **Requester** submits a task (e.g., "Write a blog post about renewable energy")
2. **AI Agent** completes the task using Claude API
3. **Compute usage** is logged from API response (proof of work)
4. **Blockchain proof** is submitted on-chain with task hash and compute tokens used
5. **Tokens are minted** proportional to the compute work done
6. **Agent receives tokens** that can be withdrawn to their wallet

**The insight:** LLM compute tokens ARE proof of work. API usage receipts are your mining logs.

## 🏗️ Architecture

### Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (task queue, work logs)
- **Blockchain**: Base (EVM compatible, cheap transactions)
- **AI**: Claude API (Anthropic)
- **Smart Contract**: Solidity + Foundry

### Components

```
┌─────────────┐
│  Requester  │ Submits task
└──────┬──────┘
       │
       v
┌─────────────────┐
│  Task Manager   │ Queues task in DB
│      API        │
└─────────────────┘
       │
       v
┌─────────────────┐
│ Agent Worker    │ Processes with Claude API
│                 │ Logs compute tokens used
└─────────────────┘
       │
       v
┌─────────────────┐
│ Proof Submitter │ Batches & submits on-chain
└─────────────────┘
       │
       v
┌─────────────────┐
│ Smart Contract  │ Mints tokens based on work
│   (WorkToken)   │
└─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Foundry (for smart contract deployment)
- Anthropic API key
- Base Sepolia testnet wallet with ETH (for testnet deployment)

### 1. Clone and Install

```bash
git clone <your-repo>
cd proof-of-work-token

# Install backend dependencies
cd backend
npm install
```

### 2. Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit .env and add:
# - ANTHROPIC_API_KEY (get from https://console.anthropic.com/)
# - AGENT_WALLET (your agent's wallet address)
# - Other optional settings
```

### 3. Initialize Database

```bash
npm run init-db
```

### 4. Start Backend API

```bash
npm start
# API runs on http://localhost:3000
```

### 5. Start Agent Worker (in new terminal)

```bash
npm run worker
# Worker polls for tasks and processes them
```

### 6. Test with Frontend

```bash
# Open frontend/index.html in your browser
# Or serve it:
cd frontend
python -m http.server 8080
# Visit http://localhost:8080
```

## 📋 API Endpoints

### Create Task
```bash
POST /api/tasks
{
  "requester_wallet": "0x...",
  "description": "Write a short poem about blockchain"
}
```

### Get Task
```bash
GET /api/tasks/:id
```

### List Tasks
```bash
GET /api/tasks?status=completed&limit=10
```

### Get Agent Stats
```bash
GET /api/tasks/stats/agent/:wallet
```

## 📝 Example Usage

```bash
# Submit a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "requester_wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "description": "Explain quantum computing in simple terms"
  }'

# Check task status
curl http://localhost:3000/api/tasks/<task-id>

# View agent stats
curl http://localhost:3000/api/tasks/stats/agent/0x...
```

## 🔗 Blockchain Deployment (Phase 2)

### Deploy Smart Contract

```bash
cd contracts

# Install Foundry if you haven't
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Make deploy script executable
chmod +x deploy.sh

# Deploy to Base Sepolia testnet
./deploy.sh
```

### Configure Contract Address

After deployment, add the contract address to `.env`:

```
CONTRACT_ADDRESS=0x...
```

### Start Proof Submitter

```bash
cd backend
node services/proof-submitter.js
```

This service runs in the background and batches completed tasks to submit proofs on-chain.

## 💰 Token Economics

### Mint Rate

Configured via `MINT_RATE` environment variable:
- `MINT_RATE=1`: 1 LLM token = 1 chain token
- `MINT_RATE=10`: 1 LLM token = 10 chain tokens

Example: A task uses 5,000 LLM tokens (input + output). With `MINT_RATE=1`, the agent earns 5,000 WorkTokens.

### Token Supply

- **Initial supply**: 0 (all tokens minted through work)
- **Minting**: Only via verified work proofs submitted by oracle
- **No cap**: Supply grows with useful work done

### Oracle Trust Model (MVP)

For this MVP, the backend is the trusted oracle. It:
- Verifies tasks were completed
- Logs actual compute usage from Claude API
- Submits proofs on-chain

**Future decentralization:**
- Multiple independent oracles
- Slashing for invalid proofs
- Consensus on work verification
- Dispute resolution mechanisms

## 🧪 Testing the Full Loop

1. **Start all services:**
   ```bash
   # Terminal 1: API
   npm start

   # Terminal 2: Worker
   npm run worker

   # Terminal 3: Proof submitter (after contract deployed)
   node services/proof-submitter.js
   ```

2. **Submit a task** via frontend or API

3. **Watch worker logs** - it will pick up and process the task

4. **Check task status** - should show completed with compute tokens

5. **Watch proof submitter** - batches and submits on-chain

6. **Verify on BaseScan** - check the transaction and event logs

## 📁 Project Structure

```
proof-of-work-token/
├── backend/
│   ├── server.js              # Express API server
│   ├── routes/
│   │   └── tasks.js           # Task API endpoints
│   ├── services/
│   │   ├── agent.js           # Claude API integration
│   │   ├── worker.js          # Task processor
│   │   ├── blockchain.js      # On-chain proof submission
│   │   └── proof-submitter.js # Batch proof submitter
│   ├── db/
│   │   ├── schema.sql         # Database schema
│   │   ├── init.js            # DB initialization
│   │   └── connection.js      # DB connection helper
│   └── package.json
├── contracts/
│   ├── WorkToken.sol          # ERC-20 token contract
│   ├── foundry.toml           # Foundry config
│   └── deploy.sh              # Deployment script
├── frontend/
│   └── index.html             # Simple demo UI
├── .env.example               # Environment config template
└── README.md
```

## 🔧 Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | API server port |
| `ANTHROPIC_API_KEY` | Yes | - | Claude API key |
| `AGENT_WALLET` | Yes | - | Agent's wallet address |
| `WORKER_POLL_INTERVAL` | No | 5000 | Task polling interval (ms) |
| `RPC_URL` | No* | - | Blockchain RPC endpoint |
| `ORACLE_PRIVATE_KEY` | No* | - | Oracle wallet private key |
| `CONTRACT_ADDRESS` | No* | - | Deployed contract address |
| `MINT_RATE` | No | 1 | LLM tokens per chain token |
| `PROOF_SUBMIT_INTERVAL` | No | 60000 | Proof submission interval (ms) |

\* Required for Phase 2 (on-chain functionality)

## 🛣️ Roadmap

### ✅ Phase 1: Centralized PoC (Current)
- [x] Task API
- [x] Agent worker
- [x] Compute tracking
- [x] Simple frontend

### ✅ Phase 2: On-Chain
- [x] Smart contract
- [x] Proof submission
- [x] Token minting
- [ ] Deployed to testnet

### 📋 Phase 3: Close the Loop
- [ ] Require token stake to submit tasks
- [ ] Task pricing based on estimated compute
- [ ] Marketplace UI
- [ ] Agent withdrawal interface

### 📋 Future
- [ ] Multiple agent support
- [ ] Task categories/specialization
- [ ] Quality verification & disputes
- [ ] Decentralized oracle network
- [ ] Mainnet deployment

## 🤔 Design Decisions

### Why Base?

- EVM compatible (easy to integrate)
- Very low transaction fees
- Fast finality
- Strong ecosystem

### Why SQLite?

- Zero configuration
- Perfect for MVP
- Easy to migrate to PostgreSQL later

### Why Centralized Oracle?

For MVP, centralized oracle allows us to:
- Prove the concept quickly
- Iterate on tokenomics
- Validate market fit

Later we'll decentralize with:
- Multiple trusted oracles
- Stake-based security
- Slashing for bad actors

## 🔐 Security Considerations

**Current (MVP):**
- Oracle is trusted (your backend)
- No validation of output quality
- No protection against oracle manipulation

**Production TODO:**
- Multiple independent oracles
- Stake requirements for oracles
- Slashing for proven fraud
- Output quality verification
- Rate limiting on task submissions
- Sybil resistance

## 🐛 Troubleshooting

### Worker not processing tasks

Check:
- `ANTHROPIC_API_KEY` is set correctly
- Worker is running (`npm run worker`)
- Database is initialized
- Check worker logs for errors

### Proofs not submitting on-chain

Check:
- `CONTRACT_ADDRESS` is set in `.env`
- `RPC_URL` is accessible
- `ORACLE_PRIVATE_KEY` wallet has ETH for gas
- Contract is deployed
- Proof submitter is running

### Frontend not connecting

- Check API is running on port 3000
- Update `API_URL` in frontend/index.html if needed
- Check browser console for CORS errors

## 📖 Learn More

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Base Network](https://base.org/)
- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 📄 License

MIT

## 🤝 Contributing

This is an MVP / proof of concept. Feel free to fork and experiment!

Ideas for improvement:
- Task categories and specialized agents
- Reputation system for agents
- Quality verification mechanisms
- More sophisticated tokenomics
- Decentralized oracle network

---

**Built with Claude Code** 🤖
