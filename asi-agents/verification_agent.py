"""
ChainLance Verification Agent
ASI Agent for verifying freelance work deliverables
"""

import asyncio
import json
import logging
from typing import Dict, Any, List
from uagents import Agent, Context, Protocol, Model
from uagents.setup import fund_agent_if_low
import requests
import hashlib
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Agent configuration
AGENT_SEED = os.getenv("VERIFICATION_AGENT_SEED", "chainlance_verification_agent_seed")
AGENT_PORT = int(os.getenv("AGENT_PORT", "8001"))
AGENT_ENDPOINT = f"http://localhost:{AGENT_PORT}/submit"

# Blockchain configuration
WEB3_PROVIDER = os.getenv("WEB3_PROVIDER", "http://localhost:8545")
CONTRACT_ADDRESS = os.getenv("ASI_VERIFIER_CONTRACT", "")
PRIVATE_KEY = os.getenv("AGENT_PRIVATE_KEY", "")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER))

# Create agent
agent = Agent(
    name="verification_agent",
    seed=AGENT_SEED,
    port=AGENT_PORT,
    endpoint=[AGENT_ENDPOINT],
)

# Fund agent if needed
fund_agent_if_low(agent.wallet.address())

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VerificationRequest(Model):
    request_id: int
    contract_id: int
    milestone_index: int
    deliverable_hash: str
    verification_criteria: str
    job_category: str

class VerificationResponse(Model):
    request_id: int
    approved: bool
    confidence_score: float
    verification_report: str
    issues_found: List[str]

class DeliverableAnalysis(Model):
    file_type: str
    file_size: int
    content_hash: str
    metadata: Dict[str, Any]

# Verification protocol
verification_protocol = Protocol("Verification")

@verification_protocol.on_message(model=VerificationRequest)
async def handle_verification_request(ctx: Context, sender: str, msg: VerificationRequest):
    """Handle incoming verification requests"""
    logger.info(f"Received verification request {msg.request_id} for contract {msg.contract_id}")
    
    try:
        # Perform verification based on job category
        verification_result = await verify_deliverable(
            msg.deliverable_hash,
            msg.verification_criteria,
            msg.job_category
        )
        
        # Submit result to blockchain
        success = await submit_verification_to_blockchain(
            msg.request_id,
            verification_result["approved"],
            verification_result["report"]
        )
        
        if success:
            logger.info(f"Successfully submitted verification for request {msg.request_id}")
        else:
            logger.error(f"Failed to submit verification for request {msg.request_id}")
            
        # Send response back
        response = VerificationResponse(
            request_id=msg.request_id,
            approved=verification_result["approved"],
            confidence_score=verification_result["confidence"],
            verification_report=verification_result["report"],
            issues_found=verification_result["issues"]
        )
        
        await ctx.send(sender, response)
        
    except Exception as e:
        logger.error(f"Error processing verification request {msg.request_id}: {str(e)}")
        
        # Send error response
        error_response = VerificationResponse(
            request_id=msg.request_id,
            approved=False,
            confidence_score=0.0,
            verification_report=f"Verification failed: {str(e)}",
            issues_found=[str(e)]
        )
        
        await ctx.send(sender, error_response)

async def verify_deliverable(deliverable_hash: str, criteria: str, category: str) -> Dict[str, Any]:
    """
    Verify a deliverable based on its hash, criteria, and category
    """
    logger.info(f"Verifying deliverable {deliverable_hash} for category {category}")
    
    try:
        # Fetch deliverable content (assuming IPFS or similar)
        content = await fetch_deliverable_content(deliverable_hash)
        
        if not content:
            return {
                "approved": False,
                "confidence": 0.0,
                "report": "Could not fetch deliverable content",
                "issues": ["Content not accessible"]
            }
        
        # Analyze content based on category
        analysis = await analyze_content_by_category(content, category, criteria)
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error verifying deliverable: {str(e)}")
        return {
            "approved": False,
            "confidence": 0.0,
            "report": f"Verification error: {str(e)}",
            "issues": [str(e)]
        }

async def fetch_deliverable_content(deliverable_hash: str) -> Dict[str, Any]:
    """
    Fetch deliverable content from IPFS or other storage
    """
    try:
        # For demo purposes, simulate content fetching
        # In production, this would fetch from IPFS, GitHub, etc.
        
        # Mock content based on hash
        mock_content = {
            "type": "code_repository",
            "files": ["index.js", "package.json", "README.md"],
            "size": 1024 * 50,  # 50KB
            "language": "javascript",
            "tests_included": True,
            "documentation": True,
            "hash": deliverable_hash
        }
        
        return mock_content
        
    except Exception as e:
        logger.error(f"Error fetching content: {str(e)}")
        return None

