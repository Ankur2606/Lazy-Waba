// Utility functions for chat automation

import { pipe } from "@screenpipe/browser";
import { AppType, APP_CONFIGS } from "./types";

/**
 * Sends a text response to the selected chat application
 */
export async function sendChatResponse(
  text: string, 
  selectedApp: AppType,
  addLog: (message: string) => void
) {
  console.log("sendResponse called with text:", text);
  try {
    const config = APP_CONFIGS[selectedApp];
    addLog(`Sending response to ${selectedApp}`);

    // Move to input box and click
    console.log("Moving mouse to input box:", config.inputBox);
    await pipe.operator.pixel.moveMouse(config.inputBox.x, config.inputBox.y);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Type response
    console.log("Starting to type response");
    addLog("Typing response");
    const chunks = text.match(/.{1,15}|.+/g) || [];
    for (const chunk of chunks) {
      console.log("Typing chunk:", chunk);
      await pipe.operator.pixel.type(chunk);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Press enter to send
    await pipe.operator.pixel.press("enter");

    console.log("Response sent successfully");
    addLog("Response sent successfully");
    addLog("Waiting for 10 seconds before resuming monitoring");
    await new Promise((resolve) => setTimeout(resolve, 10000));
  } catch (err) {
    console.error("Error in sendResponse:", err);
    addLog(`Error sending: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

/**
 * Opens WhatsApp Desktop application
 */
export async function openWhatsAppDesktop(addLog: (message: string) => void) {
  try {
    addLog("Attempting to launch WhatsApp Desktop...");
    const response = await fetch('/api/open-whatsapp', {
      method: 'POST'
    }); 
    const data = await response.json();
    if (data.success) {
      addLog("WhatsApp Desktop launch request sent successfully");
    } 
    else {
      addLog(`Error launching WhatsApp: ${data.error}`);
    }
  } 
  catch (error) {
    addLog(`Error launching WhatsApp: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Opens Discord application
 */
export async function openDiscord(addLog: (message: string) => void) {
  try {
    addLog("Attempting to launch Discord...");
    addLog("Please manually open Discord if it's not already running");
    
    // This would be the actual implementation once you have an API endpoint for it
    const response = await fetch('/api/open-discord', {
      method: 'POST'
    });
    const data = await response.json();
    if (data.success) {
      addLog("Discord launch request sent successfully");
    } else {
      addLog(`Error launching Discord: ${data.error}`);
    }
  } 
  catch (error) {
    addLog(`Error launching Discord: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}