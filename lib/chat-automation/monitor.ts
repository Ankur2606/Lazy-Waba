// General OCR monitoring functionality
import { pipe } from "@screenpipe/browser";

/**
 * Performs general OCR monitoring for any application
 * Used as a fallback when specialized monitors are not available
 */
export async function monitorChat({
  monitoringRef,
  processingMessageRef,
  monitoringTimerRef,
  addLog,
  analyzeConversationChanges
}) {
  console.log("monitorChat called, isMonitoring:", monitoringRef.current);
  // Check the ref, not the state variable, to get the most up-to-date value
  if (!monitoringRef.current) {
    console.log("Monitoring is off, exiting monitorChat");
    return;
  }

  // If we're currently processing a message, wait until it's done
  if (processingMessageRef.current) {
    console.log("Message processing in progress, waiting before starting next cycle");
    addLog("Waiting for current message processing to complete...");
    // Skip this cycle and wait for the next one
    monitoringTimerRef.current = setTimeout(() => {
      console.log("Checking again if message processing is complete");
      monitorChat({
        monitoringRef,
        processingMessageRef,
        monitoringTimerRef,
        addLog,
        analyzeConversationChanges
      });
    }, 2000); // Check again in 2 seconds
    return;
  }

  console.log("Getting OCR data...");
  addLog("Getting OCR data...");

  try {
    // Get OCR data
    console.log("Calling pipe.queryScreenpipe for OCR data");
    const result = await pipe.queryScreenpipe({
      contentType: "ocr",
      limit: 1,
    });
    console.log("OCR API response received:", result);

    if (result?.data?.length > 0) {
      console.log("OCR data found, items:", result.data.length);
      const text = result.data[0].content?.text;
      if (text) {
        console.log("OCR text found, length:", text.length);
        addLog(`OCR text captured (${text.length} chars)`);
        analyzeConversationChanges(text);
      } else {
        console.log("No text content in OCR data");
        addLog("No text content in OCR data");
      }
    } else {
      console.log("No OCR data available in response");
      addLog("No OCR data available");
    }
  } catch (err) {
    console.error("Error in OCR processing:", err);
    addLog(`OCR error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  // Continue monitoring loop, but only if we're not processing a message
  console.log("Setting up next monitoring cycle in 5 seconds");
  monitoringTimerRef.current = setTimeout(() => {
    console.log("5-second timeout completed, checking if monitoring should continue");
    // Check the ref here too, not the state variable
    if (monitoringRef.current) {
      console.log("Monitoring is still on, continuing to next cycle");
      monitorChat({
        monitoringRef,
        processingMessageRef,
        monitoringTimerRef,
        addLog,
        analyzeConversationChanges
      });
    } else {
      console.log("Monitoring was turned off during wait, stopping cycle");
    }
  }, 5000);
}