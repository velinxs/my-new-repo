import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * GPU Detection Service
 * Detects available GPUs and their capabilities
 */

class GPUDetectionService {
  /**
   * Detect NVIDIA GPUs using nvidia-smi
   */
  async detectNvidiaGPU() {
    try {
      const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits'
      );

      const lines = stdout.trim().split('\n');
      const gpus = lines.map(line => {
        const [name, memory] = line.split(',').map(s => s.trim());
        return {
          model: name,
          memory_gb: Math.floor(parseInt(memory) / 1024),
          vendor: 'NVIDIA'
        };
      });

      return gpus.length > 0 ? gpus : null;
    } catch (error) {
      return null; // nvidia-smi not available
    }
  }

  /**
   * Detect AMD GPUs using rocm-smi
   */
  async detectAMDGPU() {
    try {
      const { stdout } = await execAsync('rocm-smi --showproductname');
      // Parse AMD GPU info (simplified)
      if (stdout.includes('AMD')) {
        return [{
          model: 'AMD GPU (ROCm)',
          memory_gb: 0, // Would need more parsing
          vendor: 'AMD'
        }];
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect Apple Silicon (M1/M2/M3)
   */
  async detectAppleSilicon() {
    try {
      const { stdout } = await execAsync('sysctl -n machdep.cpu.brand_string');
      if (stdout.includes('Apple')) {
        const { stdout: memStdout } = await execAsync('sysctl -n hw.memsize');
        const totalMemGB = Math.floor(parseInt(memStdout) / 1024 / 1024 / 1024);

        return [{
          model: stdout.trim(),
          memory_gb: totalMemGB,
          vendor: 'Apple'
        }];
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all available GPUs
   */
  async detectGPUs() {
    const nvidia = await this.detectNvidiaGPU();
    if (nvidia) return nvidia;

    const amd = await this.detectAMDGPU();
    if (amd) return amd;

    const apple = await this.detectAppleSilicon();
    if (apple) return apple;

    return [{
      model: 'CPU Only',
      memory_gb: 0,
      vendor: 'CPU'
    }];
  }

  /**
   * Determine what models can run on this hardware
   */
  async getSupportedModels() {
    const gpus = await this.detectGPUs();
    const primaryGPU = gpus[0];

    const models = [];

    // Chat models
    if (primaryGPU.memory_gb >= 4 || primaryGPU.vendor === 'CPU') {
      models.push('llama3:8b', 'mistral:7b', 'phi3:3b');
    }
    if (primaryGPU.memory_gb >= 40) {
      models.push('llama3:70b', 'mixtral:8x7b');
    }
    if (primaryGPU.memory_gb >= 200) {
      models.push('llama3:405b');
    }

    // Image models
    if (primaryGPU.memory_gb >= 8) {
      models.push('stable-diffusion-xl', 'stable-diffusion-2.1');
    }
    if (primaryGPU.memory_gb >= 12) {
      models.push('sdxl-turbo', 'kandinsky-2.2');
    }

    // Video models (require significant VRAM)
    if (primaryGPU.memory_gb >= 24) {
      models.push('animatediff', 'stable-video-diffusion');
    }

    return models;
  }

  /**
   * Get full GPU capabilities for agent registration
   */
  async getCapabilities() {
    const gpus = await this.detectGPUs();
    const supportedModels = await this.getSupportedModels();

    return {
      gpus,
      gpu_count: gpus.length,
      primary_gpu: gpus[0],
      total_memory_gb: gpus.reduce((sum, gpu) => sum + gpu.memory_gb, 0),
      supported_models: supportedModels,
      can_run_chat: supportedModels.some(m => m.includes('llama') || m.includes('mistral')),
      can_run_image: supportedModels.some(m => m.includes('stable-diffusion')),
      can_run_video: supportedModels.some(m => m.includes('video') || m.includes('animated'))
    };
  }

  /**
   * Estimate pricing based on GPU capability
   * Better GPUs can charge premium
   */
  async suggestPricing() {
    const caps = await this.getCapabilities();
    const gpu = caps.primary_gpu;

    // Base prices in LIBRE tokens
    let chatPrice = 10; // per 1k tokens
    let imagePrice = 50; // per image
    let videoPrice = 100; // per second

    // Premium GPUs can charge more
    if (gpu.memory_gb >= 80) {
      // A100/H100 tier
      chatPrice = 5; // Can undercut due to speed
      imagePrice = 30;
      videoPrice = 60;
    } else if (gpu.memory_gb >= 40) {
      // RTX 4090/A6000 tier
      chatPrice = 8;
      imagePrice = 40;
      videoPrice = 80;
    } else if (gpu.memory_gb >= 24) {
      // RTX 4090 tier
      chatPrice = 10;
      imagePrice = 50;
      videoPrice = 100;
    } else if (gpu.memory_gb >= 12) {
      // RTX 4070 tier
      chatPrice = 12;
      imagePrice = 60;
      videoPrice = 120;
    } else {
      // Lower end GPUs charge more due to slower inference
      chatPrice = 15;
      imagePrice = 75;
    }

    return {
      price_per_1k_tokens: chatPrice,
      price_per_image: imagePrice,
      price_per_video_second: videoPrice,
      reasoning: `Based on ${gpu.model} with ${gpu.memory_gb}GB VRAM`
    };
  }
}

export default new GPUDetectionService();
