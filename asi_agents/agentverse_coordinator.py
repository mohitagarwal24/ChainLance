#!/usr/bin/env python3
"""
ChainLance Agentverse Coordinator
Discovers and coordinates agents using Fetch.ai Agentverse API
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional

from uagents import Agent, Context, Protocol, Model
from uagents.setup import fund_agent_if_low
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JobVerificationRequest(Model):
    """Model for job verification requests from HTTP bridge"""
    request_id: str
    job_data: Dict[str, Any]
    deliverable_data: Dict[str, Any]

class AgentVerificationResult(Model):
    """Model for individual agent verification results"""
    request_id: str
    agent_address: str
    approved: bool
    confidence_score: float
    analysis: Dict[str, Any]
    issues_found: List[str]
    recommendations: List[str]
    timestamp: str

class ConsensusResult(Model):
    """Model for final consensus result"""
    request_id: str
    approved: bool
    approval_rate: float
    confidence_score: float
    agent_count: int
    results: List[Dict[str, Any]]
    payment_released: bool
    timestamp: str

class AgentverseCoordinator:
    """Coordinator that discovers and manages agents via Agentverse"""
    
    def __init__(self, port: int = 8000):
        self.port = port
        self.agentverse_token = os.getenv("AGENTVERSE_TOKEN")
        self.agentverse_url = "https://agentverse.ai/v1"
        
        # Create coordinator agent
        self.agent = Agent(
            name="chainlance_coordinator",
            port=port,
            seed="chainlance_coordinator_seed",
            endpoint=[f"http://localhost:{port}/submit"]
        )
        
        # Fund agent if needed
        fund_agent_if_low(self.agent.wallet.address())
        
        # Storage for active verifications
        self.active_verifications: Dict[str, Dict] = {}
        self.discovered_agents: List[Dict] = []
        
        # Create protocols
        self.verification_protocol = Protocol("ChainLanceCoordination")
        self._register_handlers()
        
        logger.info(f"🤖 Coordinator created with address: {self.agent.address}")
    
    def _register_handlers(self):
        """Register protocol handlers"""
        
        @self.verification_protocol.on_message(model=JobVerificationRequest)
        async def handle_verification_request(ctx: Context, sender: str, msg: JobVerificationRequest):
            """Handle verification requests from HTTP bridge"""
            logger.info(f"📥 Received verification request: {msg.request_id}")
            
            try:
                # Discover best agents for this job
                agents = await self._discover_agents(msg.job_data)
                
                if not agents:
                    logger.warning("No suitable agents found, using local agents")
                    agents = self._get_local_agents()
                
                # Start verification process
                await self._coordinate_verification(ctx, msg, agents)
                
            except Exception as e:
                logger.error(f"❌ Error coordinating verification: {e}")
        
        @self.verification_protocol.on_message(model=AgentVerificationResult)
        async def handle_agent_result(ctx: Context, sender: str, msg: AgentVerificationResult):
            """Handle results from individual agents"""
            logger.info(f"📥 Received result from agent: {msg.agent_address}")
            
            try:
                await self._process_agent_result(ctx, msg)
            except Exception as e:
                logger.error(f"❌ Error processing agent result: {e}")
        
        # Include protocol in agent
        self.agent.include(self.verification_protocol)
    
    async def _discover_agents(self, job_data: Dict[str, Any]) -> List[Dict]:
        """Discover suitable agents from Agentverse"""
        logger.info("🔍 Discovering agents from Agentverse...")
        
        try:
            # Create search query based on job data
            search_text = self._create_search_query(job_data)
            
            # Search Agentverse
            search_payload = {
                "filters": {
                    "state": ["active"],
                    "category": ["verification", "analysis", "chainlance"],
                    "agent_type": [],
                    "protocol_digest": []
                },
                "sort": "relevancy",
                "direction": "desc",
                "search_text": search_text,
                "offset": 0,
                "limit": 10
            }
            
            headers = {}
            if self.agentverse_token:
                headers["Authorization"] = f"Bearer {self.agentverse_token}"
            
            response = requests.post(
                f"{self.agentverse_url}/search",
                json=search_payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                agents = response.json()
                logger.info(f"✅ Found {len(agents)} agents from Agentverse")
                
                # Filter and rank agents
                suitable_agents = self._filter_agents(agents, job_data)
                return suitable_agents[:3]  # Return top 3 agents
            else:
                logger.warning(f"Agentverse search failed: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error discovering agents: {e}")
            return []
    
    def _create_search_query(self, job_data: Dict[str, Any]) -> str:
        """Create search query for Agentverse based on job data"""
        category = job_data.get('category', '').lower()
        skills = job_data.get('skills_required', [])
        
        # Map job categories to search terms
        search_terms = []
        
        if 'web' in category or 'frontend' in category:
            search_terms.extend(['web development', 'frontend', 'react', 'javascript'])
        elif 'mobile' in category:
            search_terms.extend(['mobile development', 'app development', 'ios', 'android'])
        elif 'blockchain' in category or 'smart contract' in category:
            search_terms.extend(['blockchain', 'smart contract', 'solidity', 'web3'])
        elif 'ai' in category or 'ml' in category:
            search_terms.extend(['artificial intelligence', 'machine learning', 'ai'])
        elif 'design' in category:
            search_terms.extend(['design', 'ui', 'ux', 'graphics'])
        else:
            search_terms.extend(['code review', 'quality analysis', 'verification'])
        
        # Add skills
        search_terms.extend(skills)
        
        # Add general verification terms
        search_terms.extend(['verification', 'analysis', 'review', 'chainlance'])
        
        return ' '.join(search_terms[:10])  # Limit search terms
    
    def _filter_agents(self, agents: List[Dict], job_data: Dict[str, Any]) -> List[Dict]:
        """Filter and rank agents based on job requirements"""
        suitable_agents = []
        
        for agent in agents:
            # Check agent status
            if agent.get('status') != 'active':
                continue
            
            # Check interaction count (prefer active agents)
            if agent.get('recent_interactions', 0) < 10:
                continue
            
            # Calculate relevance score
            relevance_score = self._calculate_agent_relevance(agent, job_data)
            
            if relevance_score > 0.3:  # Minimum relevance threshold
                agent['relevance_score'] = relevance_score
                suitable_agents.append(agent)
        
        # Sort by relevance score
        suitable_agents.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        logger.info(f"✅ Filtered to {len(suitable_agents)} suitable agents")
        return suitable_agents
    
    def _calculate_agent_relevance(self, agent: Dict, job_data: Dict) -> float:
        """Calculate how relevant an agent is for the job"""
        score = 0.0
        
        # Check name and readme for relevant keywords
        text_to_check = f"{agent.get('name', '')} {agent.get('readme', '')}".lower()
        
        category = job_data.get('category', '').lower()
        skills = [skill.lower() for skill in job_data.get('skills_required', [])]
        
        # Category matching
        if category in text_to_check:
            score += 0.3
        
        # Skills matching
        for skill in skills:
            if skill in text_to_check:
                score += 0.2
        
        # General verification terms
        verification_terms = ['verification', 'review', 'analysis', 'quality', 'chainlance']
        for term in verification_terms:
            if term in text_to_check:
                score += 0.1
        
        # Bonus for high activity
        interactions = agent.get('recent_interactions', 0)
        if interactions > 100:
            score += 0.2
        elif interactions > 50:
            score += 0.1
        
        # Bonus for featured agents
        if agent.get('featured'):
            score += 0.1
        
        return min(score, 1.0)  # Cap at 1.0
    
    def _get_local_agents(self) -> List[Dict]:
        """Get local agents as fallback"""
        return [
            {
                "address": "local_code_reviewer",
                "name": "ChainLance Code Reviewer",
                "type": "code_reviewer",
                "relevance_score": 0.8
            },
            {
                "address": "local_quality_analyst", 
                "name": "ChainLance Quality Analyst",
                "type": "quality_analyst",
                "relevance_score": 0.8
            },
            {
                "address": "local_requirements_validator",
                "name": "ChainLance Requirements Validator", 
                "type": "requirements_validator",
                "relevance_score": 0.8
            }
        ]
    
    async def _coordinate_verification(self, ctx: Context, request: JobVerificationRequest, agents: List[Dict]):
        """Coordinate verification across multiple agents"""
        logger.info(f"🤖 Coordinating verification with {len(agents)} agents")
        
        # Store verification request
        self.active_verifications[request.request_id] = {
            "request": request,
            "agents": agents,
            "results": [],
            "started_at": datetime.now().isoformat(),
            "status": "in_progress"
        }
        
        # Send verification requests to agents
        for agent in agents:
            try:
                # Create verification message for agent
                agent_request = {
                    "request_id": request.request_id,
                    "job_data": request.job_data,
                    "deliverable_data": request.deliverable_data,
                    "agent_type": agent.get("type", "general")
                }
                
                # For local agents, we would send via uAgent protocol
                # For Agentverse agents, we would use their API
                if agent["address"].startswith("local_"):
                    # Send to local agent (would need agent addresses)
                    logger.info(f"Would send to local agent: {agent['name']}")
                else:
                    # Send to Agentverse agent
                    logger.info(f"Would send to Agentverse agent: {agent['name']}")
                
                # For demo, simulate agent response
                await self._simulate_agent_response(request.request_id, agent)
                
            except Exception as e:
                logger.error(f"Error sending to agent {agent['name']}: {e}")
    
    async def _simulate_agent_response(self, request_id: str, agent: Dict):
        """Simulate agent response for demo purposes"""
        await asyncio.sleep(2)  # Simulate processing time
        
        # Create mock result
        import random
        approved = random.random() > 0.3  # 70% approval rate
        confidence = random.uniform(0.6, 0.95) if approved else random.uniform(0.2, 0.6)
        
        result = AgentVerificationResult(
            request_id=request_id,
            agent_address=agent["address"],
            approved=approved,
            confidence_score=confidence,
            analysis={
                "agent_type": agent.get("type", "general"),
                "specialization_match": agent.get("relevance_score", 0.5),
                "detailed_analysis": f"Analysis by {agent['name']}"
            },
            issues_found=[] if approved else ["Minor improvements needed"],
            recommendations=["Good work!"] if approved else ["Address identified issues"],
            timestamp=datetime.now().isoformat()
        )
        
        # Process the result
        await self._process_agent_result(None, result)
    
    async def _process_agent_result(self, ctx: Optional[Context], result: AgentVerificationResult):
        """Process result from an individual agent"""
        request_id = result.request_id
        
        if request_id not in self.active_verifications:
            logger.warning(f"Unknown verification request: {request_id}")
            return
        
        verification = self.active_verifications[request_id]
        verification["results"].append(result.dict())
        
        logger.info(f"📊 Agent result: {result.approved} (confidence: {result.confidence_score:.2f})")
        
        # Check if we have all results
        expected_count = len(verification["agents"])
        received_count = len(verification["results"])
        
        if received_count >= expected_count:
            # Calculate consensus
            await self._calculate_consensus(request_id)
    
    async def _calculate_consensus(self, request_id: str):
        """Calculate consensus from all agent results"""
        verification = self.active_verifications[request_id]
        results = verification["results"]
        
        if not results:
            logger.error(f"No results for verification: {request_id}")
            return
        
        # Calculate metrics
        approved_count = sum(1 for r in results if r["approved"])
        total_count = len(results)
        approval_rate = approved_count / total_count
        
        # Calculate average confidence of approved results
        approved_results = [r for r in results if r["approved"]]
        avg_confidence = sum(r["confidence_score"] for r in approved_results) / len(approved_results) if approved_results else 0.0
        
        # Determine final approval (66% consensus + 70% confidence threshold)
        consensus_threshold = float(os.getenv("CONSENSUS_THRESHOLD", "0.66"))
        confidence_threshold = 0.7
        
        final_approved = approval_rate >= consensus_threshold and avg_confidence >= confidence_threshold
        
        # Create consensus result
        consensus = ConsensusResult(
            request_id=request_id,
            approved=final_approved,
            approval_rate=approval_rate,
            confidence_score=avg_confidence,
            agent_count=total_count,
            results=[r for r in results],
            payment_released=final_approved,  # 20% payment released if approved
            timestamp=datetime.now().isoformat()
        )
        
        # Update verification status
        verification["status"] = "completed"
        verification["consensus"] = consensus.dict()
        
        logger.info(f"🎯 Consensus reached: {final_approved} (rate: {approval_rate:.2%}, confidence: {avg_confidence:.2f})")
        
        # Send result to HTTP bridge (would be via webhook or polling)
        await self._notify_http_bridge(consensus)
    
    async def _notify_http_bridge(self, consensus: ConsensusResult):
        """Notify HTTP bridge of consensus result"""
        try:
            # In production, this would be a webhook or the bridge would poll for results
            logger.info(f"🔔 Notifying HTTP bridge of consensus: {consensus.request_id}")
            
            # For now, just log the result
            logger.info(f"📊 Final result: {consensus.approved} with {consensus.agent_count} agents")
            
        except Exception as e:
            logger.error(f"Error notifying HTTP bridge: {e}")
    
    def get_verification_status(self, request_id: str) -> Optional[Dict]:
        """Get status of a verification request"""
        return self.active_verifications.get(request_id)
    
    def run(self):
        """Run the coordinator"""
        logger.info(f"🚀 Starting Agentverse Coordinator on port {self.port}")
        self.agent.run()

def main():
    """Main function"""
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    
    # Check environment variables
    if not os.getenv("GOOGLE_API_KEY"):
        logger.warning("⚠️ GOOGLE_API_KEY not set - some features may not work")
    
    if not os.getenv("AGENTVERSE_TOKEN"):
        logger.warning("⚠️ AGENTVERSE_TOKEN not set - will use local agents only")
    
    # Create and run coordinator
    try:
        coordinator = AgentverseCoordinator(port)
        coordinator.run()
    except KeyboardInterrupt:
        logger.info("👋 Coordinator stopped by user")
    except Exception as e:
        logger.error(f"❌ Coordinator error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
