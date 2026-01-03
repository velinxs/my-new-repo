# 🕵️ LibreToken: Fully Serverless Tor Architecture

## The Vision: Unstoppable AI Compute

**Like Tor + BitTorrent + Bitcoin had a baby.**

- **No central server** - Just smart contracts
- **Full Tor routing** - Complete anonymity
- **P2P marketplace** - GPU owners stake, users pay
- **Censorship impossible** - No single point of failure

---

## 🏗️ Architecture

```
┌─────────────┐
│    USER     │
│ (Tor Browser)│
└──────┬──────┘
       │
       ↓ (through Tor circuit)
       │
┌──────▼──────────────────────────┐
│   SMART CONTRACT (On-Chain)     │
│  - GPU registry                 │
│  - Staking & escrow             │
│  - Proof verification           │
│  - Payment settlement           │
└──────┬──────────────────────────┘
       │
       ↓ (query for available GPUs)
       │
┌──────▼──────────────────────────┐
│   GPU MARKETPLACE (On-Chain)    │
│                                 │
│  GPU1: llama3-70b (.onion addr) │
│  GPU2: sdxl (.onion addr)       │
│  GPU3: mistral-7b (.onion addr) │
│  ...                            │
└──────┬──────────────────────────┘
       │
       ↓ (user picks random GPU)
       │
┌──────▼──────────────────────────┐
│   TOR CIRCUIT                   │
│   Entry → Middle → Exit         │
└──────┬──────────────────────────┘
       │
       ↓
┌──────▼──────────────────────────┐
│   GPU NODE (.onion service)     │
│  - Runs local Ollama            │
│  - Executes inference           │
│  - Returns encrypted result     │
│  - Submits proof on-chain       │
└──────┬──────────────────────────┘
       │
       ↓ (response through Tor)
       │
┌──────▼──────┐
│    USER     │
│  (receives  │
│   result)   │
└─────────────┘
```

---

## 🔄 Request Flow (Step-by-Step)

### Phase 1: Discovery

```javascript
// 1. User queries smart contract (via Web3)
const gpus = await LibreTokenContract.getGPUs({
  model: "llama3-70b",
  minReputation: 100,
  maxPricePerToken: 0.01
});

// Returns:
[
  {
    torAddress: "abc123def456.onion",
    model: "llama3-70b",
    pricePerToken: 0.008,
    reputation: 1250,
    staked: 5000 // LIBRE tokens staked
  },
  ...
]
```

### Phase 2: Selection & Escrow

```javascript
// 2. User picks random GPU (client-side)
const selectedGPU = gpus[Math.floor(Math.random() * gpus.length)];

// 3. User deposits escrow to smart contract
const estimatedCost = 100; // LIBRE tokens
await LibreTokenContract.createRequest({
  gpuAddress: selectedGPU.walletAddress,
  escrowAmount: estimatedCost,
  requestHash: sha256(encryptedPrompt), // For verification
  timeout: 300 // 5 minutes
});

// Contract holds 100 LIBRE in escrow
```

### Phase 3: Tor Connection

```javascript
// 4. User connects to GPU via Tor (SOCKS5 proxy)
const response = await fetch(`http://${selectedGPU.torAddress}/inference`, {
  method: 'POST',
  agent: new SocksProxyAgent('socks5h://localhost:9050'), // Tor proxy
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'llama3-70b',
    encrypted_prompt: encryptedPrompt, // E2E encrypted
    request_id: requestId,
    user_signature: signature // Proves they paid
  })
});

// Connection is fully anonymized through Tor circuit:
// User → Tor Entry → Tor Middle → Tor Exit → GPU (.onion) → Back
```

### Phase 4: GPU Execution

```javascript
// GPU node receives request (on its .onion hidden service)
// - Decrypts prompt (E2E encryption)
// - Runs inference via local Ollama
// - Encrypts result
// - Returns + submits proof on-chain

const result = await ollama.generate({
  model: 'llama3-70b',
  prompt: decryptedPrompt
});

// Submit proof to smart contract
await LibreTokenContract.submitProof({
  requestId,
  resultHash: sha256(encryptedResult),
  tokensUsed: result.tokens,
  computeProof: {
    inferenceTime: result.inferenceTime,
    gpuSignature: signWithGPUKey(result)
  }
});
```

### Phase 5: Payment Settlement

```solidity
// Smart contract verifies proof and releases payment

