"""
ChainLance Agent Coordinator
Manages communication between multiple ASI agents and the blockchain
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from uagents import Agent, Context, Protocol, Model
from uagents.setup import fund_agent_if_low
from uagents.network import get_faucet, wait_for_tx_to_complete
import aiohttp
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Agent configuration
COORDINATOR_SEED = os.getenv("COORDINATOR_SEED", "chainlance_coordinator_seed")
COORDINATOR_PORT = int(os.getenv("COORDINATOR_PORT", "8000"))
COORDINATOR_ENDPOINT = f"http://localhost:{COORDINATOR_PORT}/submit"

# Blockchain configuration
WEB3_PROVIDER = os.getenv("WEB3_PROVIDER", "http://localhost:8545")
ORACLE_CONTRACT_ADDRESS = os.getenv("ORACLE_CONTRACT_ADDRESS", "")
VERIFIER_CONTRACT_ADDRESS = os.getenv("VERIFIER_CONTRACT_ADDRESS", "")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER))

# Create coordinator agent
coordinator = Agent(
    name="agent_coordinator",
    seed=COORDINATOR_SEED,
    port=COORDINATOR_PORT,
    endpoint=[COORDINATOR_ENDPOINT],
)

fund_agent_if_low(coordinator.wallet.address())

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Agent registry
registered_agents: Dict[str, Dict[str, Any]] = {}
active_requests: Dict[int, Dict[str, Any]] = {}

class AgentRegistration(Model):
    agent_address: str
    agent_type: str
    capabilities: List[str]
    endpoint: str
    metadata: Dict[str, Any]

class WorkRequest(Model):
    request_id: int
    request_type: str
    contract_id: int
    milestone_index: int
    data: Dict[str, Any]
    priority: str = "normal"
    deadline: Optional[int] = None

class WorkResponse(Model):
    request_id: int
    agent_address: str
    success: bool
    result: Dict[str, Any]
    processing_time: float

class AgentHeartbeat(Model):
    agent_address: str
    status: str
    load: float
    last_activity: int

# Protocols
coordination_protocol = Protocol("Coordination")
registration_protocol = Protocol("Registration")

@registration_protocol.on_message(model=AgentRegistration)
async def handle_agent_registration(ctx: Context, sender: str, msg: AgentRegistration):
    """Handle agent registration requests"""
    logger.info(f"Registering agent: {msg.agent_address} of type {msg.agent_type}")
    
    registered_agents[msg.agent_address] = {
        "type": msg.agent_type,
        "capabilities": msg.capabilities,
        "endpoint": msg.endpoint,
        "metadata": msg.metadata,
        "status": "active",
        "load": 0.0,
        "last_heartbeat": asyncio.get_event_loop().time(),
        "total_requests": 0,
        "successful_requests": 0
    }
    
    logger.info(f"Agent {msg.agent_address} registered successfully")

@coordination_protocol.on_message(model=WorkRequest)
async def handle_work_request(ctx: Context, sender: str, msg: WorkRequest):
    """Handle incoming work requests and route to appropriate agents"""
    logger.info(f"Received work request {msg.request_id} of type {msg.request_type}")
    
    # Store request
    active_requests[msg.request_id] = {
        "sender": sender,
        "request": msg,
        "status": "pending",
        "assigned_agent": None,
        "start_time": asyncio.get_event_loop().time()
    }
    
    # Find suitable agent
    suitable_agent = await find_suitable_agent(msg.request_type, msg.data)
    
    if suitable_agent:
        await assign_request_to_agent(ctx, msg, suitable_agent)
    else:
        logger.warning(f"No suitable agent found for request {msg.request_id}")
        await handle_no_agent_available(ctx, sender, msg)

@coordination_protocol.on_message(model=WorkResponse)
async def handle_work_response(ctx: Context, sender: str, msg: WorkResponse):
    """Handle responses from agents"""
    logger.info(f"Received response for request {msg.request_id} from agent {msg.agent_address}")
    
    if msg.request_id in active_requests:
        request_info = active_requests[msg.request_id]
        request_info["status"] = "completed" if msg.success else "failed"
        request_info["response"] = msg
        request_info["end_time"] = asyncio.get_event_loop().time()
        
        # Update agent stats
        if msg.agent_address in registered_agents:
            agent_info = registered_agents[msg.agent_address]
            agent_info["total_requests"] += 1
            if msg.success:
                agent_info["successful_requests"] += 1
        
        # Forward response to original requester
        await ctx.send(request_info["sender"], msg)
        
        # Submit to blockchain if needed
        if msg.success and "verification" in request_info["request"].request_type:
            await submit_verification_result(msg)
        
        # Clean up completed request
        del active_requests[msg.request_id]
    else:
        logger.warning(f"Received response for unknown request {msg.request_id}")

@coordination_protocol.on_message(model=AgentHeartbeat)
async def handle_agent_heartbeat(ctx: Context, sender: str, msg: AgentHeartbeat):
    """Handle agent heartbeat messages"""
    if msg.agent_address in registered_agents:
        agent_info = registered_agents[msg.agent_address]
        agent_info["status"] = msg.status
        agent_info["load"] = msg.load
        agent_info["last_heartbeat"] = asyncio.get_event_loop().time()

async def find_suitable_agent(request_type: str, data: Dict[str, Any]) -> Optional[str]:
    """Find the most suitable agent for a request"""
    suitable_agents = []
    
    for agent_address, agent_info in registered_agents.items():
        if (agent_info["status"] == "active" and 
            request_type in agent_info["capabilities"] and
            agent_info["load"] < 0.8):  # Not overloaded
            
            suitable_agents.append({
                "address": agent_address,
                "load": agent_info["load"],
                "success_rate": (agent_info["successful_requests"] / 
                               max(agent_info["total_requests"], 1))
            })
    
    if not suitable_agents:
        return None
    
    # Sort by load and success rate
    suitable_agents.sort(key=lambda x: (x["load"], -x["success_rate"]))
    
    return suitable_agents[0]["address"]

async def assign_request_to_agent(ctx: Context, request: WorkRequest, agent_address: str):
    """Assign a request to a specific agent"""
    logger.info(f"Assigning request {request.request_id} to agent {agent_address}")
    
    active_requests[request.request_id]["assigned_agent"] = agent_address
    active_requests[request.request_id]["status"] = "assigned"
    
    # Update agent load
    if agent_address in registered_agents:
        registered_agents[agent_address]["load"] += 0.1
    
    # Send request to agent
    await ctx.send(agent_address, request)

async def handle_no_agent_available(ctx: Context, sender: str, request: WorkRequest):
    """Handle case when no agent is available"""
    logger.warning(f"No agent available for request {request.request_id}")
    
    error_response = WorkResponse(
        request_id=request.request_id,
        agent_address="coordinator",
        success=False,
        result={"error": "No suitable agent available"},
        processing_time=0.0
    )
    
    await ctx.send(sender, error_response)
    
    if request.request_id in active_requests:
        del active_requests[request.request_id]

async def submit_verification_result(response: WorkResponse):
    """Submit verification result to blockchain"""
    try:
        if not VERIFIER_CONTRACT_ADDRESS:
            logger.warning("Verifier contract address not configured")
            return
        
        # Extract verification data
        result = response.result
        approved = result.get("approved", False)
        report = result.get("verification_report", "")
        
        logger.info(f"Submitting verification result to blockchain: approved={approved}")
        
        # This would interact with the smart contract
        # For now, just log the action
        logger.info(f"Verification submitted for request {response.request_id}")
        
    except Exception as e:
        logger.error(f"Error submitting verification result: {str(e)}")

async def monitor_agents():
    """Monitor agent health and performance"""
    while True:
        try:
            current_time = asyncio.get_event_loop().time()
            inactive_agents = []
            
            for agent_address, agent_info in registered_agents.items():
                # Check if agent hasn't sent heartbeat in 5 minutes
                if current_time - agent_info["last_heartbeat"] > 300:
                    agent_info["status"] = "inactive"
                    inactive_agents.append(agent_address)
            
            if inactive_agents:
                logger.warning(f"Inactive agents detected: {inactive_agents}")
            
            # Check for stuck requests
            stuck_requests = []
            for request_id, request_info in active_requests.items():
                if (current_time - request_info["start_time"] > 600 and  # 10 minutes
                    request_info["status"] == "assigned"):
                    stuck_requests.append(request_id)
            
            if stuck_requests:
                logger.warning(f"Stuck requests detected: {stuck_requests}")
                # Could implement request reassignment here
            
            await asyncio.sleep(60)  # Check every minute
            
        except Exception as e:
            logger.error(f"Error in agent monitoring: {str(e)}")
            await asyncio.sleep(60)

async def blockchain_listener():
    """Listen for blockchain events and create work requests"""
    while True:
        try:
            # This would listen for smart contract events
            # For now, simulate with periodic checks
            
            # Check for new verification requests
            await check_verification_requests()
            
            await asyncio.sleep(10)  # Check every 10 seconds
            
        except Exception as e:
            logger.error(f"Error in blockchain listener: {str(e)}")
            await asyncio.sleep(10)

async def check_verification_requests():
    """Check for new verification requests from the blockchain"""
    try:
        if not ORACLE_CONTRACT_ADDRESS:
            return
        
        # This would query the smart contract for pending requests
        # For demo purposes, create a mock request
        
        # Mock verification request
        mock_request = WorkRequest(
            request_id=12345,
            request_type="verification",
            contract_id=1,
            milestone_index=0,
            data={
                "deliverable_hash": "QmX1Y2Z3...",
                "job_category": "Web Development",
                "verification_criteria": "Check code compilation, test coverage >80%"
            }
        )
        
        # Process the request (this would normally come from blockchain events)
        # await handle_work_request(None, "blockchain", mock_request)
        
    except Exception as e:
        logger.error(f"Error checking verification requests: {str(e)}")

@coordinator.on_event("startup")
async def startup_event(ctx: Context):
    """Coordinator startup event"""
    logger.info("Agent Coordinator starting up...")
    logger.info(f"Coordinator address: {coordinator.address}")
    logger.info(f"Coordinator endpoint: {COORDINATOR_ENDPOINT}")
    
    # Start background tasks
    asyncio.create_task(monitor_agents())
    asyncio.create_task(blockchain_listener())
    
    logger.info("Background tasks started")

@coordinator.on_interval(period=30.0)  # Every 30 seconds
async def periodic_status_update(ctx: Context):
    """Periodic status update"""
    active_agents = sum(1 for agent in registered_agents.values() if agent["status"] == "active")
    pending_requests = sum(1 for req in active_requests.values() if req["status"] == "pending")
    
    logger.info(f"Status: {active_agents} active agents, {pending_requests} pending requests")

# API endpoints for external integration
async def get_agent_status():
    """Get status of all registered agents"""
    return {
        "total_agents": len(registered_agents),
        "active_agents": sum(1 for agent in registered_agents.values() if agent["status"] == "active"),
        "agents": registered_agents
    }

async def get_request_status(request_id: int):
    """Get status of a specific request"""
    return active_requests.get(request_id, {"error": "Request not found"})

# Include protocols
coordinator.include(coordination_protocol)
coordinator.include(registration_protocol)

if __name__ == "__main__":
    logger.info("Starting ChainLance Agent Coordinator...")
    coordinator.run()
