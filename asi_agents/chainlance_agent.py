#!/usr/bin/env python3
"""
ChainLance ASI Agent for Work Verification
Based on official Fetch.ai uAgents documentation
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
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Google Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

class VerificationRequest(Model):
    """Model for verification requests"""
    request_id: str
    job_data: Dict[str, Any]
    deliverable_data: Dict[str, Any]
    agent_type: str

class VerificationResult(Model):
    """Model for verification results"""
    request_id: str
    agent_address: str
    approved: bool
    confidence_score: float
    analysis: Dict[str, Any]
    issues_found: List[str]
    recommendations: List[str]
    timestamp: str

class ChainLanceAgent:
    """ChainLance verification agent"""
    
    def __init__(self, agent_type: str, port: int = 8001):
        self.agent_type = agent_type
        self.port = port
        
        # Create uAgent
        self.agent = Agent(
            name=f"chainlance_{agent_type}",
            port=port,
            seed=f"chainlance_{agent_type}_seed_{port}",
            endpoint=[f"http://localhost:{port}/submit"]
        )
        
        # Fund agent if needed (for testnet)
        fund_agent_if_low(self.agent.wallet.address())
        
        # Create verification protocol
        self.verification_protocol = Protocol("ChainLanceVerification")
        
        # Register handlers
        self._register_handlers()
        
        logger.info(f"🤖 {agent_type} agent created with address: {self.agent.address}")
    
    def _register_handlers(self):
        """Register protocol handlers"""
        
        @self.verification_protocol.on_message(model=VerificationRequest)
        async def handle_verification_request(ctx: Context, sender: str, msg: VerificationRequest):
            """Handle incoming verification requests"""
            logger.info(f"📥 Received verification request: {msg.request_id}")
            
            try:
                # Perform verification analysis
                result = await self._analyze_work(msg)
                
                # Send result back
                await ctx.send(sender, result)
                
                logger.info(f"✅ Sent verification result for: {msg.request_id}")
                
            except Exception as e:
                logger.error(f"❌ Error processing verification: {e}")
                
                # Send error result
                error_result = VerificationResult(
                    request_id=msg.request_id,
                    agent_address=str(self.agent.address),
                    approved=False,
                    confidence_score=0.0,
                    analysis={"error": str(e)},
                    issues_found=[f"Processing error: {str(e)}"],
                    recommendations=["Please retry the verification"],
                    timestamp=datetime.now().isoformat()
                )
                
                await ctx.send(sender, error_result)
        
        # Include protocol in agent
        self.agent.include(self.verification_protocol)
    
    async def _analyze_work(self, request: VerificationRequest) -> VerificationResult:
        """Analyze work using Google Gemini"""
        logger.info(f"🔍 Analyzing work for {self.agent_type}")
        
        try:
            # Extract data
            job_data = request.job_data
            deliverable_data = request.deliverable_data
            
            # Create analysis prompt based on agent type
            prompt = self._create_analysis_prompt(job_data, deliverable_data)
            
            # Use Google Gemini for analysis
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            
            # Parse response
            analysis_result = self._parse_gemini_response(response.text)
            
            # Create verification result
            result = VerificationResult(
                request_id=request.request_id,
                agent_address=str(self.agent.address),
                approved=analysis_result["approved"],
                confidence_score=analysis_result["confidence"],
                analysis=analysis_result["analysis"],
                issues_found=analysis_result["issues"],
                recommendations=analysis_result["recommendations"],
                timestamp=datetime.now().isoformat()
            )
            
            logger.info(f"✅ Analysis complete: {analysis_result['approved']} (confidence: {analysis_result['confidence']:.2f})")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Analysis error: {e}")
            raise
    
    def _create_analysis_prompt(self, job_data: Dict, deliverable_data: Dict) -> str:
        """Create analysis prompt based on agent type"""
        
        base_context = f"""
Job Title: {job_data.get('title', 'N/A')}
Job Description: {job_data.get('description', 'N/A')}
Job Category: {job_data.get('category', 'N/A')}
Required Skills: {', '.join(job_data.get('skills_required', []))}
Budget: ${job_data.get('budget', 0)}

