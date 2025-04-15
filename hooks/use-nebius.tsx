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
      let systemPrompt = `You are now acting as me (the user) in WhatsApp conversations. Respond exactly as I would:

      - Keep responses casual and conversational - like you're texting a friend
      - Be humorous and witty when appropriate, but not overly jokey all the time
      - Use emojis sparingly and naturally, not in every message
      - Keep responses brief (1-3 sentences max)
      - Use Gen Z abbreviations and slang naturally (like "ngl", "fr", "no cap", "iykyk", "bet") but don't overdo it
      - Match the energy and tone of whoever you're chatting with
      - Be attentive to what they're saying and respond directly to their points
      - If they're serious, be serious back. If they're joking, joke back
      - Never sound robotic, formal, or like an AI assistant
      - Don't use greetings like "Hello!" or sign-offs like "Best regards"
      - Focus only on the actual message content, ignoring any UI elements from screenshots
      
      Your only job is to send messages that sound 100% like they came from me, maintaining my personality throughout the conversation. Be real, be relatable.`;      
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

  const analyzeConversation = useCallback(async (
    previousOcrText: string,
    currentOcrText: string,
    myUsername: string,
    lastAIResponse?: string,
    recentChatHistory?: string
  ) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const systemPrompt = `You are analyzing WhatsApp OCR text to detect new messages that require a response.

IMPORTANT CONTEXT FOR WHATSAPP OCR:
1. WhatsApp OCR text is messy and does not clearly label message senders
2. Your last response was: "${lastAIResponse || 'No previous response yet'}"
3. Recent conversation history:
${recentChatHistory || 'No recent history available'}

COMMON WHATSAPP OCR PATTERNS:
- Messages often appear with timestamps like "02:53 AM"
- WhatsApp may show "You:" for messages you sent
- Messages may appear without clear attribution
- Names in group chats may be highlighted or appear before messages
- UI elements like "Type a message" appear in the OCR

YOUR TASK:
Compare the previous OCR text with the current OCR text to find NEW MESSAGES from other people (not from you).
Specifically:
1. Ignore any text that matches or contains your last response
2. Focus on text that appears to be new and is not from you
3. Look for changes in conversation flow that indicate someone sent a new message
4. Pay special attention to text near timestamps that weren't in the previous OCR

Return your analysis as JSON in this format:
{
  "newMessageDetected": boolean,
  "shouldReply": boolean,
  "message": "the new message text if found",
  "sender": "the sender name if detectable",
  "reasoning": "explanation of why you think this is a new message from someone else"
}`;
      
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
          temperature: 0, // Lower temperature for more factual/analytical response
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to analyze conversation');
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      
      try {
        const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         analysisText.match(/{[\s\S]*}/);
                         
        const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '') : analysisText;
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse conversation analysis as JSON:", e);
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

  const generateInitialGreeting = useCallback(async (ocrText: string) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const systemPrompt = `You're looking at a WhatsApp conversation through OCR and need to initiate a friendly chat.`;
      
      const userPrompt = `OCR Text from WhatsApp:
${ocrText}

Your task:
1. Create a short, friendly initial greeting to start a conversation
2. Keep it natural and conversational, like something a real person would say
3. Make it 1-2 sentences at most
4. Use at most one emoji if appropriate
5. If you can determine the context from the OCR text, make your greeting relevant
6. If you can tell who you're talking to, personalize the greeting
7. Avoid using any specific names or specifics of that person
Generate ONLY the greeting message with no explanations or additional text.`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
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
          temperature: 0.7, // Slightly higher temperature for more natural greeting
          max_tokens: 100 // Short greeting only needs a few tokens
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate greeting');
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Nebius greeting generation failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      return "Hey there! 👋 How's your day going?"; // Fallback greeting
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
    analyzeConversation,
    generateInitialGreeting
  };
}