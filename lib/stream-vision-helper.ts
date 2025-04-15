import { pipe, VisionEvent, VisionStreamResponse } from "@screenpipe/browser";

// Define interfaces for Screenpipe results
interface ScreenpipeOcrContent {
  text: string;
  [key: string]: any;
}

interface ScreenpipeAudioContent {
  transcript?: string;
  [key: string]: any;
}

interface ScreenpipeUiContent {
  elements?: any[];
  [key: string]: any;
}

type ScreenpipeContent = ScreenpipeOcrContent | ScreenpipeAudioContent | ScreenpipeUiContent;

interface ScreenpipeDataItem {
  content: ScreenpipeContent;
  type: string;
  timestamp?: number;
  [key: string]: any;
}

interface ScreenpipeQueryResult {
  data: ScreenpipeDataItem[];
  [key: string]: any;
}

export interface StreamVisionOptions {
  includeImages?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelay?: number;
  onEvent?: (event: VisionEvent) => void;
  onError?: (error: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export interface StreamVisionResult {
  stop: () => void;
  isActive: () => boolean;
}

/**
 * A wrapper around pipe.streamVision that provides more resilience:
 * - Timeout handling
 * - Automatic reconnection on error
 * - Event callback approach instead of async iterator
 * 
 * @example
 * const stream = startReliableVisionStream({
 *   includeImages: true,
 *   onEvent: (event) => {
 *     // Process OCR event
 *     if (event.text) {
 *       console.log("OCR text:", event.text);
 *     }
 *   },
 *   onError: (error) => console.error("Stream error:", error)
 * });
 * 
 * // Later when done:
 * stream.stop();
 */
export function startReliableVisionStream(options: StreamVisionOptions = {}): StreamVisionResult {
  const {
    includeImages = true,
    timeoutMs = 10000,
    maxRetries = 3,
    retryDelay = 2000,
    onEvent = () => {},
    onError = () => {},
    onConnected = () => {},
    onDisconnected = () => {}
  } = options;

  let isRunning = true;
  let retryCount = 0;
  let failedAttempts = 0;
  let timeoutTimer: NodeJS.Timeout | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;
  
  // Track if we've received at least one event
  let hasReceivedEvent = false;

  // Start the stream processing loop
  processStream();

  function resetTimeout() {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
    }
    
    timeoutTimer = setTimeout(() => {
      console.log(`[StreamVisionHelper] No events received for ${timeoutMs}ms, restarting...`);
      failedAttempts++;
      restartStream();
    }, timeoutMs);
  }

  async function processStream() {
    console.log(`[StreamVisionHelper] Starting streamVision (attempt ${retryCount + 1})`);
    
    try {
      // Reset the timeout whenever we start a new stream
      resetTimeout();
      
      // First, check if regular OCR works
      if (!hasReceivedEvent && retryCount > 0) {
        console.log("[StreamVisionHelper] Checking if regular OCR works...");
        try {
          const ocrResult = await pipe.queryScreenpipe({ contentType: 'ocr', limit: 1 }) as ScreenpipeQueryResult;
          if (ocrResult?.data?.length && 
              ocrResult.data[0].type === 'OCR' && 
              (ocrResult.data[0].content as ScreenpipeOcrContent)?.text) {
            console.log("[StreamVisionHelper] Regular OCR is working, length:",
                        (ocrResult.data[0].content as ScreenpipeOcrContent).text.length);
          } else {
            console.log("[StreamVisionHelper] Regular OCR returned no results");
          }
        } catch (ocrErr) {
          console.error("[StreamVisionHelper] Error testing regular OCR:", ocrErr);
        }
      }

      // Request the stream
      const streamIterator = pipe.streamVision(includeImages);
      
      // Get the first event with a timeout
      try {
        const firstEventPromise = streamIterator.next();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Timeout waiting for first event")), 5000);
        });
        
        const result = await Promise.race([firstEventPromise, timeoutPromise]);
        
        // If we get here, we received the first event successfully
        if (result.value) {
          console.log("[StreamVisionHelper] Received first event successfully");
          
          // Reset failed attempts since we got an event
          failedAttempts = 0;
          hasReceivedEvent = true;
          
          // Process the first event
          const firstEvent = result.value.data;
          onEvent(firstEvent);
          
          // Signal that we're connected
          onConnected();
          
          // Reset timeout after receiving event
          resetTimeout();
        }
      } catch (firstEventError) {
        console.error("[StreamVisionHelper] Error getting first event:", firstEventError);
        throw firstEventError;
      }
      
      // Process the rest of the stream
      for await (const event of streamIterator) {
        if (!isRunning) break;
        
        if (event.data) {
          // Reset timeout after each event
          resetTimeout();
          
          // Process the event
          onEvent(event.data);
          
          // Increment success counter
          hasReceivedEvent = true;
          failedAttempts = 0;
        }
      }
    } catch (error) {
      console.error("[StreamVisionHelper] Stream error:", error);
      onError(error);
      
      // Only retry if still running
      if (isRunning) {
        restartStream();
      }
    }
  }

  function restartStream() {
    if (!isRunning) return;
    
    // Clear any existing timers
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    
    retryCount++;
    
    // If we've failed too many times, give up
    if (failedAttempts >= maxRetries) {
      console.error(`[StreamVisionHelper] Failed too many times (${failedAttempts}), giving up`);
      onError(new Error(`Failed to connect after ${failedAttempts} attempts`));
      onDisconnected();
      isRunning = false;
      return;
    }
    
    // Exponential backoff for reconnect
    const delay = Math.min(retryDelay * Math.pow(1.5, retryCount - 1), 30000);
    console.log(`[StreamVisionHelper] Reconnecting in ${Math.round(delay/1000)}s...`);
    
    reconnectTimer = setTimeout(() => {
      processStream();
    }, delay);
  }

  function stopStream() {
    console.log("[StreamVisionHelper] Stopping stream");
    isRunning = false;
    
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    
    onDisconnected();
  }

  return {
    stop: stopStream,
    isActive: () => isRunning
  };
}

/**
 * A simpler version that returns the OCR text from the stream
 */
export function startOcrTextStream(
  callback: (text: string) => void,
  errorCallback: (error: any) => void = () => {},
  options: Partial<StreamVisionOptions> = {}
): StreamVisionResult {
  return startReliableVisionStream({
    ...options,
    onEvent: (event) => {
      if (event.text) {
        callback(event.text);
      }
    },
    onError: errorCallback
  });
}