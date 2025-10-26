#!/usr/bin/env python3
"""
ChainLance ASI System Startup
Starts HTTP bridge and agent system based on official Fetch.ai documentation
"""

import subprocess
import sys
import time
import os
import signal
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ASISystemManager:
    """Manages the ASI system components"""
    
    def __init__(self):
        self.processes = []
        self.http_bridge_port = int(os.getenv("HTTP_BRIDGE_PORT", "8080"))
        self.coordinator_port = int(os.getenv("AGENT_COORDINATOR_PORT", "8000"))
        
        # Register signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        print(f"\n🛑 Received signal {signum}, shutting down ASI system...")
        self.shutdown_system()
        sys.exit(0)
    
    def check_requirements(self) -> bool:
        """Check if required dependencies are available"""
        try:
            import uagents
            import fastapi
            import google.generativeai
            print("✅ All required packages available")
            return True
        except ImportError as e:
            print(f"❌ Missing required package: {e}")
            return False
    
    def start_http_bridge(self) -> bool:
        """Start HTTP bridge"""
        print("🌐 Starting HTTP Bridge...")
        
        try:
            process = subprocess.Popen([
                sys.executable, "http_bridge.py"
            ], cwd=os.path.dirname(__file__))
            
            self.processes.append(("HTTP Bridge", process))
            print(f"✅ HTTP Bridge started (PID: {process.pid}) on port {self.http_bridge_port}")
            
            # Wait for startup
            time.sleep(3)
            
            # Check if still running
            if process.poll() is None:
                return True
            else:
                print("❌ HTTP Bridge failed to start")
                return False
                
        except Exception as e:
            print(f"❌ Failed to start HTTP Bridge: {e}")
            return False
    
    def start_coordinator(self) -> bool:
        """Start Agentverse coordinator"""
        print("🤖 Starting Agentverse Coordinator...")
        
        try:
            process = subprocess.Popen([
                sys.executable, "agentverse_coordinator.py", str(self.coordinator_port)
            ], cwd=os.path.dirname(__file__))
            
            self.processes.append(("Coordinator", process))
            print(f"✅ Coordinator started (PID: {process.pid}) on port {self.coordinator_port}")
            
            # Wait for startup
            time.sleep(5)
            
            # Check if still running
            if process.poll() is None:
                return True
            else:
                print("❌ Coordinator failed to start")
                return False
                
        except Exception as e:
            print(f"❌ Failed to start Coordinator: {e}")
            return False
    
    def start_local_agents(self) -> bool:
        """Start local verification agents"""
        print("🔍 Starting Local Verification Agents...")
        
        agent_configs = [
            ("code_reviewer", 8001),
            ("quality_analyst", 8002), 
            ("requirements_validator", 8003)
        ]
        
        started_count = 0
        
        for agent_type, port in agent_configs:
            try:
                print(f"Starting {agent_type} agent on port {port}...")
                
                process = subprocess.Popen([
                    sys.executable, "chainlance_agent.py", agent_type, str(port)
                ], cwd=os.path.dirname(__file__))
                
                self.processes.append((f"{agent_type} Agent", process))
                started_count += 1
                
                print(f"✅ {agent_type} agent started (PID: {process.pid})")
                
                # Small delay between starts
                time.sleep(2)
                
            except Exception as e:
                print(f"❌ Failed to start {agent_type} agent: {e}")
        
        print(f"✅ Started {started_count}/{len(agent_configs)} local agents")
        return started_count > 0
    
    def check_system_health(self) -> dict:
        """Check health of all components"""
        active_processes = []
        
        for name, process in self.processes:
            if process.poll() is None:
                active_processes.append((name, process))
            else:
                print(f"⚠️ {name} has stopped (exit code: {process.returncode})")
        
        self.processes = active_processes
        
        return {
            "total_processes": len(self.processes),
            "all_healthy": len(self.processes) >= 2,  # At least bridge + coordinator
            "processes": [name for name, _ in self.processes]
        }
    
    def shutdown_system(self):
        """Shutdown all components"""
        print("🛑 Shutting down ASI system...")
        
        for name, process in self.processes:
            try:
                print(f"Stopping {name}...")
                process.terminate()
                
                # Wait for graceful shutdown
                try:
                    process.wait(timeout=5)
                    print(f"✅ {name} stopped gracefully")
                except subprocess.TimeoutExpired:
                    print(f"⚠️ Force killing {name}...")
                    process.kill()
                    process.wait()
                    
            except Exception as e:
                print(f"❌ Error stopping {name}: {e}")
        
        self.processes.clear()
        print("✅ ASI system shutdown complete")
    
    def start_system(self) -> bool:
        """Start the complete ASI system"""
        print("🚀 Starting ChainLance ASI System")
        print("=" * 50)
        
        # Check requirements
        if not self.check_requirements():
            return False
        
        # Check environment variables
        required_vars = ["GOOGLE_API_KEY"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            print(f"❌ Missing environment variables: {missing_vars}")
            return False
        
        print("✅ Environment variables configured")
        
        # Start components
        if not self.start_http_bridge():
            return False
        
        if not self.start_coordinator():
            return False
        
        # Local agents are optional
        self.start_local_agents()
        
        print("=" * 50)
        print("🎉 ChainLance ASI System started successfully!")
        print(f"📡 HTTP Bridge: http://localhost:{self.http_bridge_port}")
        print(f"🤖 Coordinator: localhost:{self.coordinator_port}")
        print(f"🔍 Local Agents: localhost:8001-8003")
        print("=" * 50)
        print("💡 The system is ready to process verification requests!")
        print("💡 Press Ctrl+C to stop the system")
        
        return True
    
    def monitor_system(self):
        """Monitor system health"""
        try:
            while True:
                time.sleep(30)  # Check every 30 seconds
                
                health = self.check_system_health()
                
                if not health["all_healthy"]:
                    print("⚠️ System health degraded")
                
                if health["total_processes"] == 0:
                    print("❌ All components stopped")
                    break
                    
        except KeyboardInterrupt:
            print("\n👋 Monitoring stopped by user")
        
        self.shutdown_system()

def main():
    """Main function"""
    manager = ASISystemManager()
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "start":
            if manager.start_system():
                manager.monitor_system()
        elif command == "test":
            print("🧪 Testing system components...")
            manager.check_requirements()
        else:
            print("Usage: python start_asi_system.py [start|test]")
    else:
        # Default: start system
        if manager.start_system():
            manager.monitor_system()

if __name__ == "__main__":
    main()
