# 🔥 LibreToken GPU Compute Exchange

## The Vision

**A decentralized GPU marketplace where compute is a commodity, like electricity or bandwidth.**

Think:
- **Tor nodes** - Anonymous proxy routing
- **Mining pools** - GPUs contribute hashrate, get paid
- **CDN edge nodes** - Serve content without understanding it
- **Akash/Render** - Decentralized compute markets

---

## 🏗️ Architecture

### Three Simple Layers:

```
┌─────────────────────────────────────────┐
│           USERS                         │
│  (Pay LIBRE tokens, get AI compute)     │
└────────────────┬────────────────────────┘
                 │
                 │ (via Tor - optional)
                 ↓
┌─────────────────────────────────────────┐
│      PROXY/ROUTER (LibreToken)          │
│  - Routes requests to GPUs              │
│  - Handles payments                     │
│  - Manages model distribution           │
│  - OpenAI-compatible API                │
└────────────────┬────────────────────────┘
                 │
                 │ (selects random GPU)
                 ↓
┌─────────────────────────────────────────┐
│        GPU MARKETPLACE                  │
│  - Exchange of available compute        │
│  - Pricing discovery                    │
│  - Reputation tracking                  │
└────────────────┬────────────────────────┘
                 │
                 │ (assigns job)
                 ↓
┌─────────────────────────────────────────┐
│       GPU NODES (Endpoints)             │
│  - Run on user's hardware               │
│  - Execute inference jobs               │
│  - Get paid in LIBRE tokens             │
│  - No user data stored                  │
└─────────────────────────────────────────┘
```

---

## 💻 GPU Node (What GPU Owners Run)

### Installation (Dead Simple):

```bash
# Install globally
npm install -g @libretoken/gpu-node

# Start earning
libre-gpu-node --wallet 0xYourWalletAddress

# That's it!
```

### What It Does:

```javascript
// Pseudocode for GPU node daemon

while (running) {
  // 1. Ping marketplace: "I'm available!"
  heartbeat({ wallet, gpu_info, models_loaded });

  // 2. Wait for job
  job = await pollForJob();

  if (job) {
    // 3. Download model if needed (from IPFS/CDN)
    if (!hasModel(job.model)) {
      await downloadModel(job.model); // Automatic
    }

    // 4. Run inference (local, encrypted)
    result = await runInference(job.encrypted_input);

    // 5. Submit result
    await submitResult(job.id, result);

    // 6. Get paid automatically
    // (Smart contract releases LIBRE tokens)
  }

  await sleep(1000); // Poll every second
}
```

### GPU Owner Experience:

1. **Install** - One command
2. **Configure wallet** - Where to receive LIBRE
3. **Run** - Software handles everything
4. **Earn** - Passive income

**No AI knowledge needed!**

---

## 🌐 Proxy/Router (LibreToken Infrastructure)

### Responsibilities:

1. **API Gateway**
   - OpenAI-compatible endpoints
   - User authentication (wallet + signature)
   - Rate limiting

2. **Job Router**
   - Selects best GPU for job
   - Load balancing
   - Failover handling

3. **Payment Processor**
   - Escrows LIBRE tokens
   - Releases payment on completion
   - Handles disputes

4. **Model Distribution**
   - Hosts models on IPFS
   - CDN fallback
   - Torrent seeding

### Initially: Centralized (You Run It)
Later: DAO-governed, decentralized

---

## 🔄 Request Flow

### Example: Chat Request

```
1. USER calls /v1/chat/completions
   POST https://api.libretoken.ai/v1/chat/completions
   {
     "model": "llama3-70b",
     "messages": [{"role": "user", "content": "Hello"}],
     "privacy": "high" // Use Tor routing
   }

2. ROUTER authenticates user
   - Verify wallet signature
   - Check LIBRE balance
   - Escrow tokens (e.g., 10 LIBRE)

3. ROUTER selects GPU
   - Query marketplace for "llama3-70b" GPUs
   - Pick based on: price, reputation, availability
   - Assign job to GPU node

4. GPU NODE receives job
   - Downloads model if not cached (from IPFS)
   - Runs inference on local GPU
   - Returns encrypted result

5. ROUTER validates result
   - Check proof of compute (inference metrics)
   - Forward result to user
   - Release payment to GPU node

6. USER receives response
   - Identical format to OpenAI API
   - Charged 10 LIBRE tokens
   - GPU node earned 9 LIBRE (1 LIBRE to router for service fee)
```