function settleRequest(bytes32 requestId) external {
  Request memory req = requests[requestId];
  require(req.proofSubmitted, "No proof");
  require(block.timestamp < req.timeout, "Timeout");

  // Calculate actual cost
  uint256 actualCost = req.tokensUsed * req.pricePerToken;
  uint256 refund = req.escrowAmount - actualCost;

  // Pay GPU (90%)
  uint256 gpuPayment = (actualCost * 90) / 100;
  _transfer(address(this), req.gpuWallet, gpuPayment);

  // Burn (10%)
  uint256 burnAmount = actualCost - gpuPayment;
  _burn(address(this), burnAmount);

  // Refund excess to user
  if (refund > 0) {
    _transfer(address(this), req.userWallet, refund);
  }

  // Update reputation
  gpus[req.gpuWallet].reputation += 10;
  gpus[req.gpuWallet].completedJobs++;
}
```

---

## 🔐 Security Model

### 1. User Privacy
- **Tor circuit**: IP hidden from GPU
- **E2E encryption**: Content hidden from everyone
- **No registration**: No KYC, no accounts
- **Anonymous wallet**: Use fresh address each time

### 2. GPU Accountability
- **Staking**: GPUs stake LIBRE tokens
- **Slashing**: Lose stake if they:
  - Don't respond (timeout)
  - Submit invalid proof
  - Get negative reviews
- **Reputation**: On-chain score (can't be faked)

### 3. Proof of Compute
```javascript
// GPU must prove it actually ran inference
{
  resultHash: sha256(encryptedOutput), // Commits to result
  tokensUsed: 1234,
  inferenceTime: 5678,
  signature: sign(above, gpuPrivateKey), // Can't fake
  timestamp: block.timestamp
}
```

Smart contract verifies:
- Signature is from registered GPU
- Timestamp is within timeout window
- Result hash matches what GPU claims

### 4. Dispute Resolution
```solidity
// If GPU doesn't respond within timeout
function claimTimeout(bytes32 requestId) external {
  Request memory req = requests[requestId];
  require(msg.sender == req.userWallet);
  require(block.timestamp > req.timeout);
  require(!req.proofSubmitted);

  // Refund user
  _transfer(address(this), req.userWallet, req.escrowAmount);

  // Slash GPU stake
  gpus[req.gpuWallet].stake -= 100; // Penalty
  gpus[req.gpuWallet].reputation -= 50;
}
```

---

## 🌐 Tor Integration

### GPU Node Setup (Tor Hidden Service)

```bash
# 1. Install Tor
sudo apt-get install tor

# 2. Configure hidden service
echo "HiddenServiceDir /var/lib/tor/libre_gpu/" >> /etc/tor/torrc
echo "HiddenServicePort 80 127.0.0.1:8080" >> /etc/tor/torrc

# 3. Restart Tor
sudo systemctl restart tor

# 4. Get .onion address
cat /var/lib/tor/libre_gpu/hostname
# Output: abc123def456.onion

# 5. Start GPU node (listens on localhost:8080)
libre-gpu-node --wallet 0xYourWallet --port 8080
```

GPU is now accessible at `abc123def456.onion` via Tor!

### User Client (Tor Connection)

```javascript
import { SocksProxyAgent } from 'socks-proxy-agent';

// Connect through local Tor instance (9050)
const agent = new SocksProxyAgent('socks5h://localhost:9050');

const response = await fetch('http://abc123def456.onion/inference', {
  method: 'POST',
  agent,
  body: JSON.stringify({ ... })
});
```

---

## 💰 Token Economics (Serverless)

### No Platform Fee!

```
User pays: 100 LIBRE
  ↓
Escrow in smart contract
  ↓
GPU completes work
  ↓
