import blockchain from './blockchain.js';
import dotenv from 'dotenv';

dotenv.config();

const SUBMIT_INTERVAL = parseInt(process.env.PROOF_SUBMIT_INTERVAL || '60000'); // 1 minute default

class ProofSubmitter {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    console.log('Starting proof submitter...');
    console.log(`Submit interval: ${SUBMIT_INTERVAL}ms\n`);

    // Initialize blockchain service
    await blockchain.initialize();

    this.isRunning = true;
    await this.run();
  }

  async run() {
    while (this.isRunning) {
      try {
        await this.submitBatch();
      } catch (error) {
        console.error('Error in proof submitter loop:', error);
      }

      await this.sleep(SUBMIT_INTERVAL);
    }
  }

  async submitBatch() {
    console.log(`[${new Date().toISOString()}] Checking for unsubmitted proofs...`);

    try {
      const result = await blockchain.processUnsubmittedProofs();

      if (result.submitted > 0) {
        console.log(`✓ Successfully submitted ${result.submitted} proof(s)`);
      }

      if (result.failed > 0) {
        console.log(`✗ Failed to submit ${result.failed} proof(s)`);
      }

      if (result.submitted === 0 && result.failed === 0) {
        console.log('No proofs to submit');
      }
    } catch (error) {
      console.error('Error submitting proofs:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    console.log('\nStopping proof submitter...');
    this.isRunning = false;
  }
}

const submitter = new ProofSubmitter();

// Handle graceful shutdown
process.on('SIGINT', () => {
  submitter.stop();
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  submitter.stop();
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Start submitter
submitter.start();
