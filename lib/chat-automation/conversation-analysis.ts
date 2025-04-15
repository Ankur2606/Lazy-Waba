// Conversation analysis utilities
import { ChatMessage, AppType } from "./types";

/**
 * Analyzes WhatsApp conversation changes to detect new messages
 */
export async function analyzeConversationChanges({
  currentText,
  previousText,
  previousOcrText,
  processingMessageRef,
  setLastOcrText,
  setPreviousOcrText,
  lastAIResponseRef,
  chatHistory,
  aiProvider,
  ollama,
  nebius,
  myUsername,
  addLog,
  setLastMessage,
  messageHistory,
  setChatHistory,
  generateAndSendResponse
}: {
  currentText: string;
  previousText?: string;
  previousOcrText: string;
  processingMessageRef: React.MutableRefObject<boolean>;
  setLastOcrText: (text: string) => void;
  setPreviousOcrText: (text: string) => void;
  lastAIResponseRef: React.MutableRefObject<string>;
  chatHistory: ChatMessage[];
  aiProvider: "ollama" | "nebius";
  ollama: any;
  nebius: any;
  myUsername: string;
  addLog: (message: string) => void;
  setLastMessage: (message: string) => void;
  messageHistory: React.MutableRefObject<string[]>;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  generateAndSendResponse: (message: string) => void;
}) {
  console.log("analyzeConversationChanges called");
  if (!currentText) {
    console.log("Empty text, skipping analysis");
    return;
  }
  
  // If we're processing a message, don't analyze to avoid overlaps
  if (processingMessageRef.current) {
    console.log("Already processing a message, skipping analysis");
    return;
  }
  
  // If no explicit previous text is provided, use the stored previousOcrText
  previousText = previousText || previousOcrText;
  
  // If they're identical, no need to analyze
  if (currentText === previousText) {
    console.log("Text unchanged, skipping analysis");
    return;
  }

  // Store current text for future comparisons
  setLastOcrText(currentText);
  
  // If we still don't have previous text, just store this as baseline and exit
  if (!previousText) {
    console.log("No previous text available, storing current as baseline");
    setPreviousOcrText(currentText);
    return;
  }

  addLog("Analyzing conversation changes with AI...");
  
  try {
    // Get the last AI response for context
    const lastResponse = lastAIResponseRef.current;
    
    // Build recent chat history context
    const recentMessages = chatHistory
      .slice(-4) // Get last 4 messages for context
      .map(msg => `${msg.role === 'assistant' ? 'AI' : 'User'}: ${msg.content}`)
      .join('\n');
    
    console.log("Last AI response for context:", lastResponse?.substring(0, 50) + (lastResponse?.length > 50 ? "..." : ""));
    
    // Use appropriate AI provider to analyze the conversation
    const analysis = aiProvider === "ollama" 
      ? await ollama.analyzeConversation(
          previousText, 
          currentText, 
          myUsername,
          lastResponse, 
          recentMessages
        )
      : await nebius.analyzeConversation(
          previousText, 
          currentText, 
          myUsername,
          lastResponse,
          recentMessages
        );
    
    console.log("AI analysis result:", analysis);
    
    if (analysis.newMessageDetected && analysis.shouldReply) {
      addLog(`AI detected new message from ${analysis.sender || "someone"}: "${analysis.message.substring(0, 30)}${analysis.message.length > 30 ? '...' : ''}"`);
      
      // Process the detected message
      const newMessage = analysis.message;
      
      // Make sure this isn't our own message being reflected back
      if (lastResponse && newMessage.includes(lastResponse)) {
        console.log("Detected message appears to be our own response, skipping");
        addLog("Detected message appears to be our own response, skipping");
        return;
      }
      
      // Add to state and history
      setLastMessage(newMessage);
      messageHistory.current.push(newMessage);
      
      // Create chat message 
      const chatMsg: ChatMessage = {
        role: 'user',
        content: newMessage,
        timestamp: Date.now()
      };
      
      setChatHistory(prev => [...prev, chatMsg]);
      
      // Set processing flag and generate response
      processingMessageRef.current = true;
      generateAndSendResponse(newMessage);
    } else {
      if (analysis.newMessageDetected) {
        addLog(`Message detected but AI decided not to reply: ${analysis.reasoning}`);
      } else {
        addLog("No new messages requiring response");
      }
    }
  } catch (err) {
    console.error("Error in conversation analysis:", err);
    addLog(`Analysis error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

/**
 * Analyzes Discord conversation to detect new messages with context awareness
 */
export async function analyzeDiscordConversation({
  currentText,
  previousText,
  discordContext,
  processingMessageRef,
  setLastOcrText,
  setPreviousOcrText,
  lastAIResponseRef,
  chatHistory,
  aiProvider,
  ollama,
  nebius,
  myUsername,
  addLog,
  setLastMessage,
  messageHistory,
  setChatHistory,
  generateAndSendResponse
}: {
  currentText: string;
  previousText?: string;
  discordContext: { type?: string; username?: string; channelName?: string };
  processingMessageRef: React.MutableRefObject<boolean>;
  setLastOcrText: (text: string) => void;
  setPreviousOcrText: (text: string) => void;
  lastAIResponseRef: React.MutableRefObject<string>;
  chatHistory: ChatMessage[];
  aiProvider: "ollama" | "nebius";
  ollama: any;
  nebius: any;
  myUsername: string;
  addLog: (message: string) => void;
  setLastMessage: (message: string) => void;
  messageHistory: React.MutableRefObject<string[]>;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  generateAndSendResponse: (message: string) => void;
}) {
  console.log("analyzeDiscordConversation called for context:", discordContext?.type);
  if (!currentText) {
    console.log("Empty text, skipping Discord analysis");
    return;
  }
  
  // If we're processing a message, don't analyze to avoid overlaps
  if (processingMessageRef.current) {
    console.log("Already processing a message, skipping Discord analysis");
    return;
  }
  
  // If they're identical, no need to analyze
  if (currentText === previousText) {
    console.log("Discord text unchanged, skipping analysis");
    return;
  }

  // Store current text for future comparisons
  setLastOcrText(currentText);
  
  // If we still don't have previous text, just store this as baseline and exit
  if (!previousText) {
    console.log("No previous Discord text available, storing current as baseline");
    setPreviousOcrText(currentText);
    return;
  }

  addLog("Analyzing Discord conversation with AI...");
  
  try {
    // Get the last AI response for context
    const lastResponse = lastAIResponseRef.current;
    
    // Build recent chat history context
    const recentMessages = chatHistory
      .slice(-4) // Get last 4 messages for context
      .map(msg => `${msg.role === 'assistant' ? 'AI' : 'User'}: ${msg.content}`)
      .join('\n');
    
    // Create context-specific instructions based on Discord context
    let contextInstructions = "";
    
    if (discordContext) {
      // Add Discord-specific context to help AI understand the conversation
      if (discordContext.type === "direct_message" && discordContext.username) {
        contextInstructions = `This is a Discord direct message conversation with ${discordContext.username}. ` +
                             `Focus on messages that appear to be from them. ` +
                             `Messages typically appear in the format "Username timestamp: message content". ` +
                             `Ignore system messages and UI elements.`;
      } 
      else if (discordContext.type === "server_channel" && discordContext.channelName) {
        contextInstructions = `This is a Discord server conversation in the #${discordContext.channelName} channel. ` +
                             `There might be multiple participants. ` +
                             `Messages typically appear in the format "Username timestamp: message content". ` +
                             `Only respond to messages that are directed to you or seem to warrant a response. ` +
                             `Ignore system messages and UI elements.`;
      }
      else {
        contextInstructions = `This is a Discord conversation. ` +
                            `Messages typically appear with username and timestamp, then the message content. ` +
                            `There might be multiple participants in the conversation.`;
      }
    }
    
    // Use appropriate AI provider to analyze the conversation with Discord-specific instructions
    const analysis = aiProvider === "ollama" 
      ? await ollama.analyzeConversation(
          previousText, 
          currentText, 
          myUsername,
          lastResponse, 
          recentMessages,
          contextInstructions
        )
      : await nebius.analyzeConversation(
          previousText, 
          currentText, 
          myUsername,
          lastResponse,
          recentMessages,
          contextInstructions
        );
    
    console.log("Discord AI analysis result:", analysis);
    
    if (analysis.newMessageDetected && analysis.shouldReply) {
      // Format the log message based on Discord context
      let contextPrefix = "";
      if (discordContext?.type === "direct_message" && discordContext.username) {
        contextPrefix = `from ${discordContext.username} in DM: `;
      } else if (discordContext?.type === "server_channel" && discordContext.channelName) {
        contextPrefix = `from ${analysis.sender || "someone"} in #${discordContext.channelName}: `;
      }
      
      addLog(`AI detected new Discord message ${contextPrefix}"${analysis.message.substring(0, 30)}${analysis.message.length > 30 ? '...' : ''}"`);
      
      // Process the detected message
      const newMessage = analysis.message;
      
      // Make sure this isn't our own message being reflected back
      if (lastResponse && newMessage.includes(lastResponse)) {
        console.log("Detected Discord message appears to be our own response, skipping");
        addLog("Detected Discord message appears to be our own response, skipping");
        return;
      }
      
      // Add to state and history
      setLastMessage(newMessage);
      messageHistory.current.push(newMessage);
      
      // Create chat message 
      const chatMsg: ChatMessage = {
        role: 'user',
        content: newMessage,
        timestamp: Date.now()
      };
      
      setChatHistory(prev => [...prev, chatMsg]);
      
      // Set processing flag and generate response
      processingMessageRef.current = true;
      generateAndSendResponse(newMessage);
    } else {
      if (analysis.newMessageDetected) {
        addLog(`Discord message detected but AI decided not to reply: ${analysis.reasoning}`);
      } else {
        addLog("No new Discord messages requiring response");
      }
    }
  } catch (err) {
    console.error("Error in Discord conversation analysis:", err);
    addLog(`Discord analysis error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}