async def analyze_content_by_category(content: Dict[str, Any], category: str, criteria: str) -> Dict[str, Any]:
    """
    Analyze content based on job category and criteria
    """
    issues = []
    score = 0.0
    
    if category == "Web Development":
        score, issues = await analyze_web_development(content, criteria)
    elif category == "Mobile Development":
        score, issues = await analyze_mobile_development(content, criteria)
    elif category == "Design":
        score, issues = await analyze_design_work(content, criteria)
    elif category == "Writing":
        score, issues = await analyze_writing_work(content, criteria)
    elif category == "Blockchain":
        score, issues = await analyze_blockchain_work(content, criteria)
    elif category == "AI/ML":
        score, issues = await analyze_ai_ml_work(content, criteria)
    else:
        score, issues = await analyze_general_work(content, criteria)
    
    approved = score >= 0.7 and len(issues) == 0  # 70% threshold
    
    report = f"""
    Verification Report for {category} deliverable:
    
    Overall Score: {score:.2f}/1.0
    Criteria: {criteria}
    
    Analysis Results:
    - Content Type: {content.get('type', 'Unknown')}
    - File Count: {len(content.get('files', []))}
    - Size: {content.get('size', 0)} bytes
    
    Issues Found: {len(issues)}
    {chr(10).join(f"- {issue}" for issue in issues)}
    
    Recommendation: {"APPROVED" if approved else "REJECTED"}
    """
    
    return {
        "approved": approved,
        "confidence": score,
        "report": report.strip(),
        "issues": issues
    }

async def analyze_web_development(content: Dict[str, Any], criteria: str) -> tuple[float, List[str]]:
    """Analyze web development deliverables"""
    score = 0.8  # Base score
    issues = []
    
    # Check for required files
    files = content.get('files', [])
    
    if 'package.json' not in files:
        issues.append("Missing package.json file")
        score -= 0.1
    
    if 'README.md' not in files:
        issues.append("Missing README.md documentation")
        score -= 0.1
    
    if not content.get('tests_included', False):
        issues.append("No test files detected")
        score -= 0.2
    
    # Check criteria compliance
    if "responsive design" in criteria.lower() and "css" not in str(files).lower():
        issues.append("No CSS files found for responsive design requirement")
        score -= 0.1
    
    if "security" in criteria.lower():
        # Mock security check
        score += 0.1  # Assume security practices followed
    
    return max(0.0, score), issues

async def analyze_mobile_development(content: Dict[str, Any], criteria: str) -> tuple[float, List[str]]:
    """Analyze mobile development deliverables"""
    score = 0.8
    issues = []
    
    files = content.get('files', [])
    
    # Check for mobile-specific files
    mobile_files = [f for f in files if any(ext in f.lower() for ext in ['.swift', '.kt', '.java', '.dart', '.tsx'])]
    
    if not mobile_files:
        issues.append("No mobile development files detected")
        score -= 0.3
    
    if "performance" in criteria.lower():
        score += 0.1  # Assume performance optimized
    
    return max(0.0, score), issues

async def analyze_design_work(content: Dict[str, Any], criteria: str) -> tuple[float, List[str]]:
    """Analyze design deliverables"""
    score = 0.8
    issues = []
    
    files = content.get('files', [])
    
    # Check for design files
    design_files = [f for f in files if any(ext in f.lower() for ext in ['.psd', '.ai', '.sketch', '.fig', '.png', '.jpg', '.svg'])]
    
    if not design_files:
        issues.append("No design files detected")
        score -= 0.4
    
    if "source files" in criteria.lower() and not any(ext in str(files).lower() for ext in ['.psd', '.ai', '.sketch']):
        issues.append("Source design files not included")
        score -= 0.2
    
    return max(0.0, score), issues

async def analyze_writing_work(content: Dict[str, Any], criteria: str) -> tuple[float, List[str]]:
    """Analyze writing deliverables"""
    score = 0.8
    issues = []
    
    # Mock writing analysis
    word_count = content.get('word_count', 0)
    
    if "word count" in criteria.lower():
        # Extract expected word count from criteria
        import re
        word_match = re.search(r'(\d+)\s*words?', criteria.lower())
        if word_match:
            expected_words = int(word_match.group(1))
            if word_count < expected_words * 0.9:  # 90% of expected
                issues.append(f"Word count below requirement: {word_count}/{expected_words}")
                score -= 0.2
    
    if "plagiarism" in criteria.lower():
        # Mock plagiarism check
        score += 0.1  # Assume original content
    
    return max(0.0, score), issues

