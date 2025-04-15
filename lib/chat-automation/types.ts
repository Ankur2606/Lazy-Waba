// Types and constants for chat automation feature

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface LogEntry {
  time: string;
  message: string;
}

export const APP_CONFIGS = {
  whatsapp: {
    inputBox: { x: 1300, y: 680 },
    sendButton: { x: 720, y: 680 },
  },
  discord: {
    inputBox: { x: 600, y: 650 },
    sendButton: { x: 670, y: 700 },
  },
};

export type AppType = keyof typeof APP_CONFIGS;
export type AIProvider = 'ollama' | 'nebius';
export type HealthStatus = 'healthy' | 'error' | 'loading';