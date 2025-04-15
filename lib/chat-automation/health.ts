// Health monitoring hook
import { useState, useRef, useEffect } from "react";
import { HealthStatus } from "./types";

/**
 * Hook for monitoring the health of backend services
 */
export function useHealthMonitoring() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("loading");
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Checks the health status of the backend
   */
  const checkHealthStatus = async () => {
    console.log("Checking health status");
    try {
      const response = await fetch("http://localhost:3030/health");
      console.log("Health check response:", response.status);
      if (response.ok) {
        console.log("Health status: healthy");
        setHealthStatus("healthy");
      } else {
        console.log("Health status: error (response not ok)");
        setHealthStatus("error");
      }
    } catch (err) {
      console.error("Health check error:", err);
      setHealthStatus("error");
    }
  };

  // Start health check on mount and set up intervals
  useEffect(() => {
    console.log("Setting up health check timer");
    
    // Check immediately on load
    checkHealthStatus();

    // Set up periodic checking every 30 seconds
    healthCheckTimerRef.current = setInterval(() => {
      console.log("Running scheduled health check");
      checkHealthStatus();
    }, 30000);

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up health check timer");
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
      }
    };
  }, []);

  return { healthStatus, checkHealthStatus };
}