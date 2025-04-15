// Custom hook for logging functionality
import { useState } from "react";
import { LogEntry } from "./types";

/**
 * Hook for managing logs in the chat automation component
 */
export function useLogging() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  /**
   * Adds a new log entry and keeps only the latest entries
   */
  const addLog = (message: string) => {
    const timeString = new Date().toLocaleTimeString();
    console.log(`[${timeString}] ${message}`);
    setLogs((prevLogs) => {
      const newLogs = [...prevLogs, { time: timeString, message }];
      return newLogs.slice(-10); // Keep only last 10 logs
    });
  };
  
  return { logs, addLog };
}