
import { useState, useCallback } from 'react';
import { AgentPlan, OperationTypeEnum } from '../types';
import { processUserCommandViaAgent } from '../services/agentService';

export interface AgentStateCallbacks {
  appendLog: (message: string, type: 'info' | 'error' | 'success' | 'debug' | 'agent_plan', nodeId?: string) => void;
  commitPlanToGraph: (plan: AgentPlan) => void;
  getAvailableNodeOperations: () => OperationTypeEnum[];
}

export const useAgentState = (callbacks: AgentStateCallbacks) => {
  const [isAgentProcessing, setIsAgentProcessing] = useState(false);
  const [currentAgentPlan, setCurrentAgentPlan] = useState<AgentPlan | null>(null);

  const { appendLog, commitPlanToGraph, getAvailableNodeOperations } = callbacks;

  const submitAgentCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    setIsAgentProcessing(true);
    setCurrentAgentPlan(null); // Clear previous plan
    appendLog(`Agent processing command: "${command}"`, 'info');

    // Client-side check for API key availability (via Vite's define)
    // process.env.GEMINI_API_KEY_AVAILABLE is a string "true" or "false"
    const apiKeyAvailableForClient = process.env.GEMINI_API_KEY_AVAILABLE === 'true';

    if (typeof window !== 'undefined' && !apiKeyAvailableForClient) {
        // This is a more direct check for the browser environment if the key wasn't even available at build time.
        // The AGENT_CLIENT_SIDE_CALL_FORBIDDEN error from agentService would also catch this if an attempt was made.
        appendLog("Agent functionality is disabled: API key not configured for client-side use (this is the intended secure behavior for browsers).", 'error');
        setIsAgentProcessing(false);
        return;
    }
    // If apiKeyAvailableForClient is true, it's a misconfiguration, agentService will prevent actual calls and log a warning.
    // The user might see a generic error below if agentService throws AGENT_CLIENT_SIDE_CALL_FORBIDDEN.

    try {
      const availableOps = getAvailableNodeOperations();
      // This call will only proceed if on server-side with a key, or throw.
      const plan = await processUserCommandViaAgent(command, availableOps);
      if (plan) {
        setCurrentAgentPlan(plan);
        appendLog(`Agent proposed plan:\n${plan.planSummary}`, 'agent_plan');
      } else {
        // This case should ideally not be reached if agentService throws errors for no-plan scenarios.
        appendLog("Agent did not return a plan or encountered an unexpected issue.", 'error');
      }
    } catch (error: any) {
      console.error("Agent processing error in useAgentState:", error);
      if (error.message.startsWith("AGENT_NOT_INITIALIZED")) {
        appendLog("Agent Error: The AI agent is not initialized on the server. Please ensure the GEMINI_API_KEY is correctly set in the server environment.", 'error');
      } else if (error.message === "AGENT_CLIENT_SIDE_CALL_FORBIDDEN") {
        // This error comes from agentService if processUserCommandViaAgent is somehow called client-side.
        appendLog("Agent Error: Direct AI calls from the browser are not permitted. This is a safeguard.", 'error');
      } else {
        appendLog(`Agent error: ${error.message}`, 'error');
      }
    } finally {
      setIsAgentProcessing(false);
    }
  }, [appendLog, getAvailableNodeOperations]);

  const confirmAgentPlan = useCallback(() => {
    if (currentAgentPlan) {
      try {
        commitPlanToGraph(currentAgentPlan);
        // appendLog for success/failure is handled by the commitPlanToGraph implementer
      } catch (error: any) {
        // This catch might be redundant if commitPlanToGraph already handles its own errors + logging
        console.error("Error committing agent plan (caught in useAgentState):", error);
        appendLog(`Error committing agent plan: ${error.message}`, 'error');
      } finally {
        setCurrentAgentPlan(null); // Clear plan after attempting commit
      }
    }
  }, [currentAgentPlan, commitPlanToGraph, appendLog]);

  const discardAgentPlan = useCallback(() => {
    setCurrentAgentPlan(null);
    appendLog("Agent plan discarded.", 'info');
  }, [appendLog]);

  return {
    isAgentProcessing,
    currentAgentPlan,
    submitAgentCommand,
    confirmAgentPlan,
    discardAgentPlan,
  };
};