---

## 🕵️ Tor Integration (Privacy Mode)

### Why Tor?

- **User anonymity**: Router doesn't know who you are
- **GPU anonymity**: GPU doesn't know who you are
- **Content privacy**: Combined with encryption, true privacy

### How It Works:

```
USER (Tor Browser)
  → Tor Entry Node
  → Tor Middle Node
  → Tor Exit Node
  → LibreToken Proxy (sees request from Tor, not real user)
  → GPU Node (sees request from proxy, not real user)
```

### Onion Routing for Compute (Advanced):

```
USER encrypts request in 3 layers
  → GPU Node A (unwraps layer 1, forwards)
  → GPU Node B (unwraps layer 2, runs compute)
  → GPU Node C (re-encrypts, returns)
  → Back to user

No single node sees: user identity + content + result
```

---

## 💰 Economics

### Pricing Discovery (Market-Based):

GPU owners set their prices:
```json
{
  "price_per_1k_tokens": 5,  // LIBRE tokens
  "price_per_image": 25,
  "price_per_second_video": 50
}
```

Router shows users:
```
Available models:
- llama3-70b: 5-15 LIBRE per 1k tokens (20 GPUs available)
- stable-diffusion-xl: 25-40 LIBRE per image (35 GPUs available)
```

Users choose price/speed tradeoff.

### Fee Structure:

- **User pays**: 10 LIBRE
- **GPU receives**: 9 LIBRE (90%)
- **Protocol fee**: 1 LIBRE (10%)

Protocol fee goes to:
- Router infrastructure
- Model hosting (IPFS/CDN)
- Later: DAO treasury

---

## 🎮 GPU Node Hardware Requirements

### Minimum (Chat models):
- GPU: 8GB VRAM (RTX 3070, AMD 6700 XT)
- Models: Llama3-8B, Mistral-7B, Phi-3
- Earnings: ~$10-30/day (if utilized 50%)

### Recommended (Most models):
- GPU: 24GB VRAM (RTX 4090, A5000)
- Models: Llama3-70B, SDXL, AnimateDiff
- Earnings: ~$50-150/day (if utilized 50%)

### High-End (All models):
- GPU: 80GB VRAM (A100, H100)
- Models: Llama3-405B, video generation
- Earnings: ~$200-500/day (if utilized 50%)

---

## 🔐 Privacy Levels

### Level 1: Public (Fast & Cheap)
- No Tor
- Request visible to router
- GPU sees encrypted input
- **Use case**: Non-sensitive tasks

### Level 2: Private (Moderate)
- E2E encryption
- Router sees user wallet (for payment)
- GPU sees nothing
- **Use case**: Business proprietary data

### Level 3: Anonymous (Slow & Expensive)
- Tor routing
- Multi-hop compute
- ZK proofs (future)
- **Use case**: Whistleblowing, journalism, restricted regions

---

## 🚀 Rollout Plan

### Phase 1: Centralized Router (Month 1)
- ✅ You run the proxy/router
- ✅ GPU owners connect
- ✅ Users get AI via API
- ✅ Payments in LIBRE tokens

### Phase 2: Model Distribution (Month 2)
- Add IPFS for models
- Torrent seeding
- Reduce centralization

### Phase 3: Tor Integration (Month 3)
- Anonymous routing
- Privacy mode
- Onion routing (multi-hop)

### Phase 4: DAO Governance (Month 6)
- Router becomes DAO-owned
- Fee voting
- Model curation
- Fully decentralized

---

## 📊 Comparison to Competitors

