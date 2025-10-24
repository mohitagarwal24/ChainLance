"""
MeTTa Knowledge Graph for ChainLance Work Verification
Implements structured reasoning for work quality assessment
"""

import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import networkx as nx
import numpy as np
from datetime import datetime

# MeTTa integration (simulated for now - will be replaced with actual MeTTa SDK)
class MettaReasoner:
    """MeTTa-based reasoning engine for work verification"""
    
    def __init__(self):
        self.knowledge_graph = nx.DiGraph()
        self.quality_metrics = {}
        self.verification_history = {}
        
    def initialize_knowledge_base(self):
        """Initialize the knowledge base with work verification rules"""
        # Add work quality assessment rules
        self.add_rule("code_quality", {
            "syntax_correctness": 0.3,
            "best_practices": 0.25,
            "documentation": 0.2,
            "testing": 0.15,
            "performance": 0.1
        })
        
        self.add_rule("design_quality", {
            "visual_appeal": 0.3,
            "usability": 0.25,
            "brand_consistency": 0.2,
            "accessibility": 0.15,
            "responsiveness": 0.1
        })
        
        self.add_rule("content_quality", {
            "accuracy": 0.3,
            "clarity": 0.25,
            "engagement": 0.2,
            "seo_optimization": 0.15,
            "originality": 0.1
        })
        
    def add_rule(self, category: str, weights: Dict[str, float]):
        """Add a verification rule to the knowledge graph"""
        self.knowledge_graph.add_node(category, type="category", weights=weights)
        
        for criterion, weight in weights.items():
            self.knowledge_graph.add_node(f"{category}_{criterion}", 
                                        type="criterion", 
                                        weight=weight,
                                        category=category)
            self.knowledge_graph.add_edge(category, f"{category}_{criterion}")
    
    def reason_about_work(self, work_data: Dict[str, Any]) -> Dict[str, Any]:
        """Use MeTTa reasoning to assess work quality"""
        category = work_data.get("category", "general")
        deliverables = work_data.get("deliverables", [])
        
        # Perform structured reasoning
        assessment = {
            "overall_score": 0.0,
            "category_scores": {},
            "recommendations": [],
            "confidence": 0.0,
            "reasoning_path": []
        }
        
        # Get relevant rules for this category
        if category.lower() in ["web development", "mobile development", "blockchain"]:
            category_node = "code_quality"
        elif category.lower() in ["ui/ux design", "graphic design"]:
            category_node = "design_quality"
        elif category.lower() in ["content writing", "copywriting"]:
            category_node = "content_quality"
        else:
            category_node = "code_quality"  # Default
            
        if category_node in self.knowledge_graph:
            weights = self.knowledge_graph.nodes[category_node]["weights"]
            
            for criterion, weight in weights.items():
                # Simulate criterion evaluation (would use actual MeTTa reasoning)
                score = self.evaluate_criterion(criterion, deliverables, work_data)
                assessment["category_scores"][criterion] = score
                assessment["overall_score"] += score * weight
                assessment["reasoning_path"].append(f"{criterion}: {score:.2f} (weight: {weight})")
        
        # Generate recommendations based on low scores
        for criterion, score in assessment["category_scores"].items():
            if score < 0.7:
                assessment["recommendations"].append(
                    f"Improve {criterion.replace('_', ' ')}: Current score {score:.2f}"
                )
        
        # Calculate confidence based on data completeness
        assessment["confidence"] = min(1.0, len(deliverables) * 0.3 + 0.4)
        
        return assessment
    
    def evaluate_criterion(self, criterion: str, deliverables: List[str], work_data: Dict) -> float:
        """Evaluate a specific criterion (simulated - would use actual MeTTa)"""
        # Simulate evaluation based on deliverables and work data
        base_score = np.random.uniform(0.6, 0.95)  # Simulate analysis
        
        # Adjust based on deliverable count and type
        if len(deliverables) > 0:
            base_score += 0.05
        
        # Adjust based on description quality
        description = work_data.get("description", "")
        if len(description) > 100:
            base_score += 0.02
            
        return min(1.0, base_score)
    
    def update_knowledge_from_feedback(self, work_id: str, feedback: Dict[str, Any]):
        """Update knowledge graph based on client feedback"""
        if work_id not in self.verification_history:
            self.verification_history[work_id] = []
            
        self.verification_history[work_id].append({
            "timestamp": datetime.now().isoformat(),
            "feedback": feedback,
            "type": "client_feedback"
        })
        
        # Update quality metrics based on feedback
        if "quality_rating" in feedback:
            category = feedback.get("category", "general")
            if category not in self.quality_metrics:
                self.quality_metrics[category] = []
            self.quality_metrics[category].append(feedback["quality_rating"])

@dataclass
class WorkVerificationContext:
    """Context for work verification using MeTTa reasoning"""
    work_id: str
    contract_id: int
    category: str
    deliverables: List[str]
    description: str
    requirements: List[str]
    freelancer_notes: str
    submission_timestamp: str
    
class WorkQualityAssessment:
    """Assessment result from MeTTa reasoning"""
    
    def __init__(self, metta_result: Dict[str, Any]):
        self.overall_score = metta_result["overall_score"]
        self.category_scores = metta_result["category_scores"]
        self.recommendations = metta_result["recommendations"]
        self.confidence = metta_result["confidence"]
        self.reasoning_path = metta_result["reasoning_path"]
        self.timestamp = datetime.now().isoformat()
    
    def is_approved(self, threshold: float = 0.75) -> bool:
        """Check if work meets approval threshold"""
        return self.overall_score >= threshold and self.confidence >= 0.6
    
    def get_improvement_suggestions(self) -> List[str]:
        """Get specific improvement suggestions"""
        suggestions = []
        
        for criterion, score in self.category_scores.items():
            if score < 0.7:
                suggestions.append(f"Focus on improving {criterion.replace('_', ' ')}")
                
        return suggestions
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert assessment to dictionary for storage/transmission"""
        return {
            "overall_score": self.overall_score,
            "category_scores": self.category_scores,
            "recommendations": self.recommendations,
            "confidence": self.confidence,
            "reasoning_path": self.reasoning_path,
            "timestamp": self.timestamp,
            "approved": self.is_approved(),
            "improvement_suggestions": self.get_improvement_suggestions()
        }

# Global MeTTa reasoner instance
metta_reasoner = MettaReasoner()
metta_reasoner.initialize_knowledge_base()

def create_work_verification_context(work_data: Dict[str, Any]) -> WorkVerificationContext:
    """Create verification context from work submission data"""
    return WorkVerificationContext(
        work_id=work_data.get("work_id", ""),
        contract_id=work_data.get("contract_id", 0),
        category=work_data.get("category", ""),
        deliverables=work_data.get("deliverables", []),
        description=work_data.get("description", ""),
        requirements=work_data.get("requirements", []),
        freelancer_notes=work_data.get("freelancer_notes", ""),
        submission_timestamp=work_data.get("submission_timestamp", datetime.now().isoformat())
    )

def assess_work_quality(context: WorkVerificationContext) -> WorkQualityAssessment:
    """Assess work quality using MeTTa reasoning"""
    work_data = {
        "category": context.category,
        "deliverables": context.deliverables,
        "description": context.description,
        "requirements": context.requirements,
        "freelancer_notes": context.freelancer_notes
    }
    
    metta_result = metta_reasoner.reason_about_work(work_data)
    return WorkQualityAssessment(metta_result)