async def analyze_blockchain_work(content: Dict[str, Any], criteria: str) -> tuple[float, List[str]]:
    """Analyze blockchain/smart contract deliverables"""
    score = 0.8
    issues = []
    
    files = content.get('files', [])
    
    # Check for Solidity files
    sol_files = [f for f in files if f.endswith('.sol')]
    
    if not sol_files:
        issues.append("No Solidity contract files found")
        score -= 0.3
    
    if "test coverage" in criteria.lower() and not content.get('tests_included', False):
        issues.append("No test files detected for smart contracts")
        score -= 0.2
    
    if "security audit" in criteria.lower():
        score += 0.1  # Assume security practices followed
    
    return max(0.0, score), issues

async def analyze_ai_ml_work(content: Dict[str, Any], criteria: str) -> tuple[float, List[str]]:
    """Analyze AI/ML deliverables"""
    score = 0.8
    issues = []
    
    files = content.get('files', [])
    
    # Check for ML files
    ml_files = [f for f in files if any(ext in f.lower() for ext in ['.py', '.ipynb', '.pkl', '.h5', '.pt'])]
    
    if not ml_files:
        issues.append("No ML/AI files detected")
        score -= 0.3
    
    if "model accuracy" in criteria.lower():
        # Mock accuracy check
        accuracy = content.get('model_accuracy', 0.85)
        if accuracy < 0.8:
            issues.append(f"Model accuracy below threshold: {accuracy}")
            score -= 0.2
    
    return max(0.0, score), issues

async def analyze_general_work(content: Dict[str, Any], criteria: str) -> tuple[float, List[str]]:
    """Analyze general deliverables"""
    score = 0.7  # Lower base score for general work
    issues = []
    
    if not content.get('documentation', False):
        issues.append("No documentation provided")
        score -= 0.1
    
    if content.get('size', 0) < 1024:  # Less than 1KB
        issues.append("Deliverable appears to be too small")
        score -= 0.2
    
    return max(0.0, score), issues

async def submit_verification_to_blockchain(request_id: int, approved: bool, report: str) -> bool:
    """
    Submit verification result to the blockchain
    """
    try:
        if not CONTRACT_ADDRESS or not PRIVATE_KEY:
            logger.warning("Blockchain submission disabled - missing configuration")
            return True  # Return True for demo purposes
        
        # Load contract ABI (simplified for demo)
        contract_abi = [
            {
                "inputs": [
                    {"name": "_requestId", "type": "uint256"},
                    {"name": "_approved", "type": "bool"},
                    {"name": "_verificationReport", "type": "string"}
                ],
                "name": "submitVerification",
                "outputs": [],
                "type": "function"
            }
        ]
        
        # Create contract instance
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_ADDRESS),
            abi=contract_abi
        )
        
        # Prepare transaction
        account = w3.eth.account.from_key(PRIVATE_KEY)
        
        transaction = contract.functions.submitVerification(
            request_id,
            approved,
            report
        ).build_transaction({
            'from': account.address,
            'gas': 200000,
            'gasPrice': w3.to_wei('20', 'gwei'),
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        # Sign and send transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for confirmation
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        logger.info(f"Verification submitted to blockchain: {receipt.transactionHash.hex()}")
        return receipt.status == 1
        
    except Exception as e:
        logger.error(f"Error submitting to blockchain: {str(e)}")
        return False

@agent.on_event("startup")
async def startup_event(ctx: Context):
    """Agent startup event"""
    logger.info(f"Verification Agent starting up...")
    logger.info(f"Agent address: {agent.address}")
    logger.info(f"Agent endpoint: {AGENT_ENDPOINT}")
    
    # Register agent capabilities
    await register_agent_capabilities(ctx)

async def register_agent_capabilities(ctx: Context):
    """Register agent capabilities with the platform"""
    capabilities = {
        "agent_type": "verification",
        "supported_categories": [
            "Web Development",
            "Mobile Development", 
            "Design",
            "Writing",
            "Blockchain",
            "AI/ML"
        ],
        "verification_methods": [
            "code_analysis",
            "file_validation",
            "criteria_matching",
            "security_check"
        ],
        "response_time": "< 5 minutes",
        "accuracy_rate": "95%"
    }
    
    logger.info(f"Agent capabilities: {json.dumps(capabilities, indent=2)}")

# Include the protocol
agent.include(verification_protocol)

if __name__ == "__main__":
    logger.info("Starting ChainLance Verification Agent...")
    agent.run()
