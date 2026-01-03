# 🔒 Privacy Features - Quick Start Guide

## What's New?

Your Proof of Useful Work Token now supports:

✅ **E2E Encryption** - Tasks encrypted client-to-agent
✅ **Local LLM Support** - Run uncensored models (Llama, Mistral, etc.)
✅ **Privacy Tiers** - Choose your privacy level
✅ **No Content Filtering** - True uncensored AI compute

---

## 🚀 Setup

### Step 1: Install Ollama (Local LLM Runtime)

**Mac/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from [ollama.com](https://ollama.com)

### Step 2: Pull an Uncensored Model

```bash
# Option 1: Llama 3 70B (Recommended)
ollama pull llama3:70b

# Option 2: Dolphin Mixtral (Uncensored, fast)
ollama pull dolphin-mixtral

# Option 3: WizardLM Uncensored
ollama pull wizardlm-uncensored

# Option 4: MythoMax (Creative, no restrictions)
ollama pull mythomax
```

### Step 3: Start Ollama Server

```bash
ollama serve
# Runs on http://localhost:11434
```

### Step 4: Configure Backend

Add to your `.env`:

```bash
# Local LLM Configuration
OLLAMA_BASE_URL=http://localhost:11434
LOCAL_MODEL=llama3:70b

# Or use a different model
# LOCAL_MODEL=dolphin-mixtral
```

### Step 5: Start Services

```bash
cd backend

# Terminal 1: API Server
npm start

# Terminal 2: Worker (supports both Claude & Local LLM)
npm run worker
```

---

## 🔐 Using Privacy Features

### Check Agent Capabilities

```bash
curl http://localhost:3000/api/privacy/agent/capabilities
```

Response:
```json
{
  "wallet": "0x...",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
  "backends": {
    "claude": true,
    "localLLM": true
  },
  "supportedTiers": ["public", "private"],
  "models": [
    {"name": "llama3:70b", "size": 70000000000},
    {"name": "dolphin-mixtral", "size": 47000000000}
  ]
}
```

### Get Agent Public Key (for encryption)

```bash
curl http://localhost:3000/api/privacy/agent/public-key
```

### Test Encryption/Decryption

```bash
# Encrypt some data
curl -X POST http://localhost:3000/api/privacy/encrypt \
  -H "Content-Type: application/json" \
  -d '{"data": "My secret task"}'

# Response includes encrypted payload
{
  "success": true,
  "encrypted": {
    "encryptedData": "...",
    "ephemeralPublicKey": "...",
    "iv": "...",
    "authTag": "..."
  }
}
```

---

## 📊 Privacy Tiers

| Tier | Backend | Encrypted | Censored | Cost Multiplier |
|------|---------|-----------|----------|-----------------|
| **Public** | Claude API | ❌ No | ✅ Yes | 1x |
| **Private** | Local LLM | ✅ Yes | ❌ No | 3x |
| **Anonymous** | ZK Proofs | ✅ Yes | ❌ No | 10x (future) |

### Public Tier (Default)
- Uses Claude API
- Fast, high quality
- Content policies apply
- Task visible to backend

### Private Tier (NEW!)
- Local LLM (your hardware)
- E2E encrypted
- No content filtering
- True privacy

---

## 🧪 Testing Local LLM

### Simple Test

```bash
# Test Ollama directly
curl http://localhost:11434/api/generate -d '{
  "model": "llama3:70b",
  "prompt": "Write a poem about privacy",
  "stream": false
}'
```

### Submit Task to Worker

The worker will automatically use local LLM if:
1. Ollama is running
2. `LOCAL_MODEL` is configured
3. Task specifies `privacy_tier: 'private'`

---

## 🎯 Uncensored Use Cases

### What "Uncensored" Means

Local models have **no content filtering**. You can use them for:

✅ Political discourse (any viewpoint)
✅ Adult content generation
✅ Controversial research
✅ Creative writing (dark themes, violence, etc.)
✅ Competitive intelligence
✅ Proprietary business research

### Legal Disclaimer

⚠️ **You are responsible for legal compliance in your jurisdiction.**

- Don't use for illegal content (CSAM, terrorism, etc.)
- Respect local laws on speech and content
- Agent operators can refuse tasks
- Platform is neutral, not endorsing any content

---

## 🔧 Advanced Configuration

### Multiple Models

Edit `.env` to switch models:

```bash
# Fast & uncensored (8B parameters)
LOCAL_MODEL=dolphin-llama3:8b

# Balanced (70B parameters)
LOCAL_MODEL=llama3:70b

# Maximum capability (405B parameters, needs 200GB+ RAM)
LOCAL_MODEL=llama3:405b
```

### Custom Ollama Instance

Run Ollama on different port or remote server:

```bash
OLLAMA_BASE_URL=http://192.168.1.100:11434
```

### GPU Configuration

Ollama automatically uses GPU if available:

```bash
# Check GPU usage while running
nvidia-smi

# Or use Ollama's built-in monitoring
ollama ps
```

---

## 🌐 Multi-Agent Setup (Future)

When we add multi-agent marketplace:

1. **Agents register capabilities**
   - Public key for encryption
   - Supported models
   - Privacy tiers offered
   - Pricing

2. **Requesters choose agent**
   - Filter by privacy tier
   - Check reputation
   - Compare pricing

3. **Market dynamics**
   - Premium for privacy
   - Competition drives quality
   - Reputation system

---

## 📈 Economics of Privacy

### Pricing Tiers

**Suggested pricing** (adjust in your config):

- Public: 1 WORK per 1k tokens
- Private: 3 WORK per 1k tokens (encryption + local compute)
- Anonymous: 10 WORK per 1k tokens (ZK proof generation)

### Why Privacy Costs More

1. **Hardware**: Agents need expensive GPUs
2. **Electricity**: Local inference uses power
3. **Risk**: No platform moderation
4. **Encryption**: Overhead for E2E crypto

---

## 🛠️ Troubleshooting

### "Ollama not available"

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start it:
ollama serve
```

### "Model not found"

```bash
# Pull the model first
ollama pull llama3:70b

# List available models
ollama list
```

### "Out of memory"

Large models need RAM:

- `llama3:8b` - 8GB RAM
- `llama3:70b` - 64GB RAM
- `llama3:405b` - 200GB+ RAM

Use smaller model or add more RAM/swap.

### "Slow inference"

Local LLM is slower than API:

- Use GPU for 10-50x speedup
- Try smaller model (8b vs 70b)
- Consider quantized models (Q4, Q5)

---

## 🔮 Roadmap

### Phase 1 (Current)
- [x] E2E encryption
- [x] Local LLM support
- [x] Privacy tiers
- [ ] Frontend integration

### Phase 2
- [ ] Multi-agent marketplace
- [ ] Reputation system
- [ ] Encrypted task storage (IPFS)
- [ ] Client-side encryption library

### Phase 3
- [ ] Zero-knowledge proofs
- [ ] Decentralized oracle network
- [ ] DAO governance
- [ ] Mainnet deployment

---

## 🎓 Learn More

- [Ollama Documentation](https://github.com/ollama/ollama)
- [PRIVACY_ARCHITECTURE.md](./PRIVACY_ARCHITECTURE.md) - Full technical spec
- [README.md](./README.md) - Main project docs

---

## 🤝 Questions?

- Privacy concerns? Check PRIVACY_ARCHITECTURE.md
- Setup issues? See troubleshooting above
- Feature requests? Open an issue

**Happy private computing!** 🔒