Deliverable URL: {deliverable_data.get('deliverable_url', 'N/A')}
Deliverable Type: {deliverable_data.get('deliverable_type', 'N/A')}
Description: {deliverable_data.get('description', 'N/A')}
"""
        
        if self.agent_type == "code_reviewer":
            return f"""
{base_context}

As a code reviewer agent, analyze the submitted work focusing on:
1. Code quality and best practices
2. Security considerations
3. Performance optimization
4. Documentation completeness
5. Adherence to requirements

Provide a JSON response with:
- approved: boolean (true if work meets standards)
- confidence: float (0.0-1.0)
- analysis: object with detailed scores
- issues: array of issues found
- recommendations: array of improvement suggestions

Be thorough but fair in your assessment.
"""
        
        elif self.agent_type == "quality_analyst":
            return f"""
{base_context}

As a quality analyst agent, analyze the submitted work focusing on:
1. Completeness of deliverables
2. Professional presentation
3. User experience considerations
4. Testing and validation
5. Overall quality standards

Provide a JSON response with:
- approved: boolean (true if work meets quality standards)
- confidence: float (0.0-1.0)
- analysis: object with detailed scores
- issues: array of quality issues found
- recommendations: array of quality improvement suggestions

Focus on overall quality and completeness.
"""
        
        elif self.agent_type == "requirements_validator":
            return f"""
{base_context}

As a requirements validator agent, analyze the submitted work focusing on:
1. Functional requirements fulfillment
2. Technical specifications compliance
3. Business logic implementation
4. Acceptance criteria validation
5. Scope and deliverable matching

Provide a JSON response with:
- approved: boolean (true if requirements are met)
- confidence: float (0.0-1.0)
- analysis: object with detailed scores
- issues: array of requirement gaps found
- recommendations: array of requirement improvement suggestions

Ensure all specified requirements are addressed.
"""
        
        else:
            return f"""
{base_context}

As a general verification agent, analyze the submitted work comprehensively.
Provide a JSON response with your assessment.
"""
    
    def _parse_gemini_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Gemini response into structured data"""
        try:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            
            if json_match:
                json_str = json_match.group()
                parsed = json.loads(json_str)
                
                return {
                    "approved": parsed.get("approved", False),
                    "confidence": float(parsed.get("confidence", 0.5)),
                    "analysis": parsed.get("analysis", {}),
                    "issues": parsed.get("issues", []),
                    "recommendations": parsed.get("recommendations", [])
                }
            else:
                # Fallback: analyze text for approval indicators
                text_lower = response_text.lower()
                approved = any(word in text_lower for word in ["approved", "acceptable", "meets requirements", "good quality"])
                confidence = 0.7 if approved else 0.3
                
                return {
                    "approved": approved,
                    "confidence": confidence,
                    "analysis": {"text_analysis": response_text[:500]},
                    "issues": [] if approved else ["Manual review recommended"],
                    "recommendations": ["Consider detailed review"] if not approved else ["Good work"]
                }
                
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {e}")
            return {
                "approved": False,
                "confidence": 0.0,
                "analysis": {"parse_error": str(e)},
                "issues": ["Failed to parse AI analysis"],
                "recommendations": ["Manual review required"]
            }
    
    def run(self):
        """Run the agent"""
        logger.info(f"🚀 Starting {self.agent_type} agent on port {self.port}")
        self.agent.run()

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python chainlance_agent.py <agent_type> [port]")
        print("Agent types: code_reviewer, quality_analyst, requirements_validator")
        sys.exit(1)
    
    agent_type = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8001
    
    # Validate agent type
    valid_types = ["code_reviewer", "quality_analyst", "requirements_validator"]
    if agent_type not in valid_types:
        print(f"Invalid agent type. Must be one of: {valid_types}")
        sys.exit(1)
    
    # Check required environment variables
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ GOOGLE_API_KEY environment variable is required")
        sys.exit(1)
    
    # Create and run agent
    try:
        agent = ChainLanceAgent(agent_type, port)
        agent.run()
    except KeyboardInterrupt:
        logger.info("👋 Agent stopped by user")
    except Exception as e:
        logger.error(f"❌ Agent error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
