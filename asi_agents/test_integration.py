#!/usr/bin/env python3
"""
Test script to verify ChainLance ASI integration
Tests the complete flow from HTTP bridge to agent verification
"""

import asyncio
import json
import requests
import time
from datetime import datetime

# Test configuration
HTTP_BRIDGE_URL = "http://localhost:8080"
TEST_JOB_DATA = {
    "job_id": 1,
    "title": "Test Web Development Project",
    "description": "Build a responsive React website with modern UI/UX",
    "category": "Web Development",
    "budget": 1000.0,
    "skills_required": ["React", "TypeScript", "TailwindCSS"],
    "deadline": "2024-12-31T23:59:59Z",
    "client_address": "0x1234567890123456789012345678901234567890"
}

TEST_DELIVERABLE_DATA = {
    "contract_id": 1,
    "milestone_index": 0,
    "deliverable_url": "https://github.com/test-user/test-project",
    "deliverable_type": "github",
    "description": "Completed React website with all requested features",
    "submitted_at": datetime.now().isoformat(),
    "freelancer_address": "0x0987654321098765432109876543210987654321"
}

def test_health_check():
    """Test if HTTP bridge is running"""
    print("🏥 Testing health check...")
    try:
        response = requests.get(f"{HTTP_BRIDGE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ HTTP Bridge is healthy")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to HTTP Bridge: {e}")
        return False

def test_active_agents():
    """Test agent discovery"""
    print("🤖 Testing active agents endpoint...")
    try:
        response = requests.get(f"{HTTP_BRIDGE_URL}/active_agents", timeout=10)
        if response.status_code == 200:
            agents = response.json()
            print(f"✅ Found {len(agents)} active agents")
            for agent in agents[:3]:  # Show first 3 agents
                print(f"   - {agent.get('name', 'Unknown')}: {agent.get('specialization', [])}")
            return True
        else:
            print(f"❌ Active agents check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error checking active agents: {e}")
        return False

def test_network_stats():
    """Test network statistics"""
    print("📊 Testing network stats...")
    try:
        response = requests.get(f"{HTTP_BRIDGE_URL}/network_stats", timeout=10)
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Network stats: {stats.get('active_agents', 0)} active agents")
            return True
        else:
            print(f"❌ Network stats failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error getting network stats: {e}")
        return False

def test_verification_submission():
    """Test work verification submission"""
    print("📝 Testing verification submission...")
    try:
        payload = {
            "job_data": TEST_JOB_DATA,
            "deliverable_data": TEST_DELIVERABLE_DATA
        }
        
        response = requests.post(
            f"{HTTP_BRIDGE_URL}/submit_verification",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            request_id = result.get("request_id")
            print(f"✅ Verification submitted successfully: {request_id}")
            return request_id
        else:
            print(f"❌ Verification submission failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error submitting verification: {e}")
        return None

def test_verification_status(request_id):
    """Test verification status checking"""
    print(f"🔍 Testing verification status for: {request_id}")
    
    max_attempts = 12  # 2 minutes with 10-second intervals
    attempt = 0
    
    while attempt < max_attempts:
        try:
            response = requests.get(
                f"{HTTP_BRIDGE_URL}/verification_status/{request_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                status = response.json()
                print(f"📊 Status: {status.get('status', 'unknown')}")
                
                if status.get('completed'):
                    print(f"✅ Verification completed!")
                    print(f"   - Approved: {status.get('approved', False)}")
                    print(f"   - Confidence: {status.get('confidence_score', 0):.2f}")
                    print(f"   - Agent Count: {status.get('agent_count', 0)}")
                    print(f"   - Payment Released: {status.get('payment_released', False)}")
                    return True
                else:
                    print(f"⏳ Still processing... (attempt {attempt + 1}/{max_attempts})")
                    time.sleep(10)
                    attempt += 1
            else:
                print(f"❌ Status check failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error checking status: {e}")
            return False
    
    print("⏰ Verification timed out")
    return False

def run_integration_test():
    """Run complete integration test"""
    print("🚀 Starting ChainLance ASI Integration Test")
    print("=" * 50)
    
    # Test 1: Health check
    if not test_health_check():
        print("❌ Integration test failed: HTTP Bridge not available")
        return False
    
    # Test 2: Agent discovery
    if not test_active_agents():
        print("⚠️ Warning: No active agents found, but continuing...")
    
    # Test 3: Network stats
    if not test_network_stats():
        print("⚠️ Warning: Network stats unavailable, but continuing...")
    
    # Test 4: Verification submission
    request_id = test_verification_submission()
    if not request_id:
        print("❌ Integration test failed: Cannot submit verification")
        return False
    
    # Test 5: Verification status tracking
    if not test_verification_status(request_id):
        print("❌ Integration test failed: Verification did not complete")
        return False
    
    print("=" * 50)
    print("🎉 Integration test completed successfully!")
    print("✅ All ASI components are working correctly")
    return True

def main():
    """Main function"""
    try:
        success = run_integration_test()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n👋 Test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        exit(1)

if __name__ == "__main__":
    main()
