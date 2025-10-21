import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { Bot, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface ASIAgentStatusProps {
  className?: string;
}

export const ASIAgentStatus: React.FC<ASIAgentStatusProps> = ({ className = '' }) => {
  const { contracts, isInitialized } = useWeb3();
  const [agentStatus, setAgentStatus] = useState({
    verifier: { connected: false, active: false, lastCheck: null as Date | null },
    oracle: { connected: false, active: false, lastCheck: null as Date | null }
  });
  const [loading, setLoading] = useState(false);

  const checkAgentStatus = async () => {
    if (!isInitialized || !contracts.asiAgentVerifier || !contracts.asiAgentOracle) {
      return;
    }

    setLoading(true);
    try {
      // Check ASI Agent Verifier status by getting active agents
      const activeVerifierAgents = await contracts.asiAgentVerifier.getActiveAgents();
      const verifierActive = activeVerifierAgents.length > 0;
      
      // Check ASI Agent Oracle status - assume active if contract is deployed
      const oracleActive = true; // Oracle is active if contract exists

      setAgentStatus({
        verifier: {
          connected: true,
          active: verifierActive,
          lastCheck: new Date()
        },
        oracle: {
          connected: true,
          active: oracleActive,
          lastCheck: new Date()
        }
      });
    } catch (error) {
      console.error('Error checking ASI agent status:', error);
      setAgentStatus({
        verifier: { connected: false, active: false, lastCheck: new Date() },
        oracle: { connected: false, active: false, lastCheck: new Date() }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      checkAgentStatus();
      // Check status every 30 seconds
      const interval = setInterval(checkAgentStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isInitialized]);

  const getStatusIcon = (connected: boolean, active: boolean) => {
    if (!connected) return <XCircle className="w-4 h-4 text-red-500" />;
    if (active) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  };

  const getStatusText = (connected: boolean, active: boolean) => {
    if (!connected) return 'Disconnected';
    if (active) return 'Active';
    return 'Connected but Inactive';
  };

  if (!isInitialized) {
    return (
      <div className={`card p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <Bot className="w-5 h-5" />
          <span>ASI Agents - Initializing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">ASI Agent Network</h3>
        </div>
        <button
          onClick={checkAgentStatus}
          disabled={loading}
          className="btn-secondary px-3 py-1 text-sm"
        >
          {loading ? <Clock className="w-4 h-4 animate-spin" /> : 'Refresh'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
          <div className="flex items-center gap-2">
            {getStatusIcon(agentStatus.verifier.connected, agentStatus.verifier.active)}
            <span className="text-sm text-gray-300">Verifier Agent</span>
          </div>
          <span className="text-xs text-gray-400">
            {getStatusText(agentStatus.verifier.connected, agentStatus.verifier.active)}
          </span>
        </div>

        <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
          <div className="flex items-center gap-2">
            {getStatusIcon(agentStatus.oracle.connected, agentStatus.oracle.active)}
            <span className="text-sm text-gray-300">Oracle Agent</span>
          </div>
          <span className="text-xs text-gray-400">
            {getStatusText(agentStatus.oracle.connected, agentStatus.oracle.active)}
          </span>
        </div>
      </div>

      {agentStatus.verifier.lastCheck && (
        <div className="mt-2 text-xs text-gray-500">
          Last checked: {agentStatus.verifier.lastCheck.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};
