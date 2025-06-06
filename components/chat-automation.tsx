"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, CheckCircle, AlertCircle, Minimize, Maximize, Settings } from "lucide-react";
import { LastOcrImage } from "./ready-to-use-examples/last-ocr-image";
import { useOllama } from "@/hooks/use-ollama";
import { useNebius } from "@/hooks/use-nebius";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { AppType, ChatMessage } from "@/lib/chat-automation/types"; 
import { sendChatResponse, openWhatsAppDesktop, openDiscord } from "@/lib/chat-automation/utils";
import { useLogging } from "@/lib/chat-automation/hooks";
import { useHealthMonitoring } from "@/lib/chat-automation/health";
import { setupWhatsAppMonitoring, setupDiscordMonitoring } from "@/lib/chat-automation/ocr-monitoring";
import { sendInitialGreeting, sendInitialDiscordGreeting } from "@/lib/chat-automation/greetings";
import { analyzeConversationChanges, analyzeDiscordConversation } from "@/lib/chat-automation/conversation-analysis";
import { generateAndSendAIResponse } from "@/lib/chat-automation/ai-responses";
import { monitorChat } from "@/lib/chat-automation/monitor";
import { WhatsAppMonitorResult } from "@/lib/whatsapp-ocr-monitor";
import { DiscordMonitorResult } from "@/lib/discord-ocr-monitor";

const ChatAutomation: React.FC = () => {
  const { logs, addLog } = useLogging();
  const { healthStatus, checkHealthStatus } = useHealthMonitoring();
  const { toast } = useToast();

  const [selectedApp, setSelectedApp] = useState<AppType>("whatsapp");

  const handleAppSelection = (app: AppType) => {
    setSelectedApp(app);
    if (app === "discord") {
      toast({
        title: "Discord Integration - Beta",
        description: "The Discord feature is in beta and may be unstable.",
        variant: "default",
        duration: 5000,
      });
    }
  };

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastMessage, setLastMessage] = useState("");
  const [lastOcrText, setLastOcrText] = useState("");
  const [previousOcrText, setPreviousOcrText] = useState("");
  const messageHistory = useRef<string[]>([]);
  const monitoringTimerRef = useRef<NodeJS.Timeout | null>(null);
  const monitoringRef = useRef(false);
  const processingMessageRef = useRef(false);
  const lastAIResponseRef = useRef<string>("");
  const initialGreetingSentRef = useRef<boolean>(false);
  const initialGreetingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [myUsername, setMyUsername] = useLocalStorage<string>("myUsername", "You");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const [aiProvider, setAiProvider] = useLocalStorage<"ollama" | "nebius">("aiProvider", "ollama");
  const [nebiusApiKey, setNebiusApiKey] = useLocalStorage<string>("nebiusApiKey", "");
  const [ollamaModel, setOllamaModel] = useLocalStorage<string>("ollamaModel", "qwen2.5");
  const [nebiusModel, setNebiusModel] = useLocalStorage<string>("nebiusModel", "meta-llama/Meta-Llama-3.1-70B-Instruct");
  const [isMinimized, setIsMinimized] = useLocalStorage<boolean>("chatAutoMinimized", false);
  const [isConfiguring, setIsConfiguring] = useLocalStorage<boolean>("isConfiguring", true);

  const ollama = useOllama({ model: ollamaModel });
  const nebius = useNebius({ model: nebiusModel, apiKey: nebiusApiKey });

  const [whatsappMonitor, setWhatsappMonitor] = useState<WhatsAppMonitorResult | null>(null);
  const [discordMonitor, setDiscordMonitor] = useState<DiscordMonitorResult | null>(null);

  useEffect(() => {
    if (nebiusApiKey && aiProvider === "nebius") {
      nebius.fetchAvailableModels();
    }
  }, [nebiusApiKey, aiProvider]);

  useEffect(() => {
    if (aiProvider === "ollama") {
      ollama.fetchAvailableModels();
    }
  }, [aiProvider]);

  const startMonitoring = () => {
    if (selectedApp === "whatsapp") {
      addLog("Opening WhatsApp Desktop...");
      openWhatsAppDesktop(addLog);
    } else if (selectedApp === "discord") {
      addLog("Opening Discord...");
      openDiscord(addLog);
    }
    
    addLog(`Starting monitoring for ${selectedApp} in 10 seconds...`);
    setIsMonitoring(true);
    monitoringRef.current = true;
    
    monitoringTimerRef.current = setTimeout(() => {
      addLog("Now beginning chat monitoring");
      if (selectedApp === "whatsapp") {
        startWhatsAppMonitoring();
      } else if (selectedApp === "discord") {
        startDiscordMonitoring();
      } else {
        handleMonitorChat();
      }
    }, 10000);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    monitoringRef.current = false;
    
    if (whatsappMonitor) {
      whatsappMonitor.stop();
      setWhatsappMonitor(null);
    }

    if (discordMonitor) {
      discordMonitor.stop();
      setDiscordMonitor(null);
    }
    
    if (monitoringTimerRef.current) {
      clearTimeout(monitoringTimerRef.current);
    }
    
    addLog(`Stopped monitoring ${selectedApp}`);
  };

  const startWhatsAppMonitoring = () => {
    setupWhatsAppMonitoring({
      setLastOcrText,
      setPreviousOcrText,
      setWhatsappMonitor,
      initialGreetingTimerRef,
      monitoringRef,
      initialGreetingSentRef,
      processingMessageRef,
      sendInitialGreeting: handleInitialGreeting,
      addLog,
      monitorChat: handleMonitorChat,
      analyzeConversationChanges: handleAnalyzeConversation
    });
  };

  const startDiscordMonitoring = () => {
    setupDiscordMonitoring({
      setLastOcrText,
      setPreviousOcrText,
      setDiscordMonitor,
      initialGreetingTimerRef,
      monitoringRef,
      initialGreetingSentRef,
      processingMessageRef,
      sendInitialDiscordGreeting: handleInitialDiscordGreeting,
      addLog,
      monitorChat: handleMonitorChat,
      analyzeDiscordConversation: handleAnalyzeDiscordConversation
    });
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  };

  const handleAnalyzeConversation = (currentText: string, prevText?: string) => {
    analyzeConversationChanges({
      currentText,
      previousText: prevText,
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
      generateAndSendResponse: handleGenerateAndSendResponse
    });
  };

  const handleAnalyzeDiscordConversation = (currentText: string, prevText: string | undefined, discordContext: { type?: string; username?: string; channelName?: string }) => {
    analyzeDiscordConversation({
      currentText,
      previousText: prevText,
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
      generateAndSendResponse: handleGenerateAndSendResponse
    });
  };

  const handleGenerateAndSendResponse = (message: string) => {
    generateAndSendAIResponse({
      message,
      lastOcrText,
      aiProvider,
      ollama,
      nebius,
      nebiusApiKey,
      lastAIResponseRef,
      addLog,
      setChatHistory: {
        get: () => chatHistory,
        set: setChatHistory
      },
      monitoringRef,
      sendChatResponse,
      selectedApp,
      myUsername,
      messageHistory,
      processingMessageRef
    });
  };

  const handleInitialGreeting = (ocrText: string) => {
    sendInitialGreeting({
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
    });
  };

  const handleInitialDiscordGreeting = (ocrText: string, discordContext: { type?: string; username?: string; channelName?: string }) => {
    sendInitialDiscordGreeting({
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
    });
  };

  const handleMonitorChat = () => {
    monitorChat({
      monitoringRef,
      processingMessageRef,
      monitoringTimerRef,
      addLog,
      analyzeConversationChanges: handleAnalyzeConversation
    });
  };

  useEffect(() => {
    return () => {
      if (monitoringTimerRef.current) {
        clearTimeout(monitoringTimerRef.current);
      }
    };
  }, []);

  if (isMinimized && !isConfiguring) {
    return (
      <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-md p-3 z-50 border border-gray-200 dark:border-gray-700 flex items-center space-x-2">
        <MessageSquare className="h-5 w-5 text-blue-500" />
        <div className="flex-1">
          <div className="text-sm font-medium">Chat Automation</div>
          <div className="text-xs text-gray-500">
            {isMonitoring ? `Active - ${selectedApp}` : "Inactive"}
          </div>
        </div>
        {isMonitoring && (
          <div className="animate-pulse">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => setIsMinimized(false)}>
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg shadow-md space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Chat Automation
        </h2>

        <div className="flex items-center gap-2">
          {!isConfiguring && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMinimized(true)}
              title="Minimize"
            >
              <Minimize className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsConfiguring(!isConfiguring)}
            title={isConfiguring ? "Done configuring" : "Configure"}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <div
            className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer"
            onClick={checkHealthStatus}
            title={
              healthStatus === "healthy"
                ? "Backend connection is healthy"
                : healthStatus === "error"
                ? "Connection issue with backend"
                : "Checking connection..."
            }
          >
            {healthStatus === "loading" ? (
              <Loader2 className="h-4 w-4 text-gray-500 animate-spin" />
            ) : healthStatus === "healthy" ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
      </div>

      {isConfiguring && (
        <div className="space-y-4 border-b pb-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">AI Provider</h3>
            <div className="flex gap-2">
              <Button
                variant={aiProvider === "ollama" ? "default" : "outline"}
                onClick={() => setAiProvider("ollama")}
                size="sm"
              >
                Ollama
              </Button>
              <Button
                variant={aiProvider === "nebius" ? "default" : "outline"}
                onClick={() => setAiProvider("nebius")}
                size="sm"
              >
                Nebius
              </Button>
            </div>
          </div>

          {aiProvider === "nebius" && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Nebius API Key</h3>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={nebiusApiKey}
                  onChange={(e) => setNebiusApiKey(e.target.value)}
                  placeholder="Enter API Key"
                  className="flex-1"
                />
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold mb-2">Select Model</h3>
            {aiProvider === "ollama" ? (
              <Select value={ollamaModel} onValueChange={setOllamaModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  {ollama.isLoadingModels ? (
                    <div className="p-2 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      <p className="text-xs mt-1">Loading models...</p>
                    </div>
                  ) : ollama.availableModels.length > 0 ? (
                    ollama.availableModels.map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-xs">
                      No models found. Make sure Ollama is running.
                    </div>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Select value={nebiusModel} onValueChange={setNebiusModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  {nebius.isLoadingModels ? (
                    <div className="p-2 text-center">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      <p className="text-xs mt-1">Loading models...</p>
                    </div>
                  ) : nebius.availableModels.length > 0 ? (
                    nebius.availableModels.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-center text-xs">
                      {nebiusApiKey ? "No models found" : "Enter API Key to load models"}
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Configure Chat Identity</h3>
            <div className="flex gap-2">
              <Input
                value={myUsername}
                onChange={(e) => setMyUsername(e.target.value)}
                placeholder="Your chat username"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter your username as it appears in the chat.
            </p>
          </div>

          <Button 
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => setIsConfiguring(false)}
          >
            Save Configuration
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">1. Select Application</h3>
          <div className="flex gap-2">
            <Button
              variant={selectedApp === "whatsapp" ? "default" : "outline"}
              onClick={() => handleAppSelection("whatsapp")}
              size="sm"
            >
              WhatsApp
            </Button>
            <Button
              variant={selectedApp === "discord" ? "default" : "outline"}
              onClick={() => handleAppSelection("discord")}
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
            You&apos;ll have 10 seconds to switch to your chat application
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
                    setLastOcrText(text);
                    handleAnalyzeConversation(text);
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 border-t pt-2 mt-4">
        <div className="flex justify-between">
          <h3 className="font-semibold mb-1">Requirements</h3>
          <p className="text-xs text-blue-500">
            Using: {aiProvider === "ollama" ? `Ollama (${ollamaModel})` : `Nebius (${nebiusModel})`}
          </p>
        </div>
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
