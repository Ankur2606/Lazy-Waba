import { NextResponse } from 'next/server';

const DEFAULT_MODELS = [
 // DeepSeek Models
 { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1' },
 { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
 { id: 'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct', name: 'DeepSeek Coder V2 Lite Instruct' },

// Meta Llama Models
 { id: 'meta-llama/Llama-3.2-1B-Instruct', name: 'Llama 3.2 1B Instruct' },
 { id: 'meta-llama/Llama-3.2-3B-Instruct', name: 'Llama 3.2 3B Instruct' },
 { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B Instruct' },
 { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Meta-Llama 3.1 8B Instruct' },
 { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', name: 'Meta-Llama 3.1 70B Instruct' },
 { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct', name: 'Meta-Llama 3.1 405B Instruct' },

// NVIDIA Models
 { id: 'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF', name: 'Llama 3.1 Nemotron 70B Instruct HF' },

// Mistral AI Models
 { id: 'mistralai/Mistral-Nemo-Instruct-2407', name: 'Mistral Nemo Instruct 2407' },
 { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B Instruct v0.1' },
 { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B Instruct v0.1' },
 { id: 'cognitivecomputations/dolphin-2.9.2-mixtral-8x22b', name: 'Dolphin 2.9.2 Mixtral 8x22b' },

// Microsoft Models
 { id: 'microsoft/Phi-3.5-mini-instruct', name: 'Phi 3.5 Mini Instruct' },
 { id: 'microsoft/Phi-3.5-MoE-instruct', name: 'Phi 3.5 MoE Instruct' },
 { id: 'microsoft/Phi-3-mini-4k-instruct', name: 'Phi 3 Mini 4k Instruct' },
 { id: 'microsoft/Phi-3-medium-128k-instruct', name: 'Phi 3 Medium 128k Instruct' },
 { id: 'microsoft/phi-4', name: 'Phi 4' },

// Allen Institute for AI Models
 { id: 'allenai/OLMo-7B-Instruct-hf', name: 'OLMo 7B Instruct' },

// Qwen Models
 { id: 'Qwen/Qwen2.5-1.5B-Instruct', name: 'Qwen2.5 1.5B Instruct' },
 { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B Instruct' },
 { id: 'Qwen/Qwen2.5-32B-Instruct', name: 'Qwen2.5 32B Instruct' },
 { id: 'Qwen/QwQ-32B-Preview', name: 'QwQ 32B Preview' },
 { id: 'Qwen/Qwen2.5-Coder-7B', name: 'Qwen2.5 Coder 7B' },
 { id: 'Qwen/Qwen2.5-Coder-7B-Instruct', name: 'Qwen2.5 Coder 7B Instruct' },
 { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen2.5 Coder 32B Instruct' },

// Google Models
 { id: 'google/gemma-2-2b-it', name: 'Gemma 2 2B IT' },
 { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B IT' },
 { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B IT' },

// Medical Models
 { id: 'aaditya/Llama3-OpenBioLLM-8B', name: 'Llama3 OpenBioLLM 8B' },
 { id: 'aaditya/Llama3-OpenBioLLM-70B', name: 'Llama3 OpenBioLLM 70B' },
 { id: 'm42-health/Llama3-Med42-8B', name: 'Llama3 Med42 8B' }
];

export async function GET(request: Request) {
  try {
    const response = await fetch('https://api.studio.nebius.com/v1/models/models', {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Return default models if API call fails
      return NextResponse.json({ models: DEFAULT_MODELS }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const data = await response.json();
    
    // Transform the response to match our expected format
    const models = data.models?.map((model: any) => ({
      id: model.id || model.model,
      name: model.name || model.id || model.model,
      version: model.version
    })) || DEFAULT_MODELS;

    return NextResponse.json({ models }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching Nebius models:', error);
    // Return default models in case of error
    return NextResponse.json(
      { models: DEFAULT_MODELS },
      { 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 