import db from '../db/connection.js';
import agent from './agent.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL || '5000');

class Worker {
  constructor() {
    this.isRunning = false;
    this.currentTask = null;
  }

  async start() {
    if (!agent.isConfigured()) {
      console.error('ERROR: ANTHROPIC_API_KEY not configured in .env file');
      console.error('Please set ANTHROPIC_API_KEY to start the worker');
      process.exit(1);
    }

    console.log('Starting worker...');
    console.log(`Agent wallet: ${agent.getWallet()}`);
    console.log(`Poll interval: ${POLL_INTERVAL}ms\n`);

    this.isRunning = true;
    await this.poll();
  }

  async poll() {
    while (this.isRunning) {
      try {
        await this.processNextTask();
      } catch (error) {
        console.error('Error in worker loop:', error);
      }

      await this.sleep(POLL_INTERVAL);
    }
  }

  async processNextTask() {
    // Get next pending task
    const task = await db.get(
      `SELECT * FROM tasks
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 1`
    );

    if (!task) {
      return; // No pending tasks
    }

    console.log(`\n[${new Date().toISOString()}] Processing task: ${task.id}`);
    console.log(`Description: ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`);

    this.currentTask = task;

    try {
      // Mark as in progress
      await db.run(
        'UPDATE tasks SET status = ? WHERE id = ?',
        ['in_progress', task.id]
      );

      // Execute task with agent
      const result = await agent.executeTask(task.description);

      // Calculate hash
      const outputHash = crypto
        .createHash('sha256')
        .update(result.output)
        .digest('hex');

      const computeTokens = result.inputTokens + result.outputTokens;

      // Mark as completed
      await db.run(
        `UPDATE tasks
         SET status = 'completed',
             agent_wallet = ?,
             output_text = ?,
             output_hash = ?,
             compute_tokens_used = ?,
             input_tokens = ?,
             output_tokens = ?,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          agent.getWallet(),
          result.output,
          outputHash,
          computeTokens,
          result.inputTokens,
          result.outputTokens,
          task.id
        ]
      );

      // Update agent stats
      await db.run(
        `INSERT INTO agent_stats (agent_wallet, total_tasks_completed, total_compute_tokens, last_active)
         VALUES (?, 1, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(agent_wallet) DO UPDATE SET
           total_tasks_completed = total_tasks_completed + 1,
           total_compute_tokens = total_compute_tokens + ?,
           last_active = CURRENT_TIMESTAMP`,
        [agent.getWallet(), computeTokens, computeTokens]
      );

      console.log(`✓ Task completed successfully`);
      console.log(`  Compute tokens: ${computeTokens} (input: ${result.inputTokens}, output: ${result.outputTokens})`);
      console.log(`  Output hash: ${outputHash}`);
      console.log(`  Output preview: ${result.output.substring(0, 150)}...`);

    } catch (error) {
      console.error(`✗ Task failed:`, error.message);

      // Mark as failed
      await db.run(
        'UPDATE tasks SET status = ? WHERE id = ?',
        ['failed', task.id]
      );
    } finally {
      this.currentTask = null;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    console.log('\nStopping worker...');
    this.isRunning = false;
  }
}

const worker = new Worker();

// Handle graceful shutdown
process.on('SIGINT', () => {
  worker.stop();
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  worker.stop();
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Start worker
worker.start();
