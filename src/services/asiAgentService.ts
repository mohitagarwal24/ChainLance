/**
 * ChainLance ASI Agent Service
 * Integrates with Python ASI agents for work verification
 * Handles job data submission and consensus-based payment release
 */

import { EventEmitter } from 'events';

export interface JobData {
  job_id: number;
  title: string;
  description: string;
  category: string;
  budget: number;
  skills_required: string[];
  deadline: string;
  client_address: string;
}

export interface DeliverableData {
  contract_id: number;
  milestone_index: number;
  deliverable_url: string;
  deliverable_type: 'github' | 'ipfs' | 'url' | 'file';
  description: string;
  submitted_at: string;
  freelancer_address: string;
}

export interface VerificationResult {
  agent_address: string;
  request_id: string;
  approved: boolean;
  confidence_score: number;
  analysis: {
    overall_score: number;
    category_scores: Record<string, number>;
    analysis_method: string;
    specialization_match: number;
  };
  issues_found: string[];
  recommendations: string[];
  timestamp: string;
}

export interface ConsensusResult {
  request_id: string;
  approved: boolean;
  approval_rate: number;
  confidence_score: number;
  agent_count: number;
  results: VerificationResult[];
  payment_released: boolean;
  timestamp: string;
}

export interface AgentStatus {
  address: string;
  name: string;
  specialization: string[];
  reputation_score: number;
  success_rate: number;
  response_time: number;
  last_active: string;
  verification_count: number;
  status: 'active' | 'inactive' | 'busy';
}

export class ASIAgentService extends EventEmitter {
  private coordinatorUrl: string;
  private verificationRequests: Map<string, any> = new Map();
  private agentStatuses: Map<string, AgentStatus> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.coordinatorUrl = process.env.REACT_APP_ASI_COORDINATOR_URL || 'http://localhost:8080';
    this.startStatusPolling();
  }

  /**
   * Submit work for ASI agent verification
   */
  async submitForVerification(jobData: JobData, deliverableData: DeliverableData): Promise<string> {
    try {
      console.log('🤖 Submitting work for ASI verification...');
      
      const response = await fetch(`${this.coordinatorUrl}/submit_verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_data: jobData,
          deliverable_data: deliverableData,
        }),
      });

      if (!response.ok) {
        throw new Error(`ASI submission failed: ${response.statusText}`);
      }

      const result = await response.json();
      const requestId = result.request_id;

      console.log(`✅ ASI verification request submitted: ${requestId}`);
      
      // Store request for tracking
      this.verificationRequests.set(requestId, {
        jobData,
        deliverableData,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      });

      // Emit event
      this.emit('verification_submitted', { requestId, jobData, deliverableData });

      // Start polling for results
      this.pollVerificationStatus(requestId);

      return requestId;

    } catch (error) {
      console.error('❌ Error submitting to ASI agents:', error);
      throw error;
    }
  }

  /**
   * Get verification status for a request
   */
  async getVerificationStatus(requestId: string): Promise<any> {
    try {
      const response = await fetch(`${this.coordinatorUrl}/verification_status/${requestId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get verification status: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting verification status:', error);
      throw error;
    }
  }

  /**
   * Get list of active ASI agents
   */
  async getActiveAgents(): Promise<AgentStatus[]> {
    try {
      const response = await fetch(`${this.coordinatorUrl}/active_agents`);
      
      if (!response.ok) {
        throw new Error(`Failed to get active agents: ${response.statusText}`);
      }

      const agents = await response.json();
      
      // Update local agent status cache
      agents.forEach((agent: AgentStatus) => {
        this.agentStatuses.set(agent.address, agent);
      });

      return agents;

    } catch (error) {
      console.error('Error getting active agents:', error);
      return [];
    }
  }

  /**
   * Get agent network statistics
   */
  async getNetworkStats(): Promise<any> {
    try {
      const response = await fetch(`${this.coordinatorUrl}/network_stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to get network stats: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Error getting network stats:', error);
      return {
        total_agents: 0,
        active_agents: 0,
        total_verifications: 0,
        success_rate: 0,
      };
    }
  }

  /**
   * Poll verification status until completion
   */
  private async pollVerificationStatus(requestId: string) {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const status = await this.getVerificationStatus(requestId);

        if (status.completed) {
          // Verification completed
          console.log(`🎉 ASI verification completed for ${requestId}:`, status);
          
          const consensusResult: ConsensusResult = {
            request_id: requestId,
            approved: status.approved,
            approval_rate: status.approval_rate,
            confidence_score: status.confidence_score,
            agent_count: status.agent_count,
            results: status.results,
            payment_released: status.payment_released,
            timestamp: new Date().toISOString(),
          };

          // Update request status
          if (this.verificationRequests.has(requestId)) {
            const request = this.verificationRequests.get(requestId);
            request.status = 'completed';
            request.result = consensusResult;
          }

          // Emit completion event
          this.emit('verification_completed', consensusResult);

          if (status.approved && status.payment_released) {
            this.emit('payment_released', {
              requestId,
              contractId: this.verificationRequests.get(requestId)?.deliverableData.contract_id,
              amount: status.payment_amount,
              percentage: 20, // 20% initial release
            });
          }

          return;
        }

        // Continue polling if not completed and within limits
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          console.warn(`⏰ Verification polling timeout for ${requestId}`);
          this.emit('verification_timeout', { requestId });
        }

      } catch (error) {
        console.error(`Error polling verification status for ${requestId}:`, error);
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Retry in 10 seconds on error
        } else {
          this.emit('verification_error', { requestId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    };

    // Start polling
    setTimeout(poll, 5000); // Initial delay of 5 seconds
  }

  /**
   * Start polling for agent status updates
   */
  private startStatusPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        await this.getActiveAgents();
        const stats = await this.getNetworkStats();
        this.emit('network_status_update', { agents: Array.from(this.agentStatuses.values()), stats });
      } catch (error) {
        console.error('Error updating agent status:', error);
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * Stop the service and cleanup
   */
  destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.removeAllListeners();
  }

  /**
   * Get cached agent statuses
   */
  getCachedAgentStatuses(): AgentStatus[] {
    return Array.from(this.agentStatuses.values());
  }

  /**
   * Get verification request history
   */
  getVerificationHistory(): any[] {
    return Array.from(this.verificationRequests.entries()).map(([requestId, request]) => ({
      requestId,
      ...request,
    }));
  }

  /**
   * Mock implementation for development/testing
   */
  private async mockVerification(jobData: JobData, deliverableData: DeliverableData): Promise<string> {
    const requestId = `mock_${Date.now()}`;
    
    console.log('🧪 Using mock ASI verification for development');

    // Store mock request
    this.verificationRequests.set(requestId, {
      jobData,
      deliverableData,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    });

    // Simulate async verification process
    setTimeout(() => {
      const mockResult: ConsensusResult = {
        request_id: requestId,
        approved: Math.random() > 0.3, // 70% approval rate
        approval_rate: 0.67,
        confidence_score: 0.85,
        agent_count: 3,
        results: [
          {
            agent_address: 'mock_agent_1',
            request_id: requestId,
            approved: true,
            confidence_score: 0.9,
            analysis: {
              overall_score: 0.85,
              category_scores: { quality: 0.8, completeness: 0.9 },
              analysis_method: 'mock_analysis',
              specialization_match: 0.95,
            },
            issues_found: [],
            recommendations: ['Great work!'],
            timestamp: new Date().toISOString(),
          },
        ],
        payment_released: true,
        timestamp: new Date().toISOString(),
      };

      this.emit('verification_completed', mockResult);
      
      if (mockResult.approved) {
        this.emit('payment_released', {
          requestId,
          contractId: deliverableData.contract_id,
          amount: jobData.budget * 0.2,
          percentage: 20,
        });
      }
    }, 10000); // 10 second delay for mock

    return requestId;
  }

  /**
   * Check if ASI coordinator is available
   */
  async checkCoordinatorHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.coordinatorUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const asiAgentService = new ASIAgentService();
