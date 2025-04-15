// Greeting utilities for chat automation
import { sendChatResponse } from "./utils";
import { ChatMessage } from "./types";

/**
 * Sends an initial greeting for WhatsApp when no conversation is detected
 */
export async function sendInitialGreeting({
  ocrText,
  monitoringRef,
  initialGreetingSentRef,
  processingMessageRef,
  aiProvider,
  ollama,
  nebius,
  lastAIResponseRef,
  setChatHistory,
  selectedApp,
  addLog,
  myUsername,
  messageHistory
}) {
  // Only proceed if we're still monitoring and haven't sent a greeting yet
  if (!monitoringRef.current || initialGreetingSentRef.current || processingMessageRef.current) {
    return;
  }
  
  addLog("No conversation detected. Sending initial greeting...");
  
  try {
    // Set flags to prevent duplicate greetings
    initialGreetingSentRef.current = true;
    processingMessageRef.current = true;
    
    // Create OCR context for AI to analyze conversation context
    const ocrContext = {
      text: ocrText,
      confidence: 0.9
    };
    
    // Generate a context-aware greeting
    let greeting = "";
    if (aiProvider === "ollama") {
      greeting = await ollama.generateInitialGreeting(ocrText);
    } else {
      greeting = await nebius.generateInitialGreeting(ocrText);
    }
    
    // Make sure we got a valid greeting
    if (!greeting || greeting.trim().length === 0) {
      greeting = "Hey there! 👋 How's your day going?";
    }
    
    // Store as the last AI response to prevent loop
    lastAIResponseRef.current = greeting;
    
    // Add to chat history
    const newMessage: ChatMessage = {
      role: 'assistant',
      content: greeting,
      timestamp: Date.now()
    };
    
    setChatHistory(prev => [...prev, newMessage]);
    
    // Send the greeting
    addLog(`Sending initial greeting: "${greeting.substring(0, 30)}${greeting.length > 30 ? '...' : ''}"`);
    await sendChatResponse(greeting, selectedApp, addLog);
    
    // Add to message history
    messageHistory.current.push(`${myUsername}: ${greeting}`);
    
    // Add extra delay after sending initial greeting
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (err) {
    console.error("Error sending initial greeting:", err);
    addLog(`Error sending greeting: ${err instanceof Error ? err.message : "Unknown error"}`);
  } finally {
    // Reset processing flag
    processingMessageRef.current = false;
  }
}

/**
 * Sends an initial greeting for Discord based on the detected context
 */
export async function sendInitialDiscordGreeting({
  ocrText,
  discordContext,
  monitoringRef,
  initialGreetingSentRef,
  processingMessageRef,
  aiProvider,
  ollama,
  nebius,
  lastAIResponseRef,
  setChatHistory,
  selectedApp,
  addLog,
  myUsername,
  messageHistory
}) {
  // Only proceed if we're still monitoring and haven't sent a greeting yet
  if (!monitoringRef.current || initialGreetingSentRef.current || processingMessageRef.current) {
    return;
  }
  
  // Different greeting approach based on context
  let contextDescription = "Discord";
  if (discordContext) {
    if (discordContext.type === "direct_message" && discordContext.username) {
      contextDescription = `Discord DM with ${discordContext.username}`;
    } else if (discordContext.type === "server_channel" && discordContext.channelName) {
      contextDescription = `Discord channel #${discordContext.channelName}`;
    }
  }
  
  addLog(`No conversation detected. Sending initial greeting to ${contextDescription}...`);
  
  try {
    // Set flags to prevent duplicate greetings
    initialGreetingSentRef.current = true;
    processingMessageRef.current = true;
    
    // Create OCR context for AI to analyze conversation context
    const ocrContext = {
      text: ocrText,
      confidence: 0.9
    };
    
    // Create context-specific prompt for the greeting
    let greetingPrompt = "Generate a friendly initial greeting for a Discord conversation.";
    
    if (discordContext) {
      if (discordContext.type === "direct_message" && discordContext.username) {
        greetingPrompt = `Generate a friendly initial greeting for a Discord direct message conversation with ${discordContext.username}.`;
      } else if (discordContext.type === "server_channel" && discordContext.channelName) {
        greetingPrompt = `Generate a friendly initial greeting for a Discord server in the #${discordContext.channelName} channel.`;
      }
    }
    
    // Generate a context-aware greeting
    let greeting = "";
    if (aiProvider === "ollama") {
      greeting = await ollama.generateInitialGreeting(ocrText, greetingPrompt);
    } else {
      greeting = await nebius.generateInitialGreeting(ocrText, greetingPrompt);
    }
    
    // Make sure we got a valid greeting
    if (!greeting || greeting.trim().length === 0) {
      if (discordContext?.type === "direct_message") {
        greeting = "Hey there! 👋 How can I help you today?";
      } else if (discordContext?.type === "server_channel") {
        greeting = "Hello everyone! 👋 I'm here to help. Feel free to ask me anything!";
      } else {
        greeting = "Hello Discord! 👋 How's everyone doing today?";
      }
    }
    
    // Store as the last AI response to prevent loop
    lastAIResponseRef.current = greeting;
    
    // Add to chat history
    const newMessage: ChatMessage = {
      role: 'assistant',
      content: greeting,
      timestamp: Date.now()
    };
    
    setChatHistory(prev => [...prev, newMessage]);
    
    // Send the greeting
    addLog(`Sending initial Discord greeting: "${greeting.substring(0, 30)}${greeting.length > 30 ? '...' : ''}"`);
    await sendChatResponse(greeting, selectedApp, addLog);
    
    // Add to message history
    messageHistory.current.push(`${myUsername}: ${greeting}`);
    
    // Add extra delay after sending initial greeting
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (err) {
    console.error("Error sending initial Discord greeting:", err);
    addLog(`Error sending Discord greeting: ${err instanceof Error ? err.message : "Unknown error"}`);
  } finally {
    // Reset processing flag
    processingMessageRef.current = false;
  }
}