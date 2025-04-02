"use client";

/*
 * ChatBot Puppeteer: Your Digital Ventriloquist
 * 
 * Why respond to messages yourself when you can have an AI pretend to be you 
 * pretending to be interested in conversations?
 * 
 * A magical automation tool that monitors your chat apps, reads incoming messages,
 * and responds automatically while you nap, making your friends think you're attentive
 * when you're actually watching cat videos.
 * 
 * Technologies: React for showing off, TypeScript for pretending we know what we're doing,
 * OCR for reading what people said so you don't have to, Mouse automation that's basically
 * a digital ghost, Next.js because regular JS was too simple, Screenpipe API for teaching
 * your computer to use your computer, Promises that take longer to resolve than your
 * New Year's resolutions.
 */

import React, { useState, useRef, useEffect } from "react";
import { pipe } from "@screenpipe/browser";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";
import { LastOcrImage } from "./last-ocr-image";

// App coordinates configuration
const APP_CONFIGS = {
  whatsapp: {
    inputBox: { x: 650, y: 680 }, 
    sendButton: { x: 720, y: 680 }, 
  },
  discord: {
    inputBox: { x: 600, y: 700 }, 
    sendButton: { x: 670, y: 700 }, 
  }
};

const ChatAutomation: React.FC = () => {
  const [selectedApp, setSelectedApp] = useState<"whatsapp" | "discord">("whatsapp");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastMessage, setLastMessage] = useState("");
  const [lastOcrText, setLastOcrText] = useState("");
  const [logs, setLogs] = useState<{ time: string; message: string }[]>([]);
  const messageHistory = useRef<string[]>([]);
  const monitoringTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string) => {
    const timeString = new Date().toLocaleTimeString();
    console.log(`[${timeString}] ${message}`);
    setLogs((prevLogs) => {
      const newLogs = [...prevLogs, { time: timeString, message }];
      return newLogs.slice(-10); // Keep only last 10 logs
    });
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  };

  const startMonitoring = () => {
    addLog(`Starting monitoring for ${selectedApp} in 10 seconds...`);
    setIsMonitoring(true);
    
    // Wait 10 seconds before starting monitoring
    monitoringTimerRef.current = setTimeout(() => {
      addLog("Now beginning chat monitoring");
      monitorChat();
    }, 10000);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (monitoringTimerRef.current) {
      clearTimeout(monitoringTimerRef.current);
    }
    addLog(`Stopped monitoring ${selectedApp}`);
  };

  const detectNewMessages = (text: string) => {
    if (!text || text === lastOcrText) return;
    
    setLastOcrText(text);
    
    // Extract the last paragraph as the message
    const messageBlocks = text.split(/\n{2,}/);
    const lastBlock = messageBlocks[messageBlocks.length - 1].trim();

    if (lastBlock && lastBlock !== lastMessage && !messageHistory.current.includes(lastBlock)) {
      setLastMessage(lastBlock);
      messageHistory.current.push(lastBlock);
      addLog(`New message: "${lastBlock.substring(0, 30)}${lastBlock.length > 30 ? "..." : ""}"`);
      generateAndSendResponse(lastBlock);
    }
  };

  const generateAndSendResponse = async (message: string) => {
    try {
      addLog("Processing message for response");

      // Generate a simple response (placeholder for AI integration)
      const responses = [
        "I understand. Let me think about that.",
        "That's interesting! Can you tell me more?",
        "I see what you mean. Let me check something.",
        "That's a good point. I appreciate your perspective.",
        "Thanks for sharing. I'll look into it.",
      ];
      const response = responses[message.length % responses.length];
      
      addLog(`Response: "${response}"`);

      // Send the response if still monitoring
      if (isMonitoring) {
        await sendResponse(response);
        messageHistory.current.push(`AI: ${response}`);
      }
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const sendResponse = async (text: string) => {
    try {
      const config = APP_CONFIGS[selectedApp];
      addLog(`Sending response to ${selectedApp}`);

      // Move to input box and click
      await pipe.operator.pixel.moveMouse(config.inputBox.x, config.inputBox.y);
      await new Promise(resolve => setTimeout(resolve, 300));
      await pipe.operator.pixel.click("left");
      
      // Triple click to select all text
      await new Promise(resolve => setTimeout(resolve, 300));
      for (let i = 0; i < 3; i++) {
        await pipe.operator.pixel.click("left");
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Type response
      addLog("Typing response");
      const chunks = text.match(/.{1,15}|.+/g) || [];
      for (const chunk of chunks) {
        await pipe.operator.pixel.type(chunk);
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Click send button
      await new Promise(resolve => setTimeout(resolve, 500));
      await pipe.operator.pixel.moveMouse(config.sendButton.x, config.sendButton.y);
      await new Promise(resolve => setTimeout(resolve, 300));
      await pipe.operator.pixel.click("left");

      addLog("Response sent successfully");
    } catch (err) {
      addLog(`Error sending: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const monitorChat = async () => {
    if (!isMonitoring) return;

    addLog("Getting OCR data...");

    try {
      // Get OCR data
      const result = await pipe.queryScreenpipe({
        contentType: "ocr",
        limit: 1,
      });
      
      if (result?.data?.length > 0) {
        const text = result.data[0].content?.text;
        if (text) {
          addLog(`OCR text captured (${text.length} chars)`);
          detectNewMessages(text);
        } else {
          addLog("No text content in OCR data");
        }
      } else {
        addLog("No OCR data available");
      }
    } catch (err) {
      addLog(`OCR error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    // Continue monitoring loop
    monitoringTimerRef.current = setTimeout(() => {
      if (isMonitoring) monitorChat();
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (monitoringTimerRef.current) {
        clearTimeout(monitoringTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="p-4 border rounded-lg shadow-md space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Chat Automation
      </h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">1. Select Application</h3>
          <div className="flex gap-2">
            <Button
              variant={selectedApp === "whatsapp" ? "default" : "outline"}
              onClick={() => setSelectedApp("whatsapp")}
              size="sm"
            >
              WhatsApp
            </Button>
            <Button
              variant={selectedApp === "discord" ? "default" : "outline"}
              onClick={() => setSelectedApp("discord")}
              size="sm"
            >
              Discord
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">2. Start Monitoring</h3>
          <Button
            onClick={toggleMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            className="w-full"
          >
            {isMonitoring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Stop Monitoring
              </>
            ) : (
              "Start Monitoring"
            )}
          </Button>
          <div className="text-xs text-gray-500 mt-1">
            You'll have 10 seconds to switch to your chat application
          </div>
        </div>

        {lastMessage && (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Last Detected Message</h3>
            <div className="text-xs p-2 bg-gray-50 rounded max-h-20 overflow-y-auto">
              {lastMessage}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Workflow Logs</h3>
          <div className="text-xs p-2 bg-gray-50 rounded max-h-40 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-400 italic">No logs yet</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="mb-1">
                  <span className="text-gray-500">[{log.time}]</span>{" "}
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-xs border-t pt-2 text-gray-500">
          <h3 className="font-semibold text-gray-700">Manual OCR</h3>
          <p className="mb-2">Capture current screen manually</p>
          <div className="bg-gray-50 p-2 rounded">
            <LastOcrImage 
              onDataChange={(data, error) => {
                if (error) {
                  addLog(`Manual OCR Error: ${error}`);
                  return;
                }
                
                if (data?.data?.length > 0) {
                  const text = data.data[0].content?.text;
                  if (text) {
                    addLog(`Manual OCR successful: ${text.length} chars`);
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 border-t pt-2 mt-4">
        <h3 className="font-semibold mb-1">Requirements</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Requires fixed window positioning</li>
          <li>Windows screen scaling must be 100%</li>
          <li>Application must be visible on screen</li>
        </ul>
      </div>
    </div>
  );
};

export default ChatAutomation;