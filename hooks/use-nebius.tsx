import { useState, useCallback, useEffect } from 'react';
import type { ClipboardItem } from './use-clipboard-history';

interface NebiusOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey: string;
}

interface NebiusModel {
  id: string;
  name: string;
  version?: string;
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

export function useNebius(defaultOptions: NebiusOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<NebiusModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>(
    defaultOptions.model || 'meta-llama/Meta-Llama-3.1-70B-Instruct'
  );

  useEffect(() => {
    if (defaultOptions.model) {
      setCurrentModel(defaultOptions.model);
    }
  }, [defaultOptions.model]);

  const fetchAvailableModels = useCallback(async () => {
    if (!defaultOptions.apiKey) {
      setAvailableModels([]);
      return [];
    }

    setIsLoadingModels(true);
    setError(null);

    try {
      const response = await fetch('/api/nebius/models', {
        headers: {
          'Authorization': `Bearer ${defaultOptions.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorStatus = response.status;
        try {
          // Try to extract error details from response
          const errorData = await response.json();
          throw new Error(`Failed to fetch models: ${errorData.message || errorData.error || ''} (Status: ${errorStatus})`);
        } catch (parseError) {
          // If we can't parse the error response, use a generic message with status code
          throw new Error(`Failed to fetch models (Status: ${errorStatus})`);
        }
      }

      const data = await response.json();
      const models = data.models || [];
      console.log('Fetched Nebius models:', models);
      setAvailableModels(models);
      return models;
    } catch (error) {
      console.error('Failed to fetch Nebius models:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch models');
      return [];
    } finally {
      setIsLoadingModels(false);
    }
  }, [defaultOptions.apiKey]);

  const callNebius = useCallback(async (prompt: string, options: Partial<NebiusOptions> = {}) => {
    try {
      console.log('Calling Nebius with:', {
        model: currentModel,
        prompt: prompt.slice(0, 100) + '...',
        temperature: options.temperature || defaultOptions.temperature,
        maxTokens: options.maxTokens || defaultOptions.maxTokens
      });

      const response = await fetch('/api/nebius/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${defaultOptions.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: options.temperature || defaultOptions.temperature || 0.3,
          max_tokens: options.maxTokens || defaultOptions.maxTokens || 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Nebius API error:', error);
        throw new Error(error.message || 'Failed to call Nebius');
      }

      const data = await response.json();
      console.log('Nebius response:', data);
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Nebius API call failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }, [currentModel, defaultOptions.apiKey, defaultOptions.temperature, defaultOptions.maxTokens]);

  const generateChatResponse = useCallback(async (
    userMessage: string, 
    chatHistory: ChatMessage[] = [], 
    ocrContext?: OCRContext
  ) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      let systemPrompt = "You are a friendly, helpful assistant engaged in a chat conversation. Keep your responses conversational, concise, and directly relevant to the question.";
      
      if (ocrContext) {
        systemPrompt += ` You can see the following content in the chat window: "${ocrContext.text}" - use this information to provide context-aware responses.`;
      }
      
      const messages = [
        { role: "system", content: systemPrompt },
        ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: "user", content: userMessage }
      ];

      const response = await fetch('/api/nebius/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${defaultOptions.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: currentModel,
          messages: messages,
          temperature: defaultOptions.temperature || 0.3,
          max_tokens: defaultOptions.maxTokens || 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate chat response');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Nebius chat response failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [currentModel, defaultOptions.apiKey, defaultOptions.temperature, defaultOptions.maxTokens]);

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
      
      const analysis = await callNebius(prompt);
      return analysis.trim();
    } finally {
      setIsProcessing(false);
    }
  }, [callNebius]);

  const suggestReplies = useCallback(async (
    chatHistory: ChatMessage[], 
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
      
      const suggestions = await callNebius(prompt);
      
      try {
        return JSON.parse(suggestions);
      } catch (e) {
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
  }, [callNebius]);

  return {
    isProcessing,
    error,
    callNebius,
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