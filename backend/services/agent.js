import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import encryption from './encryption.js';
import localLLM from './local-llm.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Privacy tiers
export const PRIVACY_TIERS = {
  PUBLIC: 'public',       // Claude API, visible to backend
  PRIVATE: 'private',     // Local LLM, E2E encrypted
  ANONYMOUS: 'anonymous'  // ZK proofs (future)
};

class AgentService {
  constructor() {
    this.agentWallet = process.env.AGENT_WALLET || '0x0000000000000000000000000000000000000000';
    this.keys = this.loadOrGenerateKeys();
    this.preferredModel = process.env.LOCAL_MODEL || 'llama3:70b';
  }

  /**
   * Load existing keys or generate new ones
   */
  loadOrGenerateKeys() {
    const keysPath = join(process.cwd(), 'agent-keys.json');

    if (existsSync(keysPath)) {
      const keysData = readFileSync(keysPath, 'utf8');
      return JSON.parse(keysData);
    }

    // Generate new keys
    const keys = encryption.generateKeyPair();
    writeFileSync(keysPath, JSON.stringify(keys, null, 2));
    console.log('Generated new agent key pair');
    console.log('Public key saved to agent-keys.json');

    return keys;
  }

  /**
   * Get agent's public key for encryption
   */
  getPublicKey() {
    return this.keys.publicKey;
  }

  /**
   * Execute a task using Claude API (public tier)
   * @param {string} taskDescription - The task to complete
   * @returns {Promise<{output: string, inputTokens: number, outputTokens: number}>}
   */
  async executeTaskPublic(taskDescription) {
    try {
      console.log(`[PUBLIC] Executing task: ${taskDescription.substring(0, 100)}...`);

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: taskDescription
          }
        ]
      });

      const output = message.content[0].text;
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;

      console.log(`Task completed. Input tokens: ${inputTokens}, Output tokens: ${outputTokens}`);

      return {
        output,
        inputTokens,
        outputTokens,
        privacyTier: PRIVACY_TIERS.PUBLIC
      };
    } catch (error) {
      console.error('Error executing task with Claude:', error);
      throw new Error(`Failed to execute task: ${error.message}`);
    }
  }

  /**
   * Execute a task using local LLM (private tier)
   * @param {string} taskDescription - The task to complete
   * @param {string} model - Model to use
   * @returns {Promise<{output: string, inputTokens: number, outputTokens: number}>}
   */
  async executeTaskPrivate(taskDescription, model = this.preferredModel) {
    try {
      console.log(`[PRIVATE] Executing task with local model: ${model}`);

      const result = await localLLM.executeTask(taskDescription, model);

      return {
        output: result.output,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        privacyTier: PRIVACY_TIERS.PRIVATE,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Error executing task with local LLM:', error);
      throw new Error(`Failed to execute private task: ${error.message}`);
    }
  }

  /**
   * Execute task with appropriate backend based on privacy tier
   */
  async executeTask(taskDescription, privacyTier = PRIVACY_TIERS.PUBLIC, model = null) {
    switch (privacyTier) {
      case PRIVACY_TIERS.PUBLIC:
        return await this.executeTaskPublic(taskDescription);

      case PRIVACY_TIERS.PRIVATE:
        return await this.executeTaskPrivate(taskDescription, model);

      case PRIVACY_TIERS.ANONYMOUS:
        throw new Error('Anonymous tier not yet implemented');

      default:
        throw new Error(`Unknown privacy tier: ${privacyTier}`);
    }
  }

  /**
   * Decrypt an encrypted task
   */
  decryptTask(encryptedPayload) {
    return encryption.decrypt(encryptedPayload, this.keys.privateKey);
  }

  /**
   * Encrypt output for requester
   */
  encryptOutput(output, requesterPublicKey) {
    return encryption.encrypt(output, requesterPublicKey);
  }

  /**
   * Get the agent's wallet address
   */
  getWallet() {
    return this.agentWallet;
  }

  /**
   * Check if local LLM is available
   */
  async isLocalLLMAvailable() {
    return await localLLM.isAvailable();
  }

  /**
   * Get available compute backends
   */
  async getCapabilities() {
    const hasClaudeAPI = !!process.env.ANTHROPIC_API_KEY;
    const hasLocalLLM = await this.isLocalLLMAvailable();

    return {
      wallet: this.agentWallet,
      publicKey: this.keys.publicKey,
      backends: {
        claude: hasClaudeAPI,
        localLLM: hasLocalLLM
      },
      supportedTiers: [
        hasClaudeAPI ? PRIVACY_TIERS.PUBLIC : null,
        hasLocalLLM ? PRIVACY_TIERS.PRIVATE : null
      ].filter(Boolean),
      models: hasLocalLLM ? await localLLM.listModels() : []
    };
  }

  /**
   * Validate configuration
   */
  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY || localLLM.isAvailable();
  }
}

export default new AgentService();
