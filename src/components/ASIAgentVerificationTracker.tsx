import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, AlertCircle, Bot, RefreshCw } from 'lucide-react';

interface RealASIAgentStatus {
  request_id: string;
  status: string;
  completed: boolean;
  approved?: boolean;
  approval_rate?: number;
  confidence_score?: number;
  agent_count?: number;
  results?: Array<any>;
  payment_released?: boolean;
  timestamp: string;
}

interface ASIAgentVerificationTrackerProps {
  workId: string;
  isVisible: boolean;
  onVerificationComplete?: (approved: boolean, paymentReleased: boolean) => void;
}

export const ASIAgentVerificationTracker: React.FC<ASIAgentVerificationTrackerProps> = ({
  workId,
  isVisible,
  onVerificationComplete
}) => {
  const [asiStatus, setAsiStatus] = useState<RealASIAgentStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize the loadASIStatus function to prevent unnecessary re-renders
  const loadASIStatus = useCallback(() => {
    try {
      const existingSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
      const submission = existingSubmissions.find((sub: any) => 
        sub.submissionId === workId || sub.contractId.toString() === workId
      );

      if (submission) {
        const status: RealASIAgentStatus = {
          request_id: submission.submissionId || workId,
          status: submission.status || 'pending_asi_review',
          completed: submission.status === 'payment_released' || submission.status === 'asi_approved' || submission.status === 'asi_rejected',
          approved: submission.status === 'payment_released' || submission.status === 'asi_approved',
          approval_rate: submission.asiReviewResult?.approvalRate || 0,
          confidence_score: submission.asiReviewResult?.confidence || 0,
          agent_count: submission.asiReviewResult?.agentCount || 0,
          results: submission.asiReviewResult?.issues || [],
          payment_released: submission.paymentReleased || false,
          timestamp: submission.asiReviewCompleted || submission.asiReviewStarted || new Date().toISOString()
        };
        
        setAsiStatus(prevStatus => {
          // Only update if status actually changed to prevent unnecessary re-renders
          if (JSON.stringify(prevStatus) !== JSON.stringify(status)) {
            // If completed, notify parent
            if (status.completed && onVerificationComplete && 
                (!prevStatus || !prevStatus.completed)) {
              onVerificationComplete(status.approved || false, status.payment_released || false);
            }
            return status;
          }
          return prevStatus;
        });
      }
    } catch (error) {
      console.error('Error loading ASI status:', error);
      setError('Failed to load verification status');
    }
  }, [workId]); // Removed onVerificationComplete from dependencies

  useEffect(() => {
    if (!isVisible || !workId) return;

    // Load initial status
    loadASIStatus();

    // Poll for updates every 5 seconds if not completed
    const pollInterval = setInterval(() => {
      const currentSubmissions = JSON.parse(localStorage.getItem('asi_submissions') || '[]');
      const currentSubmission = currentSubmissions.find((sub: any) => 
        sub.submissionId === workId || sub.contractId.toString() === workId
      );
      
      // Only poll if submission exists and is not completed
      if (currentSubmission && 
          currentSubmission.status !== 'payment_released' && 
          currentSubmission.status !== 'asi_approved' && 
          currentSubmission.status !== 'asi_rejected') {
        setIsPolling(true);
        loadASIStatus();
        setTimeout(() => setIsPolling(false), 1000);
      }
    }, 5000);

    // Listen for real-time updates
    const handleStatusUpdate = (event: CustomEvent) => {
      if (event.detail.contractId.toString() === workId || event.detail.submissionId === workId) {
        loadASIStatus();
      }
    };

    window.addEventListener('submissionStatusUpdated', handleStatusUpdate as EventListener);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('submissionStatusUpdated', handleStatusUpdate as EventListener);
    };
  }, [isVisible, workId]); // Removed loadASIStatus from dependencies

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending_asi_review':
        return { text: 'Pending Review', color: 'text-gray-400', icon: <Clock className="w-5 h-5 text-gray-400" /> };
      case 'under_asi_review':
        return { text: 'Under Review', color: 'text-blue-400', icon: <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" /> };
      case 'asi_approved':
      case 'payment_released':
        return { text: 'Approved', color: 'text-green-400', icon: <CheckCircle className="w-5 h-5 text-green-400" /> };
      case 'asi_rejected':
        return { text: 'Rejected', color: 'text-red-400', icon: <AlertCircle className="w-5 h-5 text-red-400" /> };
      default:
        return { text: 'Unknown', color: 'text-gray-400', icon: <Clock className="w-5 h-5 text-gray-400" /> };
    }
  };

  if (!isVisible) return null;

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center text-red-400">
          <AlertCircle className="w-6 h-6 mr-3" />
          <div>
            <h3 className="text-lg font-bold">ASI Agent Verification Error</h3>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!asiStatus) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center text-gray-400">
          <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
          <div>
            <h3 className="text-lg font-bold text-white">Loading ASI Agent Status...</h3>
            <p className="text-sm">Connecting to real ASI agents...</p>
          </div>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(asiStatus.status);

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Bot className="w-6 h-6 text-blue-400 mr-3" />
          <h2 className="text-xl font-bold text-white">ASI Agent Verification</h2>
          {isPolling && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin ml-2" />}
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          asiStatus.approved 
            ? 'bg-green-900 text-green-400' 
            : asiStatus.completed 
              ? 'bg-red-900 text-red-400'
              : 'bg-gray-700 text-gray-400'
        }`}>
          {statusDisplay.text}
        </div>
      </div>

      {/* ASI Agent Status */}
      <div className="space-y-4">
        <div className="border border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {statusDisplay.icon}
              <div className="ml-3">
                <div className="text-white font-medium">ASI Agent Network</div>
                <div className="text-gray-400 text-sm">
                  Connected to ASI agents on port 8080
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white text-sm">Request ID</div>
              <div className="text-gray-400 text-xs font-mono">
                {asiStatus.request_id.substring(0, 16)}...
              </div>
            </div>
          </div>

          {/* Status Details */}
          <div className="mt-4 pt-4 border-t border-gray-600">
            <div className="grid grid-cols-2 gap-4">
              {(asiStatus.agent_count ?? 0) > 0 && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Agents Consulted</div>
                  <div className="text-white text-lg font-bold">{asiStatus.agent_count ?? 0}</div>
                </div>
              )}
              {(asiStatus.confidence_score ?? 0) > 0 && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Confidence Score</div>
                  <div className="text-white text-lg font-bold">{Math.round((asiStatus.confidence_score ?? 0) * 100)}%</div>
                </div>
              )}
              {(asiStatus.approval_rate ?? 0) > 0 && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Approval Rate</div>
                  <div className="text-white text-lg font-bold">{Math.round((asiStatus.approval_rate ?? 0) * 100)}%</div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Last Updated</div>
                <div className="text-white text-sm">{new Date(asiStatus.timestamp).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Issues/Results */}
          {asiStatus.results && asiStatus.results.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-600">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Agent Feedback</div>
              <div className="space-y-2">
                {asiStatus.results.map((issue, index) => (
                  <div key={index} className="text-sm text-gray-300 bg-gray-700 rounded p-2">
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Status */}
      {asiStatus.approved && asiStatus.payment_released && (
        <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
          <div className="flex items-center text-green-400">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">✅ ASI Agents Approved - 20% Payment Released!</span>
          </div>
          <div className="text-green-300 text-sm mt-1">
            Real ASI agents have verified the work. Initial payment released to freelancer. 
            Awaiting client final approval for remaining 80%.
          </div>
        </div>
      )}
    </div>
  );
};
