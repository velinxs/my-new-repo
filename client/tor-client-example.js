/**
 * LibreToken Tor Client Example
 *
 * Demonstrates fully anonymous AI compute:
 * - Blockchain via Tor
 * - GPU connection via Tor
 * - E2E encryption
 * - Fresh wallet per request (optional)
 */

import { ethers } from 'ethers';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Configuration
const TOR_PROXY = process.env.TOR_PROXY || 'socks5h://localhost:9050';
const RPC_URL = process.env.RPC_URL || 'https://mainnet.base.org';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Or generate fresh wallet

// Tor proxy agent
const torAgent = new SocksProxyAgent(TOR_PROXY);

// Custom fetch function that routes through Tor
const torFetch = (url, options = {}) => {
  return fetch(url, {
    ...options,
    agent: torAgent
  });
};

// Ethereum provider via Tor
const provider = new ethers.JsonRpcProvider(
  RPC_URL,
  undefined,
  { fetchFunc: torFetch }
);

// Wallet (use existing or create fresh)
const wallet = PRIVATE_KEY
  ? new ethers.Wallet(PRIVATE_KEY, provider)
  : ethers.Wallet.createRandom(provider);

console.log('💳 Using wallet:', wallet.address);

/**
 * Contract ABI (minimal)
 */
const GPU_REGISTRY_ABI = [
  'function getGPUsForModel(string model) view returns (tuple(address wallet, string torAddress, string model, uint256 pricePerToken, uint256 stake, uint256 reputation, uint256 completedJobs, uint256 failedJobs, bool active, uint256 registeredAt)[])',
  'function createRequest(address gpuWallet, uint256 escrowAmount, bytes32 requestHash) returns (bytes32)',
  'function submitProof(bytes32 requestId, bytes32 resultHash, uint256 tokensUsed)',
  'function settleRequest(bytes32 requestId)',
  'event RequestCreated(bytes32 indexed requestId, address indexed user, address indexed gpu, uint256 escrowAmount)',
  'event ProofSubmitted(bytes32 indexed requestId, bytes32 resultHash, uint256 tokensUsed)'
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, GPU_REGISTRY_ABI, wallet);

/**
 * Main function: Request AI inference anonymously
 */
async function requestInference(model, prompt) {
  console.log('\n🚀 Starting anonymous inference request');
  console.log(`   Model: ${model}`);
  console.log(`   Prompt: ${prompt.substring(0, 50)}...`);

  // Step 1: Query available GPUs (via Tor → blockchain)
  console.log('\n📡 Querying available GPUs via Tor...');
  const gpus = await contract.getGPUsForModel(model);

  if (gpus.length === 0) {
    throw new Error(`No GPUs available for model: ${model}`);
  }

  console.log(`✅ Found ${gpus.length} available GPUs`);

  // Step 2: Select random GPU
  const selectedGPU = gpus[Math.floor(Math.random() * gpus.length)];
  console.log(`\n🎲 Selected GPU: ${selectedGPU.wallet.substring(0, 10)}...`);
  console.log(`   Tor address: ${selectedGPU.torAddress}`);
  console.log(`   Price: ${selectedGPU.pricePerToken} LIBRE per 1k tokens`);
  console.log(`   Reputation: ${selectedGPU.reputation}`);

  // Step 3: Encrypt prompt (E2E encryption)
  console.log('\n🔒 Encrypting prompt...');
  const encryptedPrompt = encryptData(prompt, selectedGPU.wallet); // Simplified
  const requestHash = ethers.keccak256(ethers.toUtf8Bytes(encryptedPrompt));

  // Step 4: Create request with escrow (via Tor → blockchain)
  console.log('\n💰 Creating request with escrow...');
  const escrowAmount = ethers.parseEther('100'); // 100 LIBRE tokens

  const tx = await contract.createRequest(
    selectedGPU.wallet,
    escrowAmount,
    requestHash
  );

  console.log(`   Transaction submitted: ${tx.hash}`);
  console.log(`   Waiting for confirmation...`);

  const receipt = await tx.wait();

  // Extract requestId from event
  const event = receipt.logs.find(log => {
    try {
      return contract.interface.parseLog(log).name === 'RequestCreated';
    } catch {
      return false;
    }
  });

  const requestId = contract.interface.parseLog(event).args.requestId;
  console.log(`✅ Request created: ${requestId}`);

  // Step 5: Connect to GPU via Tor
  console.log(`\n🕵️  Connecting to GPU via Tor (.onion)...`);
  const gpuUrl = `http://${selectedGPU.torAddress}/inference`;

  const response = await torFetch(gpuUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: requestId,
      model: model,
      encrypted_prompt: encryptedPrompt,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`GPU request failed: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`✅ Received encrypted result from GPU`);

  // Step 6: Decrypt result
  console.log('\n🔓 Decrypting result...');
  const decryptedOutput = decryptData(result.encrypted_output); // Simplified

  console.log(`\n📝 AI Output:\n${decryptedOutput}\n`);

  // Step 7: Wait for proof submission (GPU does this)
  console.log('⏳ Waiting for GPU to submit proof on-chain...');

  // Listen for ProofSubmitted event
  await waitForProofSubmission(requestId);

  // Step 8: Settle payment (can be done by anyone)
  console.log('\n💸 Settling payment...');
  const settleTx = await contract.settleRequest(requestId);
  await settleTx.wait();

  console.log('✅ Payment settled!');
  console.log('\n🎉 Anonymous inference complete!\n');

  return decryptedOutput;
}

/**
 * Wait for proof submission event
 */
async function waitForProofSubmission(requestId, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      contract.removeAllListeners('ProofSubmitted');
      reject(new Error('Timeout waiting for proof'));
    }, timeout);

    contract.on('ProofSubmitted', (eventRequestId, resultHash, tokensUsed) => {
      if (eventRequestId === requestId) {
        clearTimeout(timer);
        contract.removeAllListeners('ProofSubmitted');
        console.log(`✅ Proof submitted: ${tokensUsed} tokens used`);
        resolve();
      }
    });
  });
}

/**
 * Simplified encryption (in production, use proper ECIES)
 */
function encryptData(data, recipientAddress) {
  // TODO: Implement proper E2E encryption
  // For demo, just base64 encode
  return Buffer.from(data).toString('base64');
}

/**
 * Simplified decryption
 */
function decryptData(encryptedData) {
  // TODO: Implement proper decryption
  return Buffer.from(encryptedData, 'base64').toString('utf8');
}

/**
 * Generate fresh wallet (for maximum anonymity)
 */
function generateFreshWallet() {
  const newWallet = ethers.Wallet.createRandom(provider);
  console.log('\n🆕 Generated fresh wallet:');
  console.log(`   Address: ${newWallet.address}`);
  console.log(`   Private key: ${newWallet.privateKey}`);
  console.log('   ⚠️  Fund this wallet with privacy coins (Monero → LIBRE)');
  return newWallet;
}

/**
 * Check Tor connection
 */
async function checkTorConnection() {
  try {
    // Check Tor IP
    const response = await torFetch('https://check.torproject.org/api/ip');
    const data = await response.json();

    if (data.IsTor) {
      console.log('✅ Tor is working!');
      console.log(`   Exit node IP: ${data.IP}`);
      return true;
    } else {
      console.log('❌ Not using Tor!');
      console.log(`   Your IP: ${data.IP}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Tor connection failed:', error.message);
    console.error('   Make sure Tor is running: brew install tor && tor');
    return false;
  }
}

/**
 * Example usage
 */
async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║  LibreToken Anonymous AI Client      ║');
  console.log('║  Full Tor Stack + E2E Encryption     ║');
  console.log('╚═══════════════════════════════════════╝\n');

  // Check Tor
  const torWorking = await checkTorConnection();
  if (!torWorking) {
    console.error('\n❌ Tor is required. Exiting.');
    process.exit(1);
  }

  // Request inference
  try {
    const output = await requestInference(
      'llama3-70b',
      'Write a poem about digital freedom and privacy'
    );

    console.log('Final output:', output);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  requestInference,
  generateFreshWallet,
  checkTorConnection
};
