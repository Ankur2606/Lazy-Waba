// OCR monitoring utilities
import { pipe } from "@screenpipe/browser";
import { monitorWhatsAppConversations } from "@/lib/whatsapp-ocr-monitor";
import { monitorDiscordConversations } from "@/lib/discord-ocr-monitor";

/**
 * Starts WhatsApp-specific OCR monitoring
 */
export async function setupWhatsAppMonitoring({
  setLastOcrText,
  setPreviousOcrText,
  setWhatsappMonitor,
  initialGreetingTimerRef,
  monitoringRef,
  initialGreetingSentRef,
  processingMessageRef,
  sendInitialGreeting,
  addLog,
  monitorChat,
  analyzeConversationChanges
}) {
  // Reset the initial greeting flag
  initialGreetingSentRef.current = false;
  
  // Take initial OCR to establish baseline
  addLog("Taking initial OCR snapshot of WhatsApp");
  
  try {
    const result = await pipe.queryScreenpipe({
      contentType: "ocr",
      windowName: "WhatsApp",
      limit: 1,
    });
    
    if (result?.data?.length > 0) {
      const initialText = result.data[0].content?.text || "";
      setLastOcrText(initialText);
      setPreviousOcrText(initialText); // Store as previous OCR text too
      addLog(`Established baseline OCR (${initialText.length} chars)`);
      
      // Now start the WhatsApp monitoring with our dedicated utility
      addLog("Starting dedicated WhatsApp OCR monitoring");
      
      const monitor = monitorWhatsAppConversations({
        pollingIntervalMs: 5000,     // Check every 5 seconds
        timeWindowMs: 30000,         // Look back 30 seconds for changes
        limit: 1,                    // Just get the most recent result
        initialBaselineText: initialText, // Use the initial OCR as baseline
        
        onNewOcrDetected: (text, timestamp, previousText) => {
          console.log(`New WhatsApp OCR detected at ${new Date(timestamp).toLocaleTimeString()}`);
          addLog(`New WhatsApp content detected (${text.length} chars)`);
          
          // Store previous text for comparison
          setPreviousOcrText(previousText);
          
          // Process the OCR text to detect and respond to messages
          analyzeConversationChanges(text, previousText);
        },
        
        onError: (error) => {
          console.error("WhatsApp monitor error:", error);
          addLog(`WhatsApp monitoring error: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
      
      // Store the monitor for later cleanup
      setWhatsappMonitor(monitor);

      // Set a timer to send an initial greeting if no activity is detected
      if (initialGreetingTimerRef.current) {
        clearTimeout(initialGreetingTimerRef.current);
      }
      
      initialGreetingTimerRef.current = setTimeout(() => {
        // Only send initial greeting if we haven't already sent one
        // and we're not currently processing another message
        if (monitoringRef.current && 
            !initialGreetingSentRef.current && 
            !processingMessageRef.current) {
          sendInitialGreeting(initialText);
        }
      }, 15000); // Wait 15 seconds before sending initial greeting
      
      return true;
    } else {
      addLog("Failed to establish baseline OCR, falling back to regular monitoring");
      monitorChat();
      return false;
    }
  } catch (error) {
    console.error("Error establishing baseline:", error);
    addLog(`Error establishing baseline: ${error instanceof Error ? error.message : String(error)}`);
    
    // Fall back to regular monitoring
    monitorChat();
    return false;
  }
}

/**
 * Starts Discord-specific OCR monitoring
 */
export async function setupDiscordMonitoring({
  setLastOcrText,
  setPreviousOcrText,
  setDiscordMonitor,
  initialGreetingTimerRef,
  monitoringRef,
  initialGreetingSentRef,
  processingMessageRef,
  sendInitialDiscordGreeting,
  addLog,
  monitorChat,
  analyzeDiscordConversation
}) {
  // Reset the initial greeting flag
  initialGreetingSentRef.current = false;
  
  // Take initial OCR to establish baseline
  addLog("Taking initial OCR snapshot of Discord");
  
  try {
    const result = await pipe.queryScreenpipe({
      contentType: "ocr",
      appName: "Discord",
      limit: 1,
    });
    
    if (result?.data?.length > 0) {
      const initialText = result.data[0].content?.text || "";
      setLastOcrText(initialText);
      setPreviousOcrText(initialText); // Store as previous OCR text too
      addLog(`Established baseline OCR (${initialText.length} chars)`);
      
      // Now start the Discord monitoring with our dedicated utility
      addLog("Starting dedicated Discord OCR monitoring");
      
      const monitor = monitorDiscordConversations({
        pollingIntervalMs: 5000,     // Check every 5 seconds
        timeWindowMs: 30000,         // Look back 30 seconds for changes
        limit: 1,                    // Just get the most recent result
        initialBaselineText: initialText, // Use the initial OCR as baseline
        
        onNewOcrDetected: (text, timestamp, previousText, discordContext) => {
          console.log(`New Discord OCR detected at ${new Date(timestamp).toLocaleTimeString()}`);
          
          // Log the context type (server channel or DM)
          if (discordContext.type === "server_channel") {
            addLog(`New Discord content detected in channel #${discordContext.channelName || "unknown"} (${text.length} chars)`);
          } else if (discordContext.type === "direct_message") {
            addLog(`New Discord content detected in DM with ${discordContext.username || "someone"} (${text.length} chars)`);
          } else {
            addLog(`New Discord content detected (${text.length} chars)`);
          }
          
          // Store previous text for comparison
          setPreviousOcrText(previousText);
          
          // Process the OCR text to detect and respond to messages
          analyzeDiscordConversation(text, previousText, discordContext);
        },
        
        onError: (error) => {
          console.error("Discord monitor error:", error);
          addLog(`Discord monitoring error: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
      
      // Store the monitor for later cleanup
      setDiscordMonitor(monitor);

      // Set a timer to send an initial greeting if no activity is detected
      if (initialGreetingTimerRef.current) {
        clearTimeout(initialGreetingTimerRef.current);
      }
      
      initialGreetingTimerRef.current = setTimeout(() => {
        // Only send initial greeting if we haven't already sent one
        // and we're not currently processing another message
        if (monitoringRef.current && 
            !initialGreetingSentRef.current && 
            !processingMessageRef.current) {
          
          // Get current Discord context if available
          const currentContext = monitor.getCurrentContext();
          sendInitialDiscordGreeting(initialText, currentContext);
        }
      }, 15000); // Wait 15 seconds before sending initial greeting
      
      return true;
    } else {
      addLog("Failed to establish baseline OCR, falling back to regular monitoring");
      monitorChat();
      return false;
    }
  } catch (error) {
    console.error("Error establishing baseline:", error);
    addLog(`Error establishing baseline: ${error instanceof Error ? error.message : String(error)}`);
    
    // Fall back to regular monitoring
    monitorChat();
    return false;
  }
}