"""
ChainLance ASI Agent HTTP Bridge
Provides REST API endpoints for frontend integration with ASI agents
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import os
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import requests
from uagents import Agent
from uagents.setup import fund_agent_if_low

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for API
class JobDataModel(BaseModel):
    job_id: int
    title: str
    description: str
    category: str
    budget: float
    skills_required: List[str]
    deadline: str
    client_address: str

class DeliverableDataModel(BaseModel):
    contract_id: int
    milestone_index: int
    deliverable_url: str
    deliverable_type: str
    description: str
    submitted_at: str
    freelancer_address: str

class VerificationRequestModel(BaseModel):
    job_data: JobDataModel
    deliverable_data: DeliverableDataModel

class VerificationStatusResponse(BaseModel):
    request_id: str
    status: str
    completed: bool
    approved: Optional[bool] = None
    approval_rate: Optional[float] = None
    confidence_score: Optional[float] = None
    agent_count: Optional[int] = None
    results: Optional[List[Dict[str, Any]]] = None
    payment_released: Optional[bool] = None
    timestamp: str

class AgentStatusModel(BaseModel):
    address: str
    name: str
    specialization: List[str]
    reputation_score: float
    success_rate: float
    response_time: float
    last_active: str
    verification_count: int
    status: str

class NetworkStatsModel(BaseModel):
    total_agents: int
    active_agents: int
    total_verifications: int
    success_rate: float
    average_response_time: float

# FastAPI app
app = FastAPI(
    title="ChainLance ASI Agent Bridge",
    description="HTTP bridge for ASI agent integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ASIAgentBridge:
    """HTTP bridge for ASI agent communication"""
    
    def __init__(self):
        self.coordinator_address = os.getenv("COORDINATOR_AGENT_ADDRESS", "agent1qw8kz5f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8")
        self.verification_requests: Dict[str, Dict[str, Any]] = {}
        self.agent_statuses: Dict[str, AgentStatusModel] = {}
        self.network_stats = NetworkStatsModel(
            total_agents=0,
            active_agents=0,
            total_verifications=0,
            success_rate=0.0,
            average_response_time=0.0
        )
        
        # Mock data for development
        self._initialize_mock_data()
    
    def _initialize_mock_data(self):
        """Initialize mock data for development"""
        mock_agents = [
            AgentStatusModel(
                address="agent1qcode123...",
                name="chainlance_code_reviewer",
                specialization=["code_review", "web_development", "blockchain"],
                reputation_score=0.92,
                success_rate=0.88,
                response_time=1500.0,
                last_active=datetime.now().isoformat(),
                verification_count=45,
                status="active"
            ),
            AgentStatusModel(
                address="agent1qqual456...",
                name="chainlance_quality_analyst",
                specialization=["quality_analysis", "testing", "performance"],
                reputation_score=0.89,
                success_rate=0.91,
                response_time=2100.0,
                last_active=datetime.now().isoformat(),
                verification_count=38,
                status="active"
            ),
            AgentStatusModel(
                address="agent1qreq789...",
                name="chainlance_requirements_validator",
                specialization=["requirement_validation", "business_analysis"],
                reputation_score=0.85,
                success_rate=0.87,
                response_time=1800.0,
                last_active=datetime.now().isoformat(),
                verification_count=52,
                status="active"
            )
        ]
        
        for agent in mock_agents:
            self.agent_statuses[agent.address] = agent
        
        self.network_stats = NetworkStatsModel(
            total_agents=len(mock_agents),
            active_agents=len([a for a in mock_agents if a.status == "active"]),
            total_verifications=135,
            success_rate=0.89,
            average_response_time=1800.0
        )
    
    async def submit_verification_request(self, request: VerificationRequestModel) -> str:
        """Submit verification request to ASI agents"""
        request_id = f"verify_{request.deliverable_data.contract_id}_{request.deliverable_data.milestone_index}_{int(datetime.now().timestamp())}"
        
        logger.info(f"Submitting verification request: {request_id}")
        
        # Store request
        self.verification_requests[request_id] = {
            "request_id": request_id,
            "job_data": request.job_data.dict(),
            "deliverable_data": request.deliverable_data.dict(),
            "status": "pending",
            "submitted_at": datetime.now().isoformat(),
            "agent_responses": [],
            "completed": False
        }
        
        # In a real implementation, this would send the request to the coordinator agent
        # For now, we'll simulate the process
        asyncio.create_task(self._simulate_verification_process(request_id))
        
        return request_id
    
    async def _simulate_verification_process(self, request_id: str):
        """Simulate ASI agent verification process"""
        try:
            # Simulate agent analysis time (10-30 seconds)
            await asyncio.sleep(15)
            
            request_data = self.verification_requests[request_id]
            
            # Simulate agent responses
            mock_results = []
            agents = list(self.agent_statuses.values())[:3]  # Select 3 agents
            
            for i, agent in enumerate(agents):
                # Simulate different approval rates based on agent specialization
                approval_probability = 0.8 if "code_review" in agent.specialization else 0.75
                approved = __import__('random').random() < approval_probability
                
                confidence = __import__('random').uniform(0.7, 0.95) if approved else __import__('random').uniform(0.3, 0.6)
                
                result = {
                    "agent_address": agent.address,
                    "request_id": request_id,
                    "approved": approved,
                    "confidence_score": confidence,
                    "analysis": {
                        "overall_score": confidence,
                        "category_scores": {
                            "quality": __import__('random').uniform(0.6, 0.9),
                            "completeness": __import__('random').uniform(0.7, 0.95),
                            "functionality": __import__('random').uniform(0.65, 0.9)
                        },
                        "analysis_method": f"{agent.name}_analysis",
                        "specialization_match": 0.9
                    },
                    "issues_found": [] if approved else ["Minor improvements needed"],
                    "recommendations": ["Good work!" if approved else "Address identified issues"],
                    "timestamp": datetime.now().isoformat()
                }
                
                mock_results.append(result)
                request_data["agent_responses"].append(result)
            
            # Calculate consensus
            approved_count = sum(1 for r in mock_results if r["approved"])
            total_count = len(mock_results)
            approval_rate = approved_count / total_count
            
            avg_confidence = sum(r["confidence_score"] for r in mock_results if r["approved"]) / max(approved_count, 1)
            
            # Determine final approval (66% consensus threshold)
            final_approved = approval_rate >= 0.66 and avg_confidence >= 0.7
            
            # Update request status
            request_data.update({
                "completed": True,
                "approved": final_approved,
                "approval_rate": approval_rate,
                "confidence_score": avg_confidence,
                "agent_count": total_count,
                "results": mock_results,
                "payment_released": final_approved,  # 20% payment released if approved
                "completed_at": datetime.now().isoformat()
            })
            
            logger.info(f"Verification completed for {request_id}: approved={final_approved}, rate={approval_rate:.2%}")
            
        except Exception as e:
            logger.error(f"Error in verification simulation: {e}")
            request_data.update({
                "completed": True,
                "approved": False,
                "error": str(e),
                "completed_at": datetime.now().isoformat()
            })
    
    def get_verification_status(self, request_id: str) -> VerificationStatusResponse:
        """Get verification status for a request"""
        if request_id not in self.verification_requests:
            raise HTTPException(status_code=404, message=f"Verification request {request_id} not found")
        
        request_data = self.verification_requests[request_id]
        
        return VerificationStatusResponse(
            request_id=request_id,
            status="completed" if request_data["completed"] else "pending",
            completed=request_data["completed"],
            approved=request_data.get("approved"),
            approval_rate=request_data.get("approval_rate"),
            confidence_score=request_data.get("confidence_score"),
            agent_count=request_data.get("agent_count"),
            results=request_data.get("results"),
            payment_released=request_data.get("payment_released"),
            timestamp=request_data.get("completed_at", request_data["submitted_at"])
        )
    
    def get_active_agents(self) -> List[AgentStatusModel]:
        """Get list of active ASI agents"""
        return list(self.agent_statuses.values())
    
    def get_network_stats(self) -> NetworkStatsModel:
        """Get network statistics"""
        # Update stats based on current data
        active_agents = [a for a in self.agent_statuses.values() if a.status == "active"]
        
        self.network_stats.active_agents = len(active_agents)
        self.network_stats.total_verifications = len(self.verification_requests)
        
        if self.verification_requests:
            completed_requests = [r for r in self.verification_requests.values() if r["completed"]]
            if completed_requests:
                approved_requests = [r for r in completed_requests if r.get("approved", False)]
                self.network_stats.success_rate = len(approved_requests) / len(completed_requests)
        
        return self.network_stats

# Global bridge instance
bridge = ASIAgentBridge()

# API endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/submit_verification")
async def submit_verification(request: VerificationRequestModel, background_tasks: BackgroundTasks):
    """Submit work for ASI agent verification"""
    try:
        request_id = await bridge.submit_verification_request(request)
        return {"request_id": request_id, "status": "submitted"}
    except Exception as e:
        logger.error(f"Error submitting verification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/verification_status/{request_id}")
async def get_verification_status(request_id: str):
    """Get verification status for a request"""
    try:
        return bridge.get_verification_status(request_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting verification status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/active_agents")
async def get_active_agents():
    """Get list of active ASI agents"""
    try:
        return bridge.get_active_agents()
    except Exception as e:
        logger.error(f"Error getting active agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/network_stats")
async def get_network_stats():
    """Get network statistics"""
    try:
        return bridge.get_network_stats()
    except Exception as e:
        logger.error(f"Error getting network stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/verification_history")
async def get_verification_history():
    """Get verification request history"""
    try:
        return list(bridge.verification_requests.values())
    except Exception as e:
        logger.error(f"Error getting verification history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Main execution
def main():
    """Start the HTTP bridge server"""
    port = int(os.getenv("HTTP_BRIDGE_PORT", "8080"))
    
    logger.info(f"Starting ChainLance ASI Agent HTTP Bridge on port {port}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )

if __name__ == "__main__":
    main()
