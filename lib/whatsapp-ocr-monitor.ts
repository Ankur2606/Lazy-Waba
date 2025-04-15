import { pipe } from "@screenpipe/browser";

// Define interfaces for Screenpipe results
interface ScreenpipeOcrContent {
  text: string;
  timestamp?: string;
  [key: string]: any;
}

interface ScreenpipeOcrDataItem {
  content: ScreenpipeOcrContent;
  type?: string;
  [key: string]: any;
}

interface ScreenpipeQueryResult {
  data: ScreenpipeOcrDataItem[];
  [key: string]: any;
}

export interface WhatsAppMonitorOptions {
  pollingIntervalMs?: number;
  timeWindowMs?: number;
  limit?: number;
  initialBaselineText?: string; // Add option to provide initial baseline
  onNewOcrDetected?: (text: string, timestamp: string, previousText: string) => void; // Include previous text in callback
  onError?: (error: any) => void;
}

export interface WhatsAppMonitorResult {
  stop: () => void;
  isActive: () => boolean;
  forceRefresh: () => Promise<void>;
  updateBaseline: (newBaseline: string) => void; // Add function to update baseline
}

/**
 * Monitors WhatsApp conversations by periodically querying the ScreenPipe API
 * for recent OCR text from the WhatsApp window.
 * 
 * This approach is more reliable than real-time streaming since it:
 * 1. Focuses specifically on WhatsApp content
 * 2. Has configurable polling intervals
 * 3. Can look back over a specific time window
 * 4. Deduplicates content to avoid repeated processing
 * 
 * @example
 * const monitor = monitorWhatsAppConversations({
 *   pollingIntervalMs: 5000, // Check every 5 seconds
 *   onNewOcrDetected: (text, timestamp, previousText) => {
 *     console.log(`New WhatsApp content detected at ${timestamp}`);
 *     analyzeConversation(previousText, text);
 *   }
 * });
 * 
 * // Later when done:
 * monitor.stop();
 */
export function monitorWhatsAppConversations(
  options: WhatsAppMonitorOptions = {}
): WhatsAppMonitorResult {
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
  
  console.log("[WhatsAppMonitor] Starting WhatsApp conversation monitor");
  if (initialBaselineText) {
    console.log("[WhatsAppMonitor] Initial baseline provided:", 
      initialBaselineText.length > 30 
        ? `${initialBaselineText.substring(0, 30)}... (${initialBaselineText.length} chars)` 
        : initialBaselineText);
  }
  
  // Start polling
  startPolling();
  
  function startPolling() {
    if (pollingTimer) {
      clearTimeout(pollingTimer);
    }
    
    if (!isRunning) return;
    
    // First poll immediately
    pollWhatsAppOcr()
      .catch(onError)
      .finally(() => {
        // Schedule next poll if still running
        if (isRunning) {
          pollingTimer = setTimeout(startPolling, pollingIntervalMs);
        }
      });
  }
  
  async function pollWhatsAppOcr() {
    // Calculate the time window to look for new content
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - timeWindowMs).toISOString();
    
    try {
      console.log("[WhatsAppMonitor] Polling for new WhatsApp OCR content");
      
      // Query for the most recent WhatsApp OCR content
      const results = await pipe.queryScreenpipe({
        contentType: "ocr",
        windowName: "WhatsApp", // Specific to WhatsApp
        startTime,
        endTime,
        limit,
        // Don't include frames by default to reduce data transfer
        includeFrames: false
      }) as ScreenpipeQueryResult;
      
      // Check if we have results
      if (results?.data && results.data.length > 0) {
        const latestItem = results.data[0];
        
        if (latestItem.type === "OCR" && latestItem.content) {
          const ocrText = latestItem.content.text;
          const timestamp = latestItem.content.timestamp || new Date().toISOString();
          
          // Handle baseline initialization
          if (!baselineInitialized) {
            console.log("[WhatsAppMonitor] Initializing baseline with first OCR result");
            lastOcrText = ocrText;
            lastTimestamp = timestamp;
            baselineInitialized = true;
            return;
          }
          
          // Only process if the content is different from last time
          if (ocrText && ocrText !== lastOcrText) {
            console.log("[WhatsAppMonitor] New WhatsApp OCR content detected");
            
            // Store current text for next comparison
            const previousText = lastOcrText;
            
            // Update stored values
            lastOcrText = ocrText;
            lastTimestamp = timestamp;
            
            // Notify callback with both current and previous OCR text
            onNewOcrDetected(ocrText, timestamp, previousText);
          }
        }
      } else {
        console.log("[WhatsAppMonitor] No WhatsApp OCR content found");
      }
    } catch (error) {
      console.error("[WhatsAppMonitor] Error polling WhatsApp OCR:", error);
      onError(error);
    }
  }
  
  async function forceRefresh() {
    if (!isRunning) return;
    console.log("[WhatsAppMonitor] Forcing refresh of WhatsApp OCR content");
    await pollWhatsAppOcr().catch(onError);
  }
  
  function stopMonitoring() {
    console.log("[WhatsAppMonitor] Stopping WhatsApp conversation monitor");
    isRunning = false;
    
    if (pollingTimer) {
      clearTimeout(pollingTimer);
      pollingTimer = null;
    }
  }
  
  function updateBaseline(newBaseline: string) {
    console.log("[WhatsAppMonitor] Updating baseline text");
    lastOcrText = newBaseline;
    baselineInitialized = true;
  }
  
  return {
    stop: stopMonitoring,
    isActive: () => isRunning,
    forceRefresh,
    updateBaseline
  };
}