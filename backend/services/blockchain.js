import { ethers } from 'ethers';
import db from '../db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

// This will be updated once contract is deployed
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const MINT_RATE = parseInt(process.env.MINT_RATE || '1'); // 1 LLM token = X chain tokens

// Minimal ABI for proof submission
const CONTRACT_ABI = [
  'function submitProof(bytes32 taskId, uint256 computeTokens, bytes32 outputHash, address agent) external',
  'function agentBalances(address) external view returns (uint256)',
  'event WorkProofSubmitted(bytes32 indexed taskId, address indexed agent, uint256 tokensToMint)'
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.isConfigured = false;
  }

  async initialize() {
    try {
      if (!process.env.RPC_URL || !process.env.ORACLE_PRIVATE_KEY) {
        console.log('Blockchain service not configured (missing RPC_URL or ORACLE_PRIVATE_KEY)');
        console.log('Running in offline mode - proofs will be logged but not submitted on-chain');
        return;
      }

      this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
      this.wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, this.provider);

      if (CONTRACT_ADDRESS) {
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);
        this.isConfigured = true;
        console.log('Blockchain service initialized');
        console.log(`Oracle address: ${this.wallet.address}`);
        console.log(`Contract address: ${CONTRACT_ADDRESS}`);
      } else {
        console.log('Contract address not set - deploy contract first');
      }
    } catch (error) {
      console.error('Error initializing blockchain service:', error);
    }
  }

  /**
   * Submit a single proof on-chain
   */
  async submitProof(taskId, computeTokens, outputHash, agentWallet) {
    if (!this.isConfigured) {
      console.log(`[OFFLINE] Would submit proof for task ${taskId}: ${computeTokens} tokens`);
      return null;
    }

    try {
      console.log(`Submitting proof for task ${taskId}...`);

      const taskIdBytes32 = ethers.id(taskId);
      const outputHashBytes32 = '0x' + outputHash;

      const tx = await this.contract.submitProof(
        taskIdBytes32,
        computeTokens,
        outputHashBytes32,
        agentWallet
      );

      console.log(`Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`Proof submitted in block ${receipt.blockNumber}`);

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Error submitting proof:', error);
      throw error;
    }
  }

  /**
   * Submit multiple proofs in batch (gas optimization)
   */
  async submitProofBatch(proofs) {
    if (!this.isConfigured) {
      console.log(`[OFFLINE] Would submit ${proofs.length} proofs in batch`);
      return;
    }

    console.log(`Submitting batch of ${proofs.length} proofs...`);
    const results = [];

    for (const proof of proofs) {
      try {
        const result = await this.submitProof(
          proof.task_id,
          proof.compute_tokens,
          proof.output_hash,
          proof.agent_wallet
        );
        results.push({ ...proof, ...result });
      } catch (error) {
        console.error(`Failed to submit proof for task ${proof.task_id}:`, error);
        results.push({ ...proof, error: error.message });
      }
    }

    return results;
  }

  /**
   * Process all completed but unsubmitted proofs
   */
  async processUnsubmittedProofs() {
    try {
      // Get completed tasks that haven't been submitted as proofs
      const tasks = await db.all(
        `SELECT id, compute_tokens_used, output_hash, agent_wallet
         FROM tasks
         WHERE status = 'completed' AND proof_submitted = 0
         ORDER BY completed_at ASC`
      );

      if (tasks.length === 0) {
        return { submitted: 0 };
      }

      console.log(`\nFound ${tasks.length} unsubmitted proofs`);

      const proofs = tasks.map(task => ({
        task_id: task.id,
        compute_tokens: task.compute_tokens_used,
        output_hash: task.output_hash,
        agent_wallet: task.agent_wallet
      }));

      const results = await this.submitProofBatch(proofs);

      // Record proofs in database
      for (const result of results) {
        if (!result.error) {
          await db.run(
            `INSERT INTO work_proofs (task_id, compute_tokens, output_hash, agent_wallet, transaction_hash, block_number)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              result.task_id,
              result.compute_tokens,
              result.output_hash,
              result.agent_wallet,
              result.transactionHash || null,
              result.blockNumber || null
            ]
          );

          await db.run(
            'UPDATE tasks SET proof_submitted = 1, status = ? WHERE id = ?',
            ['verified', result.task_id]
          );

          // Update agent stats with tokens earned
          const tokensEarned = result.compute_tokens * MINT_RATE;
          await db.run(
            `UPDATE agent_stats
             SET total_tokens_earned = total_tokens_earned + ?
             WHERE agent_wallet = ?`,
            [tokensEarned, result.agent_wallet]
          );
        }
      }

      return {
        submitted: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length
      };
    } catch (error) {
      console.error('Error processing unsubmitted proofs:', error);
      throw error;
    }
  }

  /**
   * Get agent balance from contract
   */
  async getAgentBalance(agentWallet) {
    if (!this.isConfigured) {
      return 0;
    }

    try {
      const balance = await this.contract.agentBalances(agentWallet);
      return balance.toString();
    } catch (error) {
      console.error('Error fetching agent balance:', error);
      return 0;
    }
  }
}

export default new BlockchainService();
