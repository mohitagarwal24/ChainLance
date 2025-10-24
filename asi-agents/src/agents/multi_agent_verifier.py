"""
Multi-Agent Verification System for ChainLance
Discovers and coordinates the 3 best verification agents from Agentverse
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime
import uuid
import aiohttp
from uagents import Agent, Context, Protocol, Model
from uagents.setup import fund_agent_if_low

from ..metta.knowledge_graph import (
    WorkVerificationContext, 
    WorkQualityAssessment, 
    assess_work_quality,
    metta_reasoner
)
from ..protocols.asi_one_chat import ASIOneChatProtocol, MessageType

logger = logging.getLogger(__name__)

class AgentSpecialty(Enum):
    """Agent specialties for work verification"""
    CODE_REVIEW = "code_review"
    DESIGN_ASSESSMENT = "design_assessment"
    CONTENT_EVALUATION = "content_evaluation"
    SECURITY_AUDIT = "security_audit"
    PERFORMANCE_ANALYSIS = "performance_analysis"
    UX_EVALUATION = "ux_evaluation"

@dataclass
class AgentProfile:
    """Profile of a verification agent from Agentverse"""
    agent_id: str
    name: str
    specialty: AgentSpecialty
    rating: float
    total_verifications: int
    success_rate: float
    response_time_avg: float
    cost_per_verification: float
    available: bool
    capabilities: List[str]
    agentverse_url: str

@dataclass
class VerificationTask:
    """Task for agent verification"""
    task_id: str
    contract_id: int
    work_data: Dict[str, Any]
    category: str
    priority: str
    assigned_agents: List[str]
    status: str
    created_at: str
    deadline: str

class AgentverseDiscovery:
    """Discovers and ranks agents from Agentverse marketplace"""
    
    def __init__(self):
        self.agentverse_api_base = "https://agentverse.ai/api/v1"
        self.cached_agents = {}
        self.agent_performance_history = {}
        
    async def discover_best_agents(self, 
                                 category: str, 
                                 num_agents: int = 3) -> List[AgentProfile]:
        """Discover the best agents for a specific category"""
        
        # Map work categories to agent specialties
        specialty_mapping = {
            "web development": [AgentSpecialty.CODE_REVIEW, AgentSpecialty.SECURITY_AUDIT, AgentSpecialty.PERFORMANCE_ANALYSIS],
            "mobile development": [AgentSpecialty.CODE_REVIEW, AgentSpecialty.UX_EVALUATION, AgentSpecialty.PERFORMANCE_ANALYSIS],
            "ui/ux design": [AgentSpecialty.DESIGN_ASSESSMENT, AgentSpecialty.UX_EVALUATION],
            "content writing": [AgentSpecialty.CONTENT_EVALUATION],
            "blockchain": [AgentSpecialty.CODE_REVIEW, AgentSpecialty.SECURITY_AUDIT],
            "ai/ml": [AgentSpecialty.CODE_REVIEW, AgentSpecialty.PERFORMANCE_ANALYSIS]
        }
        
        required_specialties = specialty_mapping.get(category.lower(), [AgentSpecialty.CODE_REVIEW])
        
        # Search for agents in Agentverse (simulated for now)
        available_agents = await self.search_agentverse_agents(required_specialties)
        
        # Rank agents based on multiple criteria
        ranked_agents = self.rank_agents(available_agents, category)
        
        # Return top N agents
        return ranked_agents[:num_agents]
    
    async def search_agentverse_agents(self, specialties: List[AgentSpecialty]) -> List[AgentProfile]:
        """Search Agentverse for agents with required specialties"""
        
        # Simulated agent discovery (would use actual Agentverse API)
        mock_agents = [
            AgentProfile(
                agent_id="agent_code_master_001",
                name="CodeMaster Pro",
                specialty=AgentSpecialty.CODE_REVIEW,
                rating=4.8,
                total_verifications=1250,
                success_rate=0.94,
                response_time_avg=120,  # seconds
                cost_per_verification=0.05,  # PYUSD
                available=True,
                capabilities=["syntax_analysis", "best_practices", "security_check", "performance_review"],
                agentverse_url="https://agentverse.ai/agents/code_master_001"
            ),
            AgentProfile(
                agent_id="agent_design_guru_002",
                name="Design Guru Elite",
                specialty=AgentSpecialty.DESIGN_ASSESSMENT,
                rating=4.9,
                total_verifications=890,
                success_rate=0.96,
                response_time_avg=180,
                cost_per_verification=0.08,
                available=True,
                capabilities=["visual_analysis", "brand_consistency", "accessibility_check", "responsive_design"],
                agentverse_url="https://agentverse.ai/agents/design_guru_002"
            ),
            AgentProfile(
                agent_id="agent_security_hawk_003",
                name="Security Hawk",
                specialty=AgentSpecialty.SECURITY_AUDIT,
                rating=4.7,
                total_verifications=2100,
                success_rate=0.92,
                response_time_avg=300,
                cost_per_verification=0.12,
                available=True,
                capabilities=["vulnerability_scan", "penetration_test", "code_audit", "compliance_check"],
                agentverse_url="https://agentverse.ai/agents/security_hawk_003"
            ),
            AgentProfile(
                agent_id="agent_ux_wizard_004",
                name="UX Wizard",
                specialty=AgentSpecialty.UX_EVALUATION,
                rating=4.6,
                total_verifications=750,
                success_rate=0.89,
                response_time_avg=240,
                cost_per_verification=0.07,
                available=True,
                capabilities=["usability_analysis", "user_journey", "interaction_design", "accessibility"],
                agentverse_url="https://agentverse.ai/agents/ux_wizard_004"
            ),
            AgentProfile(
                agent_id="agent_content_sage_005",
                name="Content Sage",
                specialty=AgentSpecialty.CONTENT_EVALUATION,
                rating=4.5,
                total_verifications=650,
                success_rate=0.91,
                response_time_avg=150,
                cost_per_verification=0.04,
                available=True,
                capabilities=["grammar_check", "seo_analysis", "readability", "engagement_metrics"],
                agentverse_url="https://agentverse.ai/agents/content_sage_005"
            ),
            AgentProfile(
                agent_id="agent_perf_optimizer_006",
                name="Performance Optimizer",
                specialty=AgentSpecialty.PERFORMANCE_ANALYSIS,
                rating=4.4,
                total_verifications=980,
                success_rate=0.88,
                response_time_avg=200,
                cost_per_verification=0.06,
                available=True,
                capabilities=["load_testing", "optimization", "metrics_analysis", "bottleneck_detection"],
                agentverse_url="https://agentverse.ai/agents/perf_optimizer_006"
            )
        ]
        
        # Filter agents by specialty
        relevant_agents = [agent for agent in mock_agents 
                          if agent.specialty in specialties and agent.available]
        
        return relevant_agents
    
    def rank_agents(self, agents: List[AgentProfile], category: str) -> List[AgentProfile]:
        """Rank agents based on multiple criteria"""
        
        def calculate_score(agent: AgentProfile) -> float:
            # Weighted scoring algorithm
            rating_score = agent.rating / 5.0 * 0.3
            success_rate_score = agent.success_rate * 0.25
            experience_score = min(agent.total_verifications / 1000, 1.0) * 0.2
            speed_score = max(0, (600 - agent.response_time_avg) / 600) * 0.15
            cost_score = max(0, (0.2 - agent.cost_per_verification) / 0.2) * 0.1
            
            total_score = (rating_score + success_rate_score + experience_score + 
                          speed_score + cost_score)
            
            return total_score
        
        # Sort agents by calculated score
        agents_with_scores = [(agent, calculate_score(agent)) for agent in agents]
        agents_with_scores.sort(key=lambda x: x[1], reverse=True)
        
        return [agent for agent, score in agents_with_scores]

class MultiAgentVerificationCoordinator:
    """Coordinates multiple agents for work verification"""
    
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.discovery = AgentverseDiscovery()
        self.active_tasks = {}
        self.verification_results = {}
        self.asi_one_chat = ASIOneChatProtocol(agent_id)
        
    async def verify_work(self, 
                         work_data: Dict[str, Any], 
                         client_id: str) -> Dict[str, Any]:
        """Coordinate multi-agent work verification"""
        
        task_id = str(uuid.uuid4())
        category = work_data.get("category", "web development")
        
        # Create verification task
        task = VerificationTask(
            task_id=task_id,
            contract_id=work_data.get("contract_id", 0),
            work_data=work_data,
            category=category,
            priority="normal",
            assigned_agents=[],
            status="discovering_agents",
            created_at=datetime.now().isoformat(),
            deadline=(datetime.now().timestamp() + 3600)  # 1 hour deadline
        )
        
        self.active_tasks[task_id] = task
        
        try:
            # Step 1: Discover best agents for this category
            logger.info(f"Discovering best agents for category: {category}")
            best_agents = await self.discovery.discover_best_agents(category, 3)
            
            if not best_agents:
                raise Exception("No suitable agents found for verification")
            
            task.assigned_agents = [agent.agent_id for agent in best_agents]
            task.status = "agents_assigned"
            
            # Step 2: Start ASI:One conversation with client
            conversation_id = await self.asi_one_chat.handle_work_submission(work_data, client_id)
            
            # Step 3: Create MeTTa verification context
            verification_context = WorkVerificationContext(
                work_id=work_data.get("work_id", task_id),
                contract_id=work_data.get("contract_id", 0),
                category=category,
                deliverables=work_data.get("deliverables", []),
                description=work_data.get("description", ""),
                requirements=work_data.get("requirements", []),
                freelancer_notes=work_data.get("freelancer_notes", ""),
                submission_timestamp=datetime.now().isoformat()
            )
            
            # Step 4: Coordinate agent verifications
            task.status = "verifying"
            agent_results = await self.coordinate_agent_verifications(
                best_agents, 
                verification_context
            )
            
            # Step 5: Aggregate results using MeTTa reasoning
            final_assessment = await self.aggregate_verification_results(
                agent_results, 
                verification_context
            )
            
            # Step 6: Send assessment through ASI:One chat
            await self.asi_one_chat.handle_agent_assessment(
                final_assessment.to_dict(), 
                conversation_id
            )
            
            # Step 7: Store results
            self.verification_results[task_id] = {
                "task": asdict(task),
                "agents": [asdict(agent) for agent in best_agents],
                "agent_results": agent_results,
                "final_assessment": final_assessment.to_dict(),
                "conversation_id": conversation_id
            }
            
            task.status = "completed"
            
            return {
                "task_id": task_id,
                "status": "success",
                "assessment": final_assessment.to_dict(),
                "agents_used": [agent.name for agent in best_agents],
                "conversation_id": conversation_id
            }
            
        except Exception as e:
            logger.error(f"Verification failed for task {task_id}: {str(e)}")
            task.status = "failed"
            return {
                "task_id": task_id,
                "status": "error",
                "error": str(e)
            }
    
    async def coordinate_agent_verifications(self, 
                                           agents: List[AgentProfile], 
                                           context: WorkVerificationContext) -> List[Dict[str, Any]]:
        """Coordinate verification by multiple agents"""
        
        verification_tasks = []
        
        for agent in agents:
            task = self.verify_with_single_agent(agent, context)
            verification_tasks.append(task)
        
        # Run verifications in parallel
        results = await asyncio.gather(*verification_tasks, return_exceptions=True)
        
        # Filter out exceptions and return valid results
        valid_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Agent {agents[i].name} verification failed: {str(result)}")
            else:
                valid_results.append(result)
        
        return valid_results
    
    async def verify_with_single_agent(self, 
                                     agent: AgentProfile, 
                                     context: WorkVerificationContext) -> Dict[str, Any]:
        """Verify work with a single agent"""
        
        # Simulate agent verification (would use actual agent communication)
        await asyncio.sleep(agent.response_time_avg / 100)  # Simulate processing time
        
        # Use MeTTa reasoning for this agent's specialty
        metta_assessment = assess_work_quality(context)
        
        # Adjust assessment based on agent's specialty
        specialty_bonus = 0.05 if self.matches_specialty(agent.specialty, context.category) else 0
        
        agent_result = {
            "agent_id": agent.agent_id,
            "agent_name": agent.name,
            "specialty": agent.specialty.value,
            "assessment": metta_assessment.to_dict(),
            "confidence": min(1.0, metta_assessment.confidence + specialty_bonus),
            "processing_time": agent.response_time_avg,
            "cost": agent.cost_per_verification,
            "timestamp": datetime.now().isoformat()
        }
        
        return agent_result
    
    def matches_specialty(self, specialty: AgentSpecialty, category: str) -> bool:
        """Check if agent specialty matches work category"""
        specialty_matches = {
            AgentSpecialty.CODE_REVIEW: ["web development", "mobile development", "blockchain", "ai/ml"],
            AgentSpecialty.DESIGN_ASSESSMENT: ["ui/ux design", "graphic design"],
            AgentSpecialty.CONTENT_EVALUATION: ["content writing", "copywriting"],
            AgentSpecialty.SECURITY_AUDIT: ["web development", "blockchain", "mobile development"],
            AgentSpecialty.PERFORMANCE_ANALYSIS: ["web development", "mobile development", "ai/ml"],
            AgentSpecialty.UX_EVALUATION: ["ui/ux design", "mobile development", "web development"]
        }
        
        return category.lower() in specialty_matches.get(specialty, [])
    
    async def aggregate_verification_results(self, 
                                           agent_results: List[Dict[str, Any]], 
                                           context: WorkVerificationContext) -> WorkQualityAssessment:
        """Aggregate multiple agent results using MeTTa reasoning"""
        
        if not agent_results:
            # Fallback to single MeTTa assessment
            return assess_work_quality(context)
        
        # Weighted aggregation based on agent confidence and specialty match
        total_weight = 0
        weighted_scores = {}
        all_recommendations = []
        
        for result in agent_results:
            agent_assessment = result["assessment"]
            confidence = result["confidence"]
            specialty = result["specialty"]
            
            # Weight based on confidence and specialty relevance
            specialty_weight = 1.2 if self.matches_specialty(
                AgentSpecialty(specialty), context.category) else 1.0
            weight = confidence * specialty_weight
            total_weight += weight
            
            # Aggregate scores
            for criterion, score in agent_assessment.get("category_scores", {}).items():
                if criterion not in weighted_scores:
                    weighted_scores[criterion] = 0
                weighted_scores[criterion] += score * weight
            
            # Collect recommendations
            all_recommendations.extend(agent_assessment.get("recommendations", []))
        
        # Calculate final weighted scores
        if total_weight > 0:
            for criterion in weighted_scores:
                weighted_scores[criterion] /= total_weight
        
        # Calculate overall score
        overall_score = sum(weighted_scores.values()) / len(weighted_scores) if weighted_scores else 0
        
        # Create aggregated assessment
        aggregated_result = {
            "overall_score": overall_score,
            "category_scores": weighted_scores,
            "recommendations": list(set(all_recommendations)),  # Remove duplicates
            "confidence": sum(r["confidence"] for r in agent_results) / len(agent_results),
            "reasoning_path": [f"Aggregated from {len(agent_results)} specialist agents"],
            "agent_count": len(agent_results),
            "agents_used": [r["agent_name"] for r in agent_results]
        }
        
        return WorkQualityAssessment(aggregated_result)

# Global multi-agent coordinator
multi_agent_coordinator = MultiAgentVerificationCoordinator("chainlance_multi_agent_coordinator")
