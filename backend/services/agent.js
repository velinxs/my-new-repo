import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

class AgentService {
  constructor() {
    this.agentWallet = process.env.AGENT_WALLET || '0x0000000000000000000000000000000000000000';
  }

  /**
   * Execute a task using Claude API
   * @param {string} taskDescription - The task to complete
   * @returns {Promise<{output: string, inputTokens: number, outputTokens: number}>}
   */
  async executeTask(taskDescription) {
    try {
      console.log(`Executing task: ${taskDescription.substring(0, 100)}...`);

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
        outputTokens
      };
    } catch (error) {
      console.error('Error executing task with Claude:', error);
      throw new Error(`Failed to execute task: ${error.message}`);
    }
  }

  /**
   * Get the agent's wallet address
   */
  getWallet() {
    return this.agentWallet;
  }

  /**
   * Validate API key is configured
   */
  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY;
  }
}

export default new AgentService();