GPU receives: 90 LIBRE (90%)
Burned: 10 LIBRE (10% deflationary)
```

**No middleman = No platform cut!**

10% burn creates deflationary pressure (token appreciates).

### Staking Requirements

| GPU Tier | Min Stake | Slash Amount |
|----------|-----------|--------------|
| Entry (8GB) | 100 LIBRE | 10 LIBRE/failure |
| Mid (24GB) | 500 LIBRE | 50 LIBRE/failure |
| High (80GB) | 2000 LIBRE | 200 LIBRE/failure |

Higher stake = higher trust = charge premium prices.

---

## 🛠️ Smart Contract Design

### GPURegistry.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GPURegistry {
    struct GPU {
        address wallet;
        string torAddress; // .onion address
        string model; // "llama3-70b"
        uint256 pricePerToken; // in LIBRE
        uint256 stake;
        uint256 reputation;
        uint256 completedJobs;
        uint256 failedJobs;
        bool active;
    }

    struct Request {
        bytes32 id;
        address userWallet;
        address gpuWallet;
        uint256 escrowAmount;
        bytes32 requestHash;
        uint256 timeout;
        bool proofSubmitted;
        bool settled;
        uint256 tokensUsed;
    }

    IERC20 public libreToken;
    mapping(address => GPU) public gpus;
    mapping(bytes32 => Request) public requests;
    address[] public gpuList;

    // GPU registers with stake
    function registerGPU(
        string memory torAddress,
        string memory model,
        uint256 pricePerToken,
        uint256 stakeAmount
    ) external {
        require(stakeAmount >= 100 ether, "Min stake 100 LIBRE");

        // Transfer stake to contract
        libreToken.transferFrom(msg.sender, address(this), stakeAmount);

        gpus[msg.sender] = GPU({
            wallet: msg.sender,
            torAddress: torAddress,
            model: model,
            pricePerToken: pricePerToken,
            stake: stakeAmount,
            reputation: 1000, // Start at 1000
            completedJobs: 0,
            failedJobs: 0,
            active: true
        });

        gpuList.push(msg.sender);

        emit GPURegistered(msg.sender, torAddress, model);
    }

    // User creates request with escrow
    function createRequest(
        address gpuWallet,
        uint256 escrowAmount,
        bytes32 requestHash,
        uint256 timeoutSeconds
    ) external returns (bytes32) {
        require(gpus[gpuWallet].active, "GPU not active");

        // Transfer escrow to contract
        libreToken.transferFrom(msg.sender, address(this), escrowAmount);

        bytes32 requestId = keccak256(abi.encodePacked(
            msg.sender,
            gpuWallet,
            block.timestamp,
            requestHash
        ));

        requests[requestId] = Request({
            id: requestId,
            userWallet: msg.sender,
            gpuWallet: gpuWallet,
            escrowAmount: escrowAmount,
            requestHash: requestHash,
            timeout: block.timestamp + timeoutSeconds,
            proofSubmitted: false,
            settled: false,
            tokensUsed: 0
        });

        emit RequestCreated(requestId, msg.sender, gpuWallet, escrowAmount);

        return requestId;
    }

    // GPU submits proof of work
    function submitProof(
        bytes32 requestId,
        bytes32 resultHash,
        uint256 tokensUsed
    ) external {
        Request storage req = requests[requestId];
        require(msg.sender == req.gpuWallet, "Not assigned GPU");
        require(!req.settled, "Already settled");
        require(block.timestamp < req.timeout, "Timeout");

        req.proofSubmitted = true;
        req.tokensUsed = tokensUsed;

        emit ProofSubmitted(requestId, resultHash, tokensUsed);
    }

    // Settle payment
    function settleRequest(bytes32 requestId) external {
        Request storage req = requests[requestId];
        require(req.proofSubmitted, "No proof");
        require(!req.settled, "Already settled");

        GPU storage gpu = gpus[req.gpuWallet];

        // Calculate cost
        uint256 actualCost = req.tokensUsed * gpu.pricePerToken;
        require(actualCost <= req.escrowAmount, "Cost exceeds escrow");

        // Pay GPU (90%)
        uint256 gpuPayment = (actualCost * 90) / 100;
        libreToken.transfer(req.gpuWallet, gpuPayment);

        // Burn (10%)
        uint256 burnAmount = actualCost - gpuPayment;
        // Burn implementation (transfer to dead address or actual burn)

        // Refund excess
        uint256 refund = req.escrowAmount - actualCost;
        if (refund > 0) {
            libreToken.transfer(req.userWallet, refund);
        }

        // Update GPU stats
        gpu.reputation += 10;
        gpu.completedJobs++;

        req.settled = true;

        emit RequestSettled(requestId, actualCost, gpuPayment, refund);
    }

    // Claim timeout (user gets refund, GPU loses stake)
    function claimTimeout(bytes32 requestId) external {
        Request storage req = requests[requestId];
        require(msg.sender == req.userWallet, "Not requester");
        require(block.timestamp > req.timeout, "Not timed out");
        require(!req.proofSubmitted, "Proof submitted");
        require(!req.settled, "Already settled");

        GPU storage gpu = gpus[req.gpuWallet];

        // Refund user
        libreToken.transfer(req.userWallet, req.escrowAmount);

        // Slash GPU stake
        uint256 slashAmount = 100 ether; // 100 LIBRE penalty
        if (gpu.stake >= slashAmount) {
            gpu.stake -= slashAmount;
            // Burn slashed tokens
        }

        gpu.reputation -= 50;
        gpu.failedJobs++;

        req.settled = true;

        emit TimeoutClaimed(requestId);
    }

    // Query available GPUs
    function getGPUs(string memory model) external view returns (GPU[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < gpuList.length; i++) {
            if (gpus[gpuList[i]].active &&
                keccak256(bytes(gpus[gpuList[i]].model)) == keccak256(bytes(model))) {
                count++;
            }
        }

        GPU[] memory result = new GPU[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < gpuList.length; i++) {
            if (gpus[gpuList[i]].active &&
                keccak256(bytes(gpus[gpuList[i]].model)) == keccak256(bytes(model))) {
                result[index] = gpus[gpuList[i]];
                index++;
            }
        }

        return result;
    }

    event GPURegistered(address indexed wallet, string torAddress, string model);
    event RequestCreated(bytes32 indexed requestId, address indexed user, address indexed gpu, uint256 escrow);
    event ProofSubmitted(bytes32 indexed requestId, bytes32 resultHash, uint256 tokensUsed);
    event RequestSettled(bytes32 indexed requestId, uint256 cost, uint256 gpuPayment, uint256 refund);
    event TimeoutClaimed(bytes32 indexed requestId);
}
```