| Feature | LibreToken | Akash | Render | Bittensor |
|---------|-----------|-------|--------|-----------|
| **GPU Focus** | AI inference | General compute | Rendering | AI training |
| **Privacy** | E2E + Tor | VM isolation | None | None |
| **Ease of Use** | One command | Docker required | Complex | Very complex |
| **API Compat** | OpenAI-compatible | Custom | Custom | Custom |
| **Token Utility** | Pay for compute | Pay for compute | Governance | Governance |
| **Decentralization** | Hybrid → Full | Full | Partial | Full |

---

## 🛠️ Tech Stack

### GPU Node:
- **Language**: JavaScript/Node.js (easy to install)
- **Inference**: Ollama (backend for model execution)
- **Networking**: WebSocket + HTTP
- **Encryption**: TLS + E2E crypto

### Router/Proxy:
- **API**: Express.js (OpenAI-compatible)
- **Database**: PostgreSQL (job queue, marketplace)
- **Blockchain**: Ethers.js (payment processing)
- **Model Storage**: IPFS + CDN

### Smart Contracts:
- **Payment Escrow**: Hold user funds
- **Proof Verification**: Validate compute happened
- **Reputation**: On-chain scores for GPUs
- **Token Economics**: Mint/burn mechanics

---

## 📝 GPU Node API (What It Implements)

### Registration:
```
POST /register
{
  "wallet": "0x...",
  "gpu_model": "RTX 4090",
  "vram_gb": 24,
  "supported_models": ["llama3-70b", "sdxl"]
}
```

### Heartbeat:
```
POST /heartbeat
{
  "wallet": "0x...",
  "status": "idle" | "busy",
  "current_load": 0.0-1.0
}
```

### Job Execution:
```
POST /execute
{
  "job_id": "abc123",
  "model": "llama3-70b",
  "encrypted_input": "...",
  "max_tokens": 500
}

Response:
{
  "result": "...",
  "tokens_used": 234,
  "inference_time_ms": 1234,
  "proof": "..." // Cryptographic proof
}
```

---

## 💡 Key Innovations

1. **Dumb Endpoints**
   - GPU nodes don't need AI expertise
   - Just run software, get paid

2. **Tor-Compatible**
   - True privacy for users
   - Censorship resistant

3. **OpenAI Drop-In**
   - Developers can switch instantly
   - Same API, better privacy

4. **Market-Based Pricing**
   - No fixed fees
   - Supply/demand equilibrium

5. **Proof of Compute**
   - Not wasteful PoW
   - Every hash is useful work

---

## 🤝 GPU Owner Value Prop

**"Earn passive income from your gaming PC"**

- No AI knowledge needed
- One-command setup
- Automatic payments
- Work when idle (doesn't interrupt gaming)
- Withdraw earnings anytime

**Target: 100,000 gaming PCs = Massive distributed compute network**

---

## 🌍 Use Cases

### For Users:
- Private ChatGPT alternative
- Uncensored content generation
- Business confidential AI
- Research in restricted countries
- Adult content creation

### For GPU Owners:
- Monetize idle gaming PC
- Offset GPU purchase cost
- Passive income stream
- Support open AI infrastructure

### For Developers:
- Drop-in OpenAI replacement
- Lower costs (market pricing)
- Privacy guarantees
- No vendor lock-in

---

## 🔮 Future: Fully Decentralized

Eventually:
- **No central router** - P2P job matching
- **On-chain job queue** - Smart contracts only
- **IPFS everything** - Models, jobs, results
- **DAO governance** - Community-run
- **Cross-chain** - LIBRE on multiple chains

**But start simple:** Centralized router, decentralized GPUs.

---

## 🎯 Next Steps

1. **Build GPU node daemon** (simple software for GPU owners)
2. **Build router/proxy** (matchmaking + payments)
3. **Deploy smart contracts** (escrow + proof verification)
4. **Launch marketplace** (connect users ↔ GPUs)
5. **Add Tor support** (privacy mode)
6. **Decentralize gradually** (DAO, P2P)

---

**This is how you actually decentralize AI.** 🚀

Not with complex "agents" but with **dumb, interchangeable GPU endpoints** that anyone can run.

Like Tor. Like mining. Like CDNs.

**Commodity compute + market pricing + privacy = LibreToken**
