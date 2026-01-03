import express from 'express';
import agent from '../services/agent.js';
import encryption from '../services/encryption.js';

const router = express.Router();

/**
 * GET /agent/capabilities
 * Get agent capabilities and supported privacy tiers
 */
router.get('/agent/capabilities', async (req, res) => {
  try {
    const capabilities = await agent.getCapabilities();
    res.json(capabilities);
  } catch (error) {
    console.error('Error fetching capabilities:', error);
    res.status(500).json({ error: 'Failed to fetch capabilities' });
  }
});

/**
 * GET /agent/public-key
 * Get agent's public key for encryption
 */
router.get('/agent/public-key', (req, res) => {
  try {
    const publicKey = agent.getPublicKey();
    res.json({
      publicKey,
      wallet: agent.getWallet()
    });
  } catch (error) {
    console.error('Error fetching public key:', error);
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
});

/**
 * POST /encrypt
 * Encrypt data with agent's public key (for testing)
 */
router.post('/encrypt', (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Missing data field' });
    }

    const encrypted = encryption.encrypt(data, agent.getPublicKey());

    res.json({
      success: true,
      encrypted
    });
  } catch (error) {
    console.error('Error encrypting:', error);
    res.status(500).json({ error: 'Failed to encrypt data' });
  }
});

/**
 * POST /decrypt
 * Decrypt data (testing only - in production, only agent should decrypt)
 */
router.post('/decrypt', (req, res) => {
  try {
    const { encryptedPayload } = req.body;

    if (!encryptedPayload) {
      return res.status(400).json({ error: 'Missing encryptedPayload' });
    }

    const decrypted = agent.decryptTask(encryptedPayload);

    res.json({
      success: true,
      decrypted
    });
  } catch (error) {
    console.error('Error decrypting:', error);
    res.status(500).json({ error: 'Failed to decrypt data' });
  }
});

/**
 * POST /generate-keys
 * Generate a new key pair for a requester (client-side should do this)
 */
router.post('/generate-keys', (req, res) => {
  try {
    const keys = encryption.generateKeyPair();

    res.json({
      success: true,
      keys: {
        publicKey: keys.publicKey,
        privateKey: keys.privateKey
      },
      warning: 'Keep your private key secret! Never share it.'
    });
  } catch (error) {
    console.error('Error generating keys:', error);
    res.status(500).json({ error: 'Failed to generate keys' });
  }
});

export default router;
