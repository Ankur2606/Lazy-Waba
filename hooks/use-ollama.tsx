import { useState, useCallback, useEffect } from 'react';


interface OllamaOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

// Chat functionality interfaces
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

interface OCRContext {
  text: string;
  confidence?: number;
  source?: string;
}

export function useOllama(defaultOptions: OllamaOptions = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [currentModel, setCurrentModel] = useState(defaultOptions.model || 'qwen2.5');

  // Update currentModel when defaultOptions.model changes
  useEffect(() => {
    if (defaultOptions.model) {
      setCurrentModel(defaultOptions.model);
    }
  }, [defaultOptions.model]);

  const fetchAvailableModels = useCallback(async () => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      const data = await response.json();
      setAvailableModels(data.models || []);
      return data.models;
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch models');
      return [];
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  const callOllama = useCallback(async (prompt: string, options: OllamaOptions = {}) => {
    const baseUrl = 'http://localhost:11434/api';
    
    try {
      console.log('Calling Ollama with:', {
        model: currentModel,
        prompt: prompt.slice(0, 100) + '...',
        temperature: options.temperature || defaultOptions.temperature,
        maxTokens: options.maxTokens || defaultOptions.maxTokens
      });
      
      const response = await fetch(`${baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: currentModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: options.temperature || defaultOptions.temperature || 0.3,
            num_predict: options.maxTokens || defaultOptions.maxTokens || 1000,
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Ollama API error:', error);
        throw new Error(error.message || 'Failed to call Ollama');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama API call failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }, [currentModel, defaultOptions.temperature, defaultOptions.maxTokens]);

  const generateChatResponse = useCallback(async (
    userMessage: string, 
    chatHistory: ChatMessage[] = [], 
    ocrContext?: OCRContext
  ) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Format the chat history and OCR context into a prompt
      let prompt = "You are a friendly assistant responding in a chat conversation. Be helpful, concise, and conversational.\n\n";
      
      // Add OCR context if available
      if (ocrContext) {
        prompt += `I can see this content in the chat window: ${ocrContext.text}\n\n`;
      }
      
      // Add chat history
      prompt += "Chat history:\n";
      chatHistory.forEach(msg => {
        const role = msg.role === 'assistant' ? 'Assistant' : 'Person';
        prompt += `${role}: ${msg.content}\n`;
      });
      
      // Add the current user message
      prompt += `Person: ${userMessage}\n`;
      prompt += "Assistant:";
      
      const response = await callOllama(prompt);
      return response.trim();
    } finally {
      setIsProcessing(false);
    }
  }, [callOllama]);

  const analyzeOCRText = useCallback(async (ocrText: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const prompt = `I'm looking at a chat window that contains the following text detected by OCR:

${ocrText}

Analyze this content and extract:
1. Who are the participants in this conversation
2. What is the main topic being discussed
3. Any questions that need answers
4. Any specific information I should use in my reply`;
      
      const analysis = await callOllama(prompt);
      return analysis.trim();
    } finally {
      setIsProcessing(false);
    }
  }, [callOllama]);

  const suggestReplies = useCallback(async (
    chatHistory: ChatMessage[] = [], 
    ocrContext?: OCRContext
  ) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      let prompt = "Based on this chat conversation, suggest 3-5 natural, conversational replies I could send next. Make them sound human and contextually appropriate. Format as a JSON array of strings.";
      
      if (ocrContext) {
        prompt += `\n\nChat window content: ${ocrContext.text}\n\n`;
      }
      
      prompt += "\nConversation so far:\n";
      chatHistory.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'Me' : 'Other'}: ${msg.content}\n`;
      });
      
      prompt += "\nSuggested replies I could send:";
      
      const suggestions = await callOllama(prompt);
      
      try {
        return JSON.parse(suggestions);
      } catch (e) {
        // If parsing fails, try to extract array-like content
        const match = suggestions.match(/\[(.*)\]/s);
        if (match) {
          try {
            return JSON.parse(`[${match[1]}]`);
          } catch {
            return suggestions.split('\n').filter(line => line.trim().startsWith('"') || line.trim().startsWith("'"));
          }
        }
        return [suggestions];
      }
    } finally {
      setIsProcessing(false);
    }
  }, [callOllama]);

  return {
    isProcessing,
    error,
    callOllama,
    availableModels,
    isLoadingModels,
    fetchAvailableModels,
    currentModel,
    // Chat-specific functions
    generateChatResponse,
    analyzeOCRText,
    suggestReplies
  };
}