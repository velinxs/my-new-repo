#!/usr/bin/env node

import si from 'systeminformation';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

// Configuration
const ROUTER_URL = process.env.ROUTER_URL || 'http://localhost:3000';
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000');
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || '60000');

// State
let nodeInfo = null;
let isRunning = true;
let currentJob = null;

/**
 * Detect GPU capabilities
 */
async function detectGPU() {
  try {
    const graphics = await si.graphics();

    if (graphics.controllers && graphics.controllers.length > 0) {
      const gpu = graphics.controllers[0];
      return {
        model: gpu.model || 'Unknown GPU',
        vram_gb: gpu.vram ? Math.floor(gpu.vram / 1024) : 0,
        vendor: gpu.vendor || 'Unknown'
      };
    }

    // Try nvidia-smi as fallback
    try {
      const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits'
      );
      const [model, memory] = stdout.trim().split(',').map(s => s.trim());
      return {
        model,
        vram_gb: Math.floor(parseInt(memory) / 1024),
        vendor: 'NVIDIA'
      };
    } catch {
      // Fallback to CPU
      return {
        model: 'CPU Only',
        vram_gb: 0,
        vendor: 'CPU'
      };
    }
  } catch (error) {
    console.error('Error detecting GPU:', error.message);
    return {
      model: 'Unknown',
      vram_gb: 0,
      vendor: 'Unknown'
    };
  }
}

/**
 * Check if Ollama is available
 */
async function checkOllama() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get loaded models from Ollama
 */
async function getLoadedModels() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) return [];

    const data = await response.json();
    return (data.models || []).map(m => m.name);
  } catch {
    return [];
  }
}

/**
 * Register with marketplace
 */
async function register() {
  try {
    console.log('🔍 Detecting GPU...');
    const gpu = await detectGPU();
    console.log(`✅ Found: ${gpu.model} (${gpu.vram_gb}GB VRAM)`);

    console.log('🔍 Checking Ollama...');
    const ollamaAvailable = await checkOllama();
    if (!ollamaAvailable) {
      console.error('❌ Ollama not running! Please start Ollama first.');
      console.error('   Install: https://ollama.ai');
      console.error('   Run: ollama serve');
      process.exit(1);
    }
    console.log('✅ Ollama is running');

    const models = await getLoadedModels();
    console.log(`📦 Loaded models: ${models.length > 0 ? models.join(', ') : 'none yet'}`);

    console.log('📡 Registering with marketplace...');
    const response = await fetch(`${ROUTER_URL}/api/gpu-nodes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: WALLET_ADDRESS,
        gpu_model: gpu.model,
        gpu_memory_gb: gpu.vram_gb,
        supported_models: models,
        ollama_url: OLLAMA_URL
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Registration failed: ${error}`);
    }

    const data = await response.json();
    nodeInfo = data.node;

    console.log('✅ Registered successfully!');
    console.log(`   Node ID: ${nodeInfo.id}`);
    console.log(`   Wallet: ${WALLET_ADDRESS}`);
    console.log(`   Status: ${nodeInfo.status}`);

    return true;
  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    return false;
  }
}

/**
 * Send heartbeat to marketplace
 */
async function sendHeartbeat() {
  try {
    const models = await getLoadedModels();

    await fetch(`${ROUTER_URL}/api/gpu-nodes/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: WALLET_ADDRESS,
        status: currentJob ? 'busy' : 'idle',
        supported_models: models
      })
    });
  } catch (error) {
    console.error('⚠️  Heartbeat failed:', error.message);
  }
}

/**
 * Poll for new jobs
 */
async function pollForJob() {
  try {
    const response = await fetch(`${ROUTER_URL}/api/gpu-nodes/poll?wallet=${WALLET_ADDRESS}`);

    if (!response.ok) return null;

    const data = await response.json();
    return data.job || null;
  } catch (error) {
    return null;
  }
}

/**
 * Execute inference job
 */
async function executeJob(job) {
  const startTime = Date.now();

  try {
    console.log(`\n🔄 Executing job: ${job.id}`);
    console.log(`   Type: ${job.request_type}`);
    console.log(`   Model: ${job.model}`);

    // Check if model is loaded
    const models = await getLoadedModels();
    if (!models.includes(job.model)) {
      console.log(`📥 Downloading model: ${job.model}...`);
      // Ollama will auto-download on first use
    }

    // Execute inference via Ollama
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: job.model,
        prompt: job.input,
        stream: false,
        options: {
          num_predict: job.max_tokens || 500
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const result = await response.json();
    const endTime = Date.now();
    const inferenceTime = endTime - startTime;

    // Estimate tokens (Ollama doesn't always provide exact counts)
    const inputTokens = result.prompt_eval_count || Math.ceil(job.input.length / 4);
    const outputTokens = result.eval_count || Math.ceil(result.response.length / 4);

    console.log(`✅ Job completed in ${inferenceTime}ms`);
    console.log(`   Tokens: ${inputTokens + outputTokens}`);

    // Submit result
    await submitResult(job.id, {
      output: result.response,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      inference_time_ms: inferenceTime,
      metadata: {
        model: result.model,
        total_duration: result.total_duration,
        load_duration: result.load_duration
      }
    });

    return true;
  } catch (error) {
    console.error(`❌ Job failed:`, error.message);

    // Report failure
    await submitResult(job.id, {
      error: error.message,
      failed: true
    });

    return false;
  }
}

/**
 * Submit job result
 */
async function submitResult(jobId, result) {
  try {
    const response = await fetch(`${ROUTER_URL}/api/gpu-nodes/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        wallet_address: WALLET_ADDRESS,
        ...result
      })
    });

    if (!response.ok) {
      throw new Error(`Submit failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.libre_earned) {
      console.log(`💰 Earned: ${data.libre_earned} LIBRE tokens`);
    }
  } catch (error) {
    console.error('Failed to submit result:', error.message);
  }
}

/**
 * Main worker loop
 */
async function workerLoop() {
  while (isRunning) {
    try {
      // Poll for job
      const job = await pollForJob();

      if (job) {
        currentJob = job;
        await executeJob(job);
        currentJob = null;
      }

      // Wait before next poll
      await sleep(POLL_INTERVAL);
    } catch (error) {
      console.error('Error in worker loop:', error.message);
      await sleep(POLL_INTERVAL * 2); // Back off on error
    }
  }
}

/**
 * Heartbeat loop
 */
async function heartbeatLoop() {
  while (isRunning) {
    await sendHeartbeat();
    await sleep(HEARTBEAT_INTERVAL);
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('\n⏸️  Shutting down...');
  isRunning = false;

  try {
    await fetch(`${ROUTER_URL}/api/gpu-nodes/unregister`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: WALLET_ADDRESS })
    });
    console.log('✅ Unregistered from marketplace');
  } catch (error) {
    console.error('Failed to unregister:', error.message);
  }

  process.exit(0);
}

/**
 * Start the GPU node
 */
async function start() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   LibreToken GPU Node                 ║');
  console.log('║   Earn LIBRE by providing compute     ║');
  console.log('╚═══════════════════════════════════════╝\n');

  // Validate configuration
  if (!WALLET_ADDRESS) {
    console.error('❌ Error: WALLET_ADDRESS not set!');
    console.error('   Set it in .env or pass as environment variable:');
    console.error('   WALLET_ADDRESS=0xYourWallet libre-gpu-node');
    process.exit(1);
  }

  console.log(`📍 Router: ${ROUTER_URL}`);
  console.log(`💳 Wallet: ${WALLET_ADDRESS}`);
  console.log(`🖥️  Ollama: ${OLLAMA_URL}\n`);

  // Register with marketplace
  const registered = await register();
  if (!registered) {
    console.error('\n❌ Failed to register. Exiting.');
    process.exit(1);
  }

  console.log('\n🚀 GPU node is running!');
  console.log('   Waiting for compute jobs...\n');

  // Start worker and heartbeat loops
  workerLoop().catch(console.error);
  heartbeatLoop().catch(console.error);

  // Handle graceful shutdown
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { start, detectGPU, checkOllama };
