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
      let systemPrompt = "You're a friendly human friend responding on WhatsApp. Be conversational, humorous, and concise. Use occasional puns and emojis sparingly. Keep responses short (1-3 sentences max). Make jokes when appropriate. Focus ONLY on responding to WhatsApp messages in the OCR and ignore anything else like UI elements. Act natural as if you're my replacement chatting with a friend. Avoid sounding robotic or overly formal.";
      
      if (ocrContext) {
        systemPrompt += ` I can see the following WhatsApp chat: "${ocrContext.text}" - Only respond to actual messages from others, ignore UI elements or system notifications. Stay in character as a human friend.`;
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

  // Add new function for conversation analysis
  const analyzeConversation = useCallback(async (
    previousOcrText: string,
    currentOcrText: string,
    myUsername: string
  ) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const systemPrompt = `You are analyzing WhatsApp conversation for a chat automation system. Compare the previous OCR text with the current OCR text and determine:
1. If there's a new message from someone other than "${myUsername}" (who is the user you're impersonating)
2. If so, extract that new message and the sender's name
3. ONLY respond with new messages sent by others, never with messages sent by "${myUsername}"

Return your analysis as JSON in this format:
{
  "newMessageDetected": boolean,
  "shouldReply": boolean,
  "message": "the new message text if any",
  "sender": "the sender's name",
  "reasoning": "brief explanation of your decision"
}

If there are multiple new messages, focus on the most recent one. Include any context about the conversation that would help generate an appropriate response.`;
      
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Previous OCR text:\n\n${previousOcrText}\n\n---\n\nCurrent OCR text:\n\n${currentOcrText}` }
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
          temperature: 0.1, // Lower temperature for more factual/analytical response
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to analyze conversation');
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      
      // Try to parse the response as JSON
      try {
        // Extract JSON object if embedded in markdown or text
        const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         analysisText.match(/{[\s\S]*}/);
                         
        const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '') : analysisText;
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse conversation analysis as JSON:", e);
        // Return a default structured response using the text
        return {
          newMessageDetected: analysisText.toLowerCase().includes("new message detected") || 
                             analysisText.toLowerCase().includes("should reply"),
          shouldReply: analysisText.toLowerCase().includes("should reply") || 
                       analysisText.toLowerCase().includes("new message detected"),
          message: analysisText,
          sender: "unknown",
          reasoning: "Failed to parse structured response"
        };
      }
    } catch (error) {
      console.error('Conversation analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [currentModel, defaultOptions.apiKey]);

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
    suggestReplies,
    analyzeConversation // Add the new function to the return value
  };
}