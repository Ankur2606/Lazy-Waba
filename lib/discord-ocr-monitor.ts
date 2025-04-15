import { pipe } from "@screenpipe/browser";

// Discord message context types
export enum DiscordContextType {
  SERVER_CHANNEL = "server_channel",
  DIRECT_MESSAGE = "direct_message",
  UNKNOWN = "unknown"
}

export interface DiscordContext {
  type: DiscordContextType;
  serverName?: string;
  channelName?: string;
  username?: string;
  isDM: boolean;
}

export interface DiscordMonitorOptions {
  pollingIntervalMs?: number;
  timeWindowMs?: number;
  limit?: number;
  initialBaselineText?: string;
  onNewOcrDetected?: (text: string, timestamp: string, previousText: string, context: DiscordContext) => void;
  onError?: (error: any) => void;
}

export interface DiscordMonitorResult {
  stop: () => void;
  isActive: () => boolean;
  forceRefresh: () => Promise<void>;
  updateBaseline: (newBaseline: string) => void;
  getCurrentContext: () => DiscordContext | null;
}

// Define interfaces for Screenpipe results
interface ScreenpipeOcrContent {
  text: string;
  [key: string]: any;
}

interface ScreenpipeOcrDataItem {
  content: ScreenpipeOcrContent;
  timestamp?: number;
  type?: string;
  [key: string]: any;
}

interface ScreenpipeQueryResult {
  data: ScreenpipeOcrDataItem[];
  [key: string]: any;
}

/**
 * Detects Discord context from OCR text
 * Identifies if we're in a server channel or direct message
 */
function detectDiscordContext(ocrText: string): DiscordContext {
  // Default context
  const context: DiscordContext = {
    type: DiscordContextType.UNKNOWN,
    isDM: false
  };

  // Check if it's a Direct Message
  if (
    ocrText.includes("Direct Messages") && 
    (ocrText.includes("Find or start a conversation") || ocrText.includes("Message @"))
  ) {
    context.type = DiscordContextType.DIRECT_MESSAGE;
    context.isDM = true;
    
    // Try to extract username from DM
    const dmMatch = ocrText.match(/Direct Messages to ([^\n]+)/i) || 
                    ocrText.match(/Message\s?@([^\n\s]+)/i);
    if (dmMatch && dmMatch[1]) {
      context.username = dmMatch[1].trim();
    }
    
    return context;
  }
  
  // Check if it's a server channel
  const serverChannelMatch = ocrText.match(/#\s?([a-zA-Z0-9_-]+)/);
  if (serverChannelMatch && serverChannelMatch[1]) {
    context.type = DiscordContextType.SERVER_CHANNEL;
    context.channelName = serverChannelMatch[1].trim();
    
    // Try to extract server name
    // This is more challenging with OCR but we can try
    const serverNameMatch = ocrText.match(/server-updates|server-staff|announcements/i);
    if (serverNameMatch) {
      // Check for a server name before the channel list
      const possibleServerName = ocrText.split(serverNameMatch[0])[0]
                                        .split('\n')
                                        .filter(line => line.trim().length > 0)
                                        .pop();
      if (possibleServerName) {
        context.serverName = possibleServerName.trim();
      }
    }
    
    return context;
  }
  
  return context;
}

/**
 * Monitors Discord conversations by periodically querying the ScreenPipe API
 * for recent OCR text from the Discord window.
 * 
 * This approach is more reliable than real-time streaming since it:
 * 1. Focuses specifically on Discord content
 * 2. Has configurable polling intervals
 * 3. Can look back over a specific time window
 * 4. Deduplicates content to avoid repeated processing
 * 5. Detects Discord context (server/channel vs. DM)
 * 
 * @example
 * const monitor = monitorDiscordConversations({
 *   pollingIntervalMs: 5000, // Check every 5 seconds
 *   onNewOcrDetected: (text, timestamp, previousText, context) => {
 *     console.log(`New Discord content detected at ${timestamp}`);
 *     console.log(`Context: ${context.type}, isDM: ${context.isDM}`);
 *     analyzeConversation(previousText, text);
 *   }
 * });
 * 
 * // Later when done:
 * monitor.stop();
 */
export function monitorDiscordConversations(
  options: DiscordMonitorOptions = {}
): DiscordMonitorResult {
  const {
    pollingIntervalMs = 5000,
    timeWindowMs = 20000, // Look back 20 seconds by default
    limit = 1, // Usually just need the most recent
    initialBaselineText = '', // Use empty string as default if no baseline provided
    onNewOcrDetected = () => {},
    onError = () => {}
  } = options;
  
  let isRunning = true;
  let pollingTimer: NodeJS.Timeout | null = null;
  let lastOcrText: string = initialBaselineText; // Initialize with provided baseline
  let lastTimestamp: string = new Date().toISOString();
  let baselineInitialized = !!initialBaselineText; // Track if baseline has been initialized
  let currentContext: DiscordContext | null = initialBaselineText ? 
      detectDiscordContext(initialBaselineText) : null;
  
  console.log("[DiscordMonitor] Starting Discord conversation monitor");
  if (initialBaselineText) {
    console.log("[DiscordMonitor] Initial baseline provided:", 
      initialBaselineText.length > 30 
        ? `${initialBaselineText.substring(0, 30)}... (${initialBaselineText.length} chars)` 
        : initialBaselineText);
    
    if (currentContext) {
      console.log("[DiscordMonitor] Initial context detected:", 
        JSON.stringify(currentContext));
    }
  }
  
  // Start polling
  startPolling();
  
  function startPolling() {
    if (pollingTimer) {
      clearTimeout(pollingTimer);
    }
    
    if (!isRunning) return;
    
    // First poll immediately
    pollDiscordOcr()
      .catch(onError)
      .finally(() => {
        // Schedule next poll if still running
        if (isRunning) {
          pollingTimer = setTimeout(startPolling, pollingIntervalMs);
        }
      });
  }
  
  async function pollDiscordOcr() {
    // Calculate the time window to look for new content
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - timeWindowMs).toISOString();
    
    try {
      console.log("[DiscordMonitor] Polling for new Discord OCR content");
      
      // Query for the most recent Discord OCR content
      const results = await pipe.queryScreenpipe({
        contentType: "ocr",
        appName: "Discord", // Specific to Discord
        startTime,
        endTime,
        limit,
        // Don't include frames by default to reduce data transfer
        includeFrames: false
      }) as ScreenpipeQueryResult;
      
      // Check if we have results
      if (results?.data?.length > 0) {
        const latestItem = results.data[0];
        
        if (latestItem.type === "OCR" && latestItem.content) {
          const ocrText = latestItem.content.text;
          const timestamp = latestItem.content.timestamp;
          
          // Detect Discord context
          const context = detectDiscordContext(ocrText);
          currentContext = context;
          
          // Handle baseline initialization
          if (!baselineInitialized) {
            console.log("[DiscordMonitor] Initializing baseline with first OCR result");
            console.log("[DiscordMonitor] Discord context detected:", JSON.stringify(context));
            lastOcrText = ocrText;
            lastTimestamp = timestamp;
            baselineInitialized = true;
            return;
          }
          
          // Only process if the content is different from last time
          if (ocrText && ocrText !== lastOcrText) {
            console.log("[DiscordMonitor] New Discord OCR content detected");
            console.log("[DiscordMonitor] Discord context:", JSON.stringify(context));
            
            // Store current text for next comparison
            const previousText = lastOcrText;
            
            // Update stored values
            lastOcrText = ocrText;
            lastTimestamp = timestamp;
            
            // Notify callback with both current and previous OCR text and context
            onNewOcrDetected(ocrText, timestamp, previousText, context);
          }
        }
      } else {
        console.log("[DiscordMonitor] No Discord OCR content found");
      }
    } catch (error) {
      console.error("[DiscordMonitor] Error polling Discord OCR:", error);
      onError(error);
    }
  }
  
  async function forceRefresh() {
    if (!isRunning) return;
    console.log("[DiscordMonitor] Forcing refresh of Discord OCR content");
    await pollDiscordOcr().catch(onError);
  }
  
  function stopMonitoring() {
    console.log("[DiscordMonitor] Stopping Discord conversation monitor");
    isRunning = false;
    
    if (pollingTimer) {
      clearTimeout(pollingTimer);
      pollingTimer = null;
    }
  }
  
  function updateBaseline(newBaseline: string) {
    console.log("[DiscordMonitor] Updating baseline text");
    lastOcrText = newBaseline;
    baselineInitialized = true;
    
    // Update context when baseline changes
    currentContext = detectDiscordContext(newBaseline);
    console.log("[DiscordMonitor] Updated Discord context:", JSON.stringify(currentContext));
  }
  
  function getCurrentContext() {
    return currentContext;
  }
  
  return {
    stop: stopMonitoring,
    isActive: () => isRunning,
    forceRefresh,
    updateBaseline,
    getCurrentContext
  };
}