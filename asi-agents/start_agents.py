#!/usr/bin/env python3
"""
ChainLance ASI Agents Startup Script
Starts the coordinator and verification agents
"""

import asyncio
import subprocess
import sys
import os
import signal
import time
from pathlib import Path

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

class AgentManager:
    def __init__(self):
        self.processes = []
        self.running = True
        
    async def start_coordinator(self):
        """Start the agent coordinator"""
        print("🚀 Starting Agent Coordinator...")
        
        try:
            process = subprocess.Popen([
                sys.executable, "agent_coordinator.py"
            ], cwd=Path(__file__).parent)
            
            self.processes.append(("coordinator", process))
            print(f"✅ Agent Coordinator started with PID: {process.pid}")
            
            # Wait a bit for coordinator to initialize
            await asyncio.sleep(3)
            
        except Exception as e:
            print(f"❌ Failed to start coordinator: {e}")
            return False
            
        return True
    
    async def start_verification_agent(self, agent_id=1):
        """Start a verification agent"""
        print(f"🤖 Starting Verification Agent {agent_id}...")
        
        try:
            # Set unique port for each agent
            env = os.environ.copy()
            env["AGENT_PORT"] = str(8000 + agent_id)
            env["VERIFICATION_AGENT_SEED"] = f"chainlance_verification_agent_{agent_id}"
            
            process = subprocess.Popen([
                sys.executable, "verification_agent.py"
            ], cwd=Path(__file__).parent, env=env)
            
            self.processes.append((f"verification_agent_{agent_id}", process))
            print(f"✅ Verification Agent {agent_id} started with PID: {process.pid}")
            
            # Wait a bit for agent to initialize
            await asyncio.sleep(2)
            
        except Exception as e:
            print(f"❌ Failed to start verification agent {agent_id}: {e}")
            return False
            
        return True
    
    async def start_all_agents(self, num_verification_agents=2):
        """Start all agents"""
        print("🌟 Starting ChainLance ASI Agent Network...")
        print("=" * 50)
        
        # Start coordinator first
        if not await self.start_coordinator():
            print("❌ Failed to start coordinator, aborting...")
            return False
        
        # Start verification agents
        for i in range(1, num_verification_agents + 1):
            if not await self.start_verification_agent(i):
                print(f"❌ Failed to start verification agent {i}")
            await asyncio.sleep(1)  # Stagger startup
        
        print("\n🎉 All agents started successfully!")
        print("📊 Agent Status:")
        for name, process in self.processes:
            status = "Running" if process.poll() is None else "Stopped"
            print(f"  • {name}: {status} (PID: {process.pid})")
        
        return True
    
    async def monitor_agents(self):
        """Monitor agent health"""
        print("\n👀 Monitoring agents... (Press Ctrl+C to stop)")
        
        while self.running:
            try:
                # Check if any processes have died
                for name, process in self.processes:
                    if process.poll() is not None:
                        print(f"⚠️  Agent {name} has stopped unexpectedly!")
                        # Could implement restart logic here
                
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except KeyboardInterrupt:
                print("\n🛑 Shutdown signal received...")
                break
            except Exception as e:
                print(f"❌ Error monitoring agents: {e}")
                await asyncio.sleep(5)
    
    def stop_all_agents(self):
        """Stop all running agents"""
        print("\n🛑 Stopping all agents...")
        self.running = False
        
        for name, process in self.processes:
            if process.poll() is None:  # Process is still running
                print(f"  Stopping {name}...")
                try:
                    process.terminate()
                    process.wait(timeout=5)
                    print(f"  ✅ {name} stopped")
                except subprocess.TimeoutExpired:
                    print(f"  ⚠️  Force killing {name}...")
                    process.kill()
                    process.wait()
                except Exception as e:
                    print(f"  ❌ Error stopping {name}: {e}")
        
        print("🏁 All agents stopped")

def check_requirements():
    """Check if required dependencies are installed"""
    print("🔍 Checking requirements...")
    
    required_packages = [
        "uagents",
        "web3",
        "requests",
        "python-dotenv",
        "aiohttp"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing required packages: {', '.join(missing_packages)}")
        print("📦 Install them with: pip install " + " ".join(missing_packages))
        return False
    
    print("✅ All requirements satisfied")
    return True

def check_environment():
    """Check environment configuration"""
    print("🔧 Checking environment configuration...")
    
    env_file = Path(__file__).parent / ".env"
    if not env_file.exists():
        print("⚠️  .env file not found, using environment variables")
        print("💡 Copy .env.example to .env and configure it")
    
    # Check critical environment variables
    critical_vars = [
        "WEB3_PROVIDER",
        "ASI_VERIFIER_CONTRACT",
        "ORACLE_CONTRACT_ADDRESS"
    ]
    
    missing_vars = []
    for var in critical_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("🔧 These can be set in .env file or as environment variables")
    else:
        print("✅ Environment configuration looks good")
    
    return True

async def main():
    """Main function"""
    print("🌟 ChainLance ASI Agent Network Startup")
    print("=" * 50)
    
    # Pre-flight checks
    if not check_requirements():
        sys.exit(1)
    
    if not check_environment():
        print("⚠️  Environment issues detected, but continuing...")
    
    # Initialize agent manager
    manager = AgentManager()
    
    # Set up signal handlers for graceful shutdown
    def signal_handler(signum, frame):
        print(f"\n🛑 Received signal {signum}")
        manager.stop_all_agents()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Start all agents
        num_agents = int(os.getenv("NUM_VERIFICATION_AGENTS", "2"))
        success = await manager.start_all_agents(num_agents)
        
        if not success:
            print("❌ Failed to start agents")
            sys.exit(1)
        
        # Monitor agents
        await manager.monitor_agents()
        
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    finally:
        manager.stop_all_agents()

if __name__ == "__main__":
    # Check if we're in the right directory
    if not Path("verification_agent.py").exists():
        print("❌ Please run this script from the asi-agents directory")
        sys.exit(1)
    
    # Run the main function
    asyncio.run(main())
