import db from '../db/connection.js';

/**
 * Matchmaking Service
 * Routes inference requests to the best available agent
 */

class MatchmakingService {
  /**
   * Find best agent for a request
   * @param {Object} criteria - { model, request_type, privacy_tier, max_price }
   * @returns {Object} Selected agent or null
   */
  async findAgent(criteria) {
    const {
      model,
      request_type,
      privacy_tier = 'public',
      max_price = null,
      prefer_reputation = true
    } = criteria;

    try {
      // Mark stale agents as offline
      await db.run(
        `UPDATE agents
         SET status = 'offline'
         WHERE status = 'online'
         AND last_heartbeat < datetime('now', '-5 minutes')`
      );

      // Build query
      let query = `
        SELECT * FROM agents
        WHERE status = 'online'
        AND supported_models LIKE ?
      `;
      const params = [`%${model}%`];

      // Add pricing filter if specified
      if (max_price !== null) {
        if (request_type === 'chat' || request_type === 'completion') {
          query += ' AND price_per_1k_tokens <= ?';
          params.push(max_price);
        } else if (request_type === 'image') {
          query += ' AND price_per_image <= ?';
          params.push(max_price);
        } else if (request_type === 'video') {
          query += ' AND price_per_video_second <= ?';
          params.push(max_price);
        }
      }

      // Sort by reputation (best first) or price (cheapest first)
      if (prefer_reputation) {
        query += ' ORDER BY reputation_score DESC, price_per_1k_tokens ASC';
      } else {
        query += ' ORDER BY price_per_1k_tokens ASC, reputation_score DESC';
      }

      query += ' LIMIT 10'; // Get top 10 candidates

      const candidates = await db.all(query, params);

      if (candidates.length === 0) {
        return null; // No agents available
      }

      // Parse supported models
      candidates.forEach(agent => {
        if (agent.supported_models) {
          agent.supported_models = JSON.parse(agent.supported_models);
        }
      });

      // Select based on load balancing
      // For now, simple round-robin among top candidates
      const selectedAgent = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];

      return selectedAgent;
    } catch (error) {
      console.error('Error in matchmaking:', error);
      return null;
    }
  }

  /**
   * Calculate cost for a request
   * @param {Object} agent - Agent object
   * @param {Object} request - Request details
   * @returns {number} Cost in LIBRE tokens
   */
  calculateCost(agent, request) {
    const { request_type, estimated_tokens = 1000, image_count = 1, video_duration = 5 } = request;

    switch (request_type) {
      case 'chat':
      case 'completion':
        return Math.ceil((estimated_tokens / 1000) * agent.price_per_1k_tokens);

      case 'image':
        return agent.price_per_image * image_count;

      case 'video':
        return agent.price_per_video_second * video_duration;

      case 'audio':
        // Audio charged similar to chat
        return Math.ceil((estimated_tokens / 1000) * agent.price_per_1k_tokens);

      default:
        return agent.price_per_1k_tokens; // Default fallback
    }
  }

  /**
   * Assign request to agent
   * @param {string} requestId - Request ID
   * @param {string} agentWallet - Agent wallet address
   */
  async assignRequest(requestId, agentWallet) {
    try {
      await db.run(
        `UPDATE inference_requests
         SET agent_wallet = ?,
             status = 'assigned',
             assigned_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [agentWallet, requestId]
      );

      await db.run(
        `UPDATE agents
         SET status = 'busy'
         WHERE wallet_address = ?`,
        [agentWallet]
      );

      return true;
    } catch (error) {
      console.error('Error assigning request:', error);
      return false;
    }
  }

  /**
   * Update agent reputation after request completion
   * @param {string} agentWallet - Agent wallet
   * @param {boolean} success - Whether request succeeded
   * @param {number} responseTime - Response time in ms
   */
  async updateReputation(agentWallet, success, responseTime) {
    try {
      const agent = await db.get(
        'SELECT * FROM agents WHERE wallet_address = ?',
        [agentWallet]
      );

      if (!agent) return;

      // Simple reputation algorithm:
      // - Success: +10 points
      // - Failure: -50 points
      // - Fast response (<5s): +5 bonus
      // - Slow response (>30s): -10 penalty

      let reputationChange = 0;

      if (success) {
        reputationChange += 10;

        if (responseTime < 5000) {
          reputationChange += 5; // Fast response bonus
        } else if (responseTime > 30000) {
          reputationChange -= 10; // Slow response penalty
        }
      } else {
        reputationChange -= 50; // Failure penalty
      }

      const newReputation = Math.max(0, agent.reputation_score + reputationChange);

      // Update reputation and stats
      await db.run(
        `UPDATE agents
         SET reputation_score = ?,
             total_requests_completed = total_requests_completed + ?,
             total_requests_failed = total_requests_failed + ?,
             average_response_time_ms = (average_response_time_ms * total_requests_completed + ?) / (total_requests_completed + 1),
             status = 'online'
         WHERE wallet_address = ?`,
        [
          newReputation,
          success ? 1 : 0,
          success ? 0 : 1,
          responseTime,
          agentWallet
        ]
      );

      console.log(`Updated reputation for ${agentWallet}: ${agent.reputation_score} → ${newReputation}`);
    } catch (error) {
      console.error('Error updating reputation:', error);
    }
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats() {
    try {
      const stats = await db.get(`
        SELECT
          COUNT(*) as total_agents,
          SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online_agents,
          AVG(reputation_score) as avg_reputation,
          AVG(price_per_1k_tokens) as avg_chat_price,
          AVG(price_per_image) as avg_image_price
        FROM agents
      `);

      const requests = await db.get(`
        SELECT
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_requests,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
          AVG(inference_time_ms) as avg_inference_time
        FROM inference_requests
      `);

      return {
        agents: stats,
        requests
      };
    } catch (error) {
      console.error('Error fetching marketplace stats:', error);
      return null;
    }
  }
}

export default new MatchmakingService();
