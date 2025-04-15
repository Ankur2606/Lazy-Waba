// AI response generation utilities
import { ChatMessage, AppType } from "./types";

/**
 * Generates and sends an AI response to a user message
 */
export async function generateAndSendAIResponse({
  message,
  lastOcrText,
  aiProvider,
  ollama,
  nebius,
  nebiusApiKey,
  lastAIResponseRef,
  addLog,
  setChatHistory,
  monitoringRef,
  sendChatResponse,
  selectedApp,
  myUsername,
  messageHistory,
  processingMessageRef
}: {
  message: string;
  lastOcrText: string;
  aiProvider: "ollama" | "nebius";
  ollama: any;
  nebius: any;
  nebiusApiKey: string;
  lastAIResponseRef: React.MutableRefObject<string>;
  addLog: (message: string) => void;
  setChatHistory: { get?: () => ChatMessage[], set?: React.Dispatch<React.SetStateAction<ChatMessage[]>> } | React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  monitoringRef: React.MutableRefObject<boolean>;
  sendChatResponse: (response: string, app: AppType, logFn: (message: string) => void) => Promise<void>;
  selectedApp: AppType;
  myUsername: string;
  messageHistory: React.MutableRefObject<string[]>;
  processingMessageRef: React.MutableRefObject<boolean>;
}) {
  console.log("generateAndSendResponse called for message:", message);
  try {
    addLog("Processing message for response");

    // Create OCR context
    const ocrContext = {
      text: lastOcrText,
      confidence: 0.9
    };

    // Generate response with AI
    let response = "";
    if (aiProvider === "ollama") {
      if (ollama.isProcessing) {
        response = "I'm still thinking about your last message. I'll respond in a moment.";
      } else {
        addLog("Generating response with Ollama");
        const chatHistory = typeof setChatHistory === 'object' && setChatHistory.get ? setChatHistory.get() : [];
        response = await ollama.generateChatResponse(message, chatHistory, ocrContext);
      }
    } else {
      if (nebius.isProcessing || !nebiusApiKey) {
        response = "Let me think about this for a moment.";
      } else {
        addLog("Generating response with Nebius");
        const chatHistory = typeof setChatHistory === 'object' && setChatHistory.get ? setChatHistory.get() : [];
        response = await nebius.generateChatResponse(message, chatHistory, ocrContext);
      }
    }

    // Store the AI response to prevent responding to our own messages
    lastAIResponseRef.current = response;
    
    addLog(`Response: "${response.substring(0, 30)}${response.length > 30 ? "..." : ""}"`);

    // Add response to chat history - check if we're using the object form or function form
    const newMessage: ChatMessage = {
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    };
    
    // Check if setChatHistory is a function or an object with set method
    if (typeof setChatHistory === 'object' && setChatHistory.set) {
      setChatHistory.set(prev => [...prev, newMessage]);
    } else if (typeof setChatHistory === 'function') {
      setChatHistory(prev => [...prev, newMessage]);
    } else {
      console.error("setChatHistory is neither a function nor an object with set method");
    }

    // Send the response if still monitoring - use monitoringRef instead of isMonitoring
    if (monitoringRef.current) {
      console.log("Still monitoring, sending response");
      await sendChatResponse(response, selectedApp, addLog);
      messageHistory.current.push(`${myUsername}: ${response}`);
      
      // Add a 4-second cooldown after sending response before resuming monitoring
      addLog("Adding 4-second cooldown before resuming monitoring");
      await new Promise(resolve => setTimeout(resolve, 4000));
    } else {
      console.log("Monitoring stopped, not sending response");
    }
  } catch (err) {
    console.error("Error in generateAndSendResponse:", err);
    addLog(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
  } finally {
    // Reset processing flag regardless of success or failure
    console.log("Message processing completed, resetting processing flag");
    processingMessageRef.current = false;
  }
}