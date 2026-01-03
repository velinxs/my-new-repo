import dotenv from 'dotenv';

dotenv.config();

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.LOCAL_MODEL || 'llama3:70b';

/**
 * Local LLM Service using Ollama
 *
 * Supports uncensored, self-hosted models:
 * - llama3:70b
 * - dolphin-mixtral (uncensored)
 * - wizardlm-uncensored
 * - mythomax (creative, no restrictions)
 *
 * Install Ollama: https://ollama.ai
 * Run: ollama run llama3:70b
 */

class LocalLLMService {
  constructor() {
    this.baseURL = OLLAMA_BASE_URL;
    this.defaultModel = DEFAULT_MODEL;
  }

  /**
   * Execute a task using local Ollama model
   * @param {string} prompt - The task to complete
   * @param {string} model - Model to use (optional)
   * @returns {Promise<{output: string, inputTokens: number, outputTokens: number, metadata: Object}>}
   */
  async executeTask(prompt, model = this.defaultModel) {
    try {
      console.log(`Executing task with local model: ${model}`);
      const startTime = Date.now();

      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 4096
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      const endTime = Date.now();

      // Ollama doesn't provide exact token counts, estimate them
      const inputTokens = this.estimateTokens(prompt);
      const outputTokens = this.estimateTokens(data.response);
      const inferenceTime = endTime - startTime;

      console.log(`Task completed in ${inferenceTime}ms`);
      console.log(`Estimated tokens: ${inputTokens} input, ${outputTokens} output`);

      return {
        output: data.response,
        inputTokens,
        outputTokens,
        metadata: {
          model: data.model,
          inference_time_ms: inferenceTime,
          created_at: data.created_at,
          total_duration: data.total_duration,
          load_duration: data.load_duration,
          prompt_eval_count: data.prompt_eval_count,
          eval_count: data.eval_count
        }
      };
    } catch (error) {
      console.error('Error executing task with local LLM:', error);
      throw new Error(`Failed to execute task with local model: ${error.message}`);
    }
  }

  /**
   * Estimate token count (rough approximation)
   * More accurate than nothing, real token count from model is better
   */
  estimateTokens(text) {
    // Rough estimate: ~1.3 tokens per word for English
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
  }

  /**
   * Check if Ollama is running and accessible
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);
      if (!response.ok) return [];

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error listing models:', error);
      return [];
    }
  }

  /**
   * Get model info
   */
  async getModelInfo(model) {
    try {
      const response = await fetch(`${this.baseURL}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model })
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error getting model info:', error);
      return null;
    }
  }

  /**
   * Get compute metrics for proof of work
   * These can be signed and submitted as proof
   */
  getComputeMetrics(metadata) {
    return {
      model: metadata.model,
      inference_time_ms: metadata.inference_time_ms,
      total_duration_ns: metadata.total_duration,
      load_duration_ns: metadata.load_duration,
      prompt_eval_count: metadata.prompt_eval_count,
      eval_count: metadata.eval_count,
      tokens_per_second: metadata.eval_count / (metadata.inference_time_ms / 1000),
      timestamp: Date.now()
    };
  }
}

export default new LocalLLMService();