---

## 🚀 User Experience

### As Simple As Possible:

```bash
# Install client
npm install -g @libretoken/client

# Buy LIBRE tokens (on DEX or exchange)
# ...

# Use AI (automatically routes through Tor to random GPU)
libre chat "Write a poem about freedom"

# Behind the scenes:
# - Connects to smart contract
# - Finds available GPUs
# - Escrows payment
# - Routes through Tor to GPU
# - Gets result
# - Settles payment

# That's it!
```

---

## 🎯 Why This is Revolutionary

| Feature | OpenAI | Bittensor | Akash | **LibreToken** |
|---------|--------|-----------|-------|----------------|
| Central server | ✅ | ❌ | ❌ | ❌ |
| Tor routing | ❌ | ❌ | ❌ | ✅ |
| Full anonymity | ❌ | ❌ | ❌ | ✅ |
| No platform fee | ❌ | ✅ | ❌ | ✅ |
| Unstoppable | ❌ | ⚠️ | ⚠️ | ✅ |
| Easy to use | ✅ | ❌ | ❌ | ✅ |

---

## 🔮 Future Enhancements

### 1. Onion Routing (Multi-Hop)
Request passes through 3 GPUs:
- GPU1: Unwraps layer, forwards
- GPU2: Runs compute
- GPU3: Re-encrypts, returns

**No single GPU sees: user + content + result**

### 2. DHT Discovery (No blockchain queries)
Use Kademlia DHT instead of smart contract queries:
- GPUs announce themselves to DHT
- Users query DHT for available GPUs
- Even more decentralized

### 3. IPFS Model Distribution
- Models hosted on IPFS
- GPUs download via BitTorrent-style swarm
- No central model hosting

---

## 📊 Comparison: Centralized vs Serverless

| Aspect | Router Model (v1) | Serverless Model (v2) |
|--------|------------------|---------------------|
| **Architecture** | Central router + GPUs | Smart contract + GPUs |
| **Shutdown risk** | Router can be shut down | Unstoppable |
| **Privacy** | Router sees requests | Full Tor anonymity |
| **Platform fee** | 10% to router | 10% burned |
| **Censorship** | Router can filter | Impossible |
| **Trust required** | Trust router | Trustless |
| **Complexity** | Simpler (centralized) | More complex (P2P) |

**We build v1 (router) first, then migrate to v2 (serverless) after proof-of-concept.**

---

## 🛠️ Build Plan

### Phase 1: Smart Contracts (Week 1)
- [x] GPU registry contract
- [ ] Request escrow contract
- [ ] Proof verification
- [ ] Stake/slash mechanics

### Phase 2: GPU Node (Week 2)
- [ ] Tor hidden service setup
- [ ] Inference endpoint
- [ ] Proof submission
- [ ] Auto-model download

### Phase 3: Client (Week 3)
- [ ] Tor connection (SOCKS5)
- [ ] Smart contract integration
- [ ] E2E encryption
- [ ] Simple CLI

### Phase 4: Testing (Week 4)
- [ ] Testnet deployment
- [ ] End-to-end flow
- [ ] Load testing
- [ ] Security audit

### Phase 5: Mainnet (Month 2)
- [ ] Mainnet deployment
- [ ] Liquidity for LIBRE token
- [ ] Marketing/launch

---

**This is how you build truly unstoppable, private, decentralized AI.**

No servers. No censorship. No surveillance.

Just:
- Smart contracts
- Tor
- GPUs staking compute
- Users paying with crypto

**Let's build it.** 🚀
