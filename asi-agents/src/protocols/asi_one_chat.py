"""
ASI:One Chat Protocol Integration
Enables human-agent interaction for work verification and feedback
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Types of messages in ASI:One chat protocol"""
    WORK_SUBMISSION = "work_submission"
    VERIFICATION_REQUEST = "verification_request"
    AGENT_ASSESSMENT = "agent_assessment"
    CLIENT_FEEDBACK = "client_feedback"
    PAYMENT_TRIGGER = "payment_trigger"
    REVISION_REQUEST = "revision_request"
    APPROVAL_NOTIFICATION = "approval_notification"
    SYSTEM_UPDATE = "system_update"

@dataclass
class ChatMessage:
    """ASI:One chat message structure"""
    id: str
    type: MessageType
    sender: str
    recipient: str
    content: Dict[str, Any]
    timestamp: str
    conversation_id: str
    metadata: Dict[str, Any]

class ASIOneChatProtocol:
    """ASI:One Chat Protocol implementation for ChainLance"""
    
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.conversations = {}
        self.message_handlers = {}
        self.active_sessions = {}
        
    def register_handler(self, message_type: MessageType, handler: Callable):
        """Register a message handler for specific message types"""
        self.message_handlers[message_type] = handler
        
    async def start_conversation(self, human_id: str, context: Dict[str, Any]) -> str:
        """Start a new conversation with a human user"""
        conversation_id = str(uuid.uuid4())
        
        self.conversations[conversation_id] = {
            "id": conversation_id,
            "participants": [self.agent_id, human_id],
            "context": context,
            "messages": [],
            "status": "active",
            "created_at": datetime.now().isoformat()
        }
        
        # Send welcome message
        welcome_msg = await self.create_message(
            MessageType.SYSTEM_UPDATE,
            human_id,
            {
                "message": "Hello! I'm your ChainLance verification agent. I'll help assess the submitted work and facilitate communication between you and the freelancer.",
                "capabilities": [
                    "Work quality assessment",
                    "Structured feedback generation", 
                    "Revision recommendations",
                    "Payment processing coordination"
                ],
                "context": context
            },
            conversation_id
        )
        
        await self.send_message(welcome_msg)
        return conversation_id
        
    async def create_message(self, 
                           msg_type: MessageType, 
                           recipient: str, 
                           content: Dict[str, Any],
                           conversation_id: str,
                           metadata: Dict[str, Any] = None) -> ChatMessage:
        """Create a new chat message"""
        return ChatMessage(
            id=str(uuid.uuid4()),
            type=msg_type,
            sender=self.agent_id,
            recipient=recipient,
            content=content,
            timestamp=datetime.now().isoformat(),
            conversation_id=conversation_id,
            metadata=metadata or {}
        )
        
    async def send_message(self, message: ChatMessage):
        """Send a message through ASI:One protocol"""
        if message.conversation_id in self.conversations:
            self.conversations[message.conversation_id]["messages"].append(message)
            
        # Handle the message based on its type
        if message.type in self.message_handlers:
            await self.message_handlers[message.type](message)
            
        logger.info(f"Sent ASI:One message: {message.type.value} to {message.recipient}")
        
    async def handle_work_submission(self, work_data: Dict[str, Any], client_id: str) -> str:
        """Handle work submission and start verification conversation"""
        conversation_id = await self.start_conversation(client_id, {
            "type": "work_verification",
            "contract_id": work_data.get("contract_id"),
            "work_id": work_data.get("work_id"),
            "category": work_data.get("category")
        })
        
        # Notify client about work submission
        submission_msg = await self.create_message(
            MessageType.WORK_SUBMISSION,
            client_id,
            {
                "title": "New Work Submission Received",
                "message": f"The freelancer has submitted work for contract #{work_data.get('contract_id')}. Our AI agents are now reviewing the submission.",
                "work_details": {
                    "deliverables": work_data.get("deliverables", []),
                    "description": work_data.get("description", ""),
                    "submission_notes": work_data.get("freelancer_notes", "")
                },
                "next_steps": [
                    "AI agents will assess the work quality",
                    "You'll receive a detailed evaluation report",
                    "You can provide feedback or approve the work",
                    "Payment will be processed based on approval"
                ]
            },
            conversation_id
        )
        
        await self.send_message(submission_msg)
        return conversation_id
        
    async def handle_agent_assessment(self, assessment: Dict[str, Any], conversation_id: str):
        """Handle agent assessment results"""
        conversation = self.conversations.get(conversation_id)
        if not conversation:
            return
            
        client_id = next(p for p in conversation["participants"] if p != self.agent_id)
        
        assessment_msg = await self.create_message(
            MessageType.AGENT_ASSESSMENT,
            client_id,
            {
                "title": "AI Agent Assessment Complete",
                "assessment": assessment,
                "summary": f"Overall Quality Score: {assessment.get('overall_score', 0):.1%}",
                "recommendations": assessment.get("recommendations", []),
                "agent_decision": "approved" if assessment.get("approved", False) else "needs_revision",
                "confidence": assessment.get("confidence", 0),
                "detailed_scores": assessment.get("category_scores", {}),
                "reasoning": assessment.get("reasoning_path", [])
            },
            conversation_id
        )
        
        await self.send_message(assessment_msg)
        
        # If approved by agents, trigger partial payment
        if assessment.get("approved", False):
            await self.trigger_agent_approval_payment(conversation_id, assessment)
            
    async def trigger_agent_approval_payment(self, conversation_id: str, assessment: Dict[str, Any]):
        """Trigger 20% payment after agent approval"""
        conversation = self.conversations.get(conversation_id)
        if not conversation:
            return
            
        client_id = next(p for p in conversation["participants"] if p != self.agent_id)
        
        payment_msg = await self.create_message(
            MessageType.PAYMENT_TRIGGER,
            client_id,
            {
                "title": "Agent Approval - Partial Payment Released",
                "message": "Our AI agents have approved the submitted work. 20% of the contract amount has been released to the freelancer.",
                "payment_details": {
                    "amount_percentage": 20,
                    "trigger": "agent_approval",
                    "assessment_score": assessment.get("overall_score", 0),
                    "confidence": assessment.get("confidence", 0)
                },
                "next_steps": [
                    "Review the work yourself",
                    "Provide your own feedback",
                    "Approve for full payment or request revisions"
                ]
            },
            conversation_id
        )
        
        await self.send_message(payment_msg)
        
    async def handle_client_feedback(self, feedback: Dict[str, Any], conversation_id: str):
        """Handle client feedback on submitted work"""
        conversation = self.conversations.get(conversation_id)
        if not conversation:
            return
            
        if feedback.get("approved", False):
            # Client approved - trigger full payment
            await self.trigger_full_payment(conversation_id, feedback)
        else:
            # Client requested revisions
            await self.handle_revision_request(conversation_id, feedback)
            
    async def trigger_full_payment(self, conversation_id: str, feedback: Dict[str, Any]):
        """Trigger full payment after client approval"""
        conversation = self.conversations.get(conversation_id)
        if not conversation:
            return
            
        client_id = next(p for p in conversation["participants"] if p != self.agent_id)
        
        payment_msg = await self.create_message(
            MessageType.APPROVAL_NOTIFICATION,
            client_id,
            {
                "title": "Work Approved - Full Payment Released",
                "message": "You have approved the submitted work. The remaining 80% of the contract amount has been released to the freelancer.",
                "payment_details": {
                    "amount_percentage": 80,
                    "trigger": "client_approval",
                    "total_released": 100
                },
                "contract_status": "completed"
            },
            conversation_id
        )
        
        await self.send_message(payment_msg)
        
    async def handle_revision_request(self, conversation_id: str, feedback: Dict[str, Any]):
        """Handle client revision requests"""
        conversation = self.conversations.get(conversation_id)
        if not conversation:
            return
            
        client_id = next(p for p in conversation["participants"] if p != self.agent_id)
        
        revision_msg = await self.create_message(
            MessageType.REVISION_REQUEST,
            client_id,
            {
                "title": "Revision Request Sent",
                "message": "Your revision request has been sent to the freelancer. They will be notified to make the requested changes.",
                "revision_details": {
                    "requested_changes": feedback.get("requested_changes", []),
                    "additional_notes": feedback.get("notes", ""),
                    "deadline": feedback.get("revision_deadline", "")
                },
                "next_steps": [
                    "Freelancer will receive revision request",
                    "Work will be resubmitted after changes",
                    "AI agents will re-assess the revised work"
                ]
            },
            conversation_id
        )
        
        await self.send_message(revision_msg)
        
    async def get_conversation_history(self, conversation_id: str) -> List[ChatMessage]:
        """Get conversation history"""
        if conversation_id in self.conversations:
            return self.conversations[conversation_id]["messages"]
        return []
        
    async def end_conversation(self, conversation_id: str, reason: str = "completed"):
        """End a conversation"""
        if conversation_id in self.conversations:
            self.conversations[conversation_id]["status"] = "ended"
            self.conversations[conversation_id]["end_reason"] = reason
            self.conversations[conversation_id]["ended_at"] = datetime.now().isoformat()

# Global ASI:One protocol instance
asi_one_protocol = ASIOneChatProtocol("chainlance_verification_agent")

# Register default handlers
async def default_message_handler(message: ChatMessage):
    """Default message handler"""
    logger.info(f"Processed {message.type.value} message: {message.id}")

# Register handlers for all message types
for msg_type in MessageType:
    asi_one_protocol.register_handler(msg_type, default_message_handler)
