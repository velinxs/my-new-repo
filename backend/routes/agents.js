import express from 'express';
import db from '../db/connection.js';
import gpuDetect from '../services/gpu-detect.js';
import agent from '../services/agent.js';

const router = express.Router();

/**
 * POST /agents/register
 * Register as a GPU provider in the marketplace
 */
router.post('/register', async (req, res) => {
  try {
    const {
      wallet_address,
      price_per_1k_tokens,
      price_per_image,
      price_per_video_second,
      location
    } = req.body;

    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address required' });
    }

    // Detect GPU capabilities
    const capabilities = await gpuDetect.getCapabilities();
    const suggestedPricing = await gpuDetect.suggestPricing();

    // Use provided prices or suggested ones
    const pricing = {
      price_per_1k_tokens: price_per_1k_tokens || suggestedPricing.price_per_1k_tokens,
      price_per_image: price_per_image || suggestedPricing.price_per_image,
      price_per_video_second: price_per_video_second || suggestedPricing.price_per_video_second
    };

    // Register or update agent
    await db.run(
      `INSERT INTO agents (
        wallet_address, public_key, status, gpu_model, gpu_memory_gb, gpu_count,
        supported_models, price_per_1k_tokens, price_per_image, price_per_video_second,
        location, agent_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(wallet_address) DO UPDATE SET
        public_key = excluded.public_key,
        status = 'online',
        gpu_model = excluded.gpu_model,
        gpu_memory_gb = excluded.gpu_memory_gb,
        gpu_count = excluded.gpu_count,
        supported_models = excluded.supported_models,
        price_per_1k_tokens = excluded.price_per_1k_tokens,
        price_per_image = excluded.price_per_image,
        price_per_video_second = excluded.price_per_video_second,
        location = excluded.location,
        agent_version = excluded.agent_version,
        last_heartbeat = CURRENT_TIMESTAMP`,
      [
        wallet_address,
        agent.getPublicKey(),
        'online',
        capabilities.primary_gpu.model,
        capabilities.primary_gpu.memory_gb,
        capabilities.gpu_count,
        JSON.stringify(capabilities.supported_models),
        pricing.price_per_1k_tokens,
        pricing.price_per_image,
        pricing.price_per_video_second,
        location || null,
        '1.0.0' // Agent version
      ]
    );

    const registeredAgent = await db.get(
      'SELECT * FROM agents WHERE wallet_address = ?',
      [wallet_address]
    );

    res.json({
      success: true,
      message: 'Agent registered successfully',
      agent: registeredAgent,
      capabilities,
      suggested_pricing: suggestedPricing
    });
  } catch (error) {
    console.error('Error registering agent:', error);
    res.status(500).json({ error: 'Failed to register agent' });
  }
});

/**
 * POST /agents/heartbeat
 * Update agent status (call every minute to stay online)
 */
router.post('/heartbeat', async (req, res) => {
  try {
    const { wallet_address, status = 'online' } = req.body;

    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address required' });
    }

    await db.run(
      `UPDATE agents
       SET last_heartbeat = CURRENT_TIMESTAMP,
           status = ?
       WHERE wallet_address = ?`,
      [status, wallet_address]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

/**
 * GET /agents
 * List all available agents
 */
router.get('/', async (req, res) => {
  try {
    const { status = 'online', model, min_reputation } = req.query;

    let query = 'SELECT * FROM agents WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (model) {
      query += ' AND supported_models LIKE ?';
      params.push(`%${model}%`);
    }

    if (min_reputation) {
      query += ' AND reputation_score >= ?';
      params.push(parseFloat(min_reputation));
    }

    // Mark agents offline if no heartbeat in 5 minutes
    await db.run(
      `UPDATE agents
       SET status = 'offline'
       WHERE status = 'online'
       AND last_heartbeat < datetime('now', '-5 minutes')`
    );

    query += ' ORDER BY reputation_score DESC';

    const agents = await db.all(query, params);

    // Parse JSON fields
    agents.forEach(a => {
      if (a.supported_models) {
        a.supported_models = JSON.parse(a.supported_models);
      }
    });

    res.json({
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

/**
 * GET /agents/:wallet
 * Get specific agent details
 */
router.get('/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    const agent = await db.get(
      'SELECT * FROM agents WHERE wallet_address = ?',
      [wallet]
    );

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (agent.supported_models) {
      agent.supported_models = JSON.parse(agent.supported_models);
    }

    // Get recent reviews
    const reviews = await db.all(
      `SELECT * FROM agent_reviews
       WHERE agent_wallet = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [wallet]
    );

    // Get earnings stats
    const earnings = await db.get(
      `SELECT
         SUM(libre_earned) as total_earned,
         COUNT(*) as total_requests
       FROM agent_earnings
       WHERE agent_wallet = ?`,
      [wallet]
    );

    res.json({
      agent,
      reviews,
      earnings
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

/**
 * POST /agents/unregister
 * Unregister agent (go offline permanently)
 */
router.post('/unregister', async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address required' });
    }

    await db.run(
      'UPDATE agents SET status = ? WHERE wallet_address = ?',
      ['offline', wallet_address]
    );

    res.json({ success: true, message: 'Agent unregistered' });
  } catch (error) {
    console.error('Error unregistering agent:', error);
    res.status(500).json({ error: 'Failed to unregister agent' });
  }
});

/**
 * POST /agents/update-pricing
 * Update agent pricing
 */
router.post('/update-pricing', async (req, res) => {
  try {
    const {
      wallet_address,
      price_per_1k_tokens,
      price_per_image,
      price_per_video_second
    } = req.body;

    if (!wallet_address) {
      return res.status(400).json({ error: 'wallet_address required' });
    }

    await db.run(
      `UPDATE agents
       SET price_per_1k_tokens = ?,
           price_per_image = ?,
           price_per_video_second = ?
       WHERE wallet_address = ?`,
      [price_per_1k_tokens, price_per_image, price_per_video_second, wallet_address]
    );

    res.json({ success: true, message: 'Pricing updated' });
  } catch (error) {
    console.error('Error updating pricing:', error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
});

export default router;
