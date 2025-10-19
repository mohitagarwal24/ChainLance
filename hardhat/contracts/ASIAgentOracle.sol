// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ASIAgentOracle
 * @dev Oracle contract for ASI agents to interact with the blockchain
 * Handles off-chain computation results and agent communication
 */
contract ASIAgentOracle is Ownable, ReentrancyGuard {
    
    struct AgentRequest {
        uint256 id;
        address requester;
        string requestType; // "verification", "analysis", "recommendation"
        string inputData; // JSON or IPFS hash
        uint256 timestamp;
        bool fulfilled;
        string result;
        address fulfillmentAgent;
        uint256 fulfillmentTime;
    }

    struct AgentRegistration {
        address agentAddress;
        string agentId; // Fetch.ai agent ID
        string capabilities; // JSON describing what the agent can do
        string endpoint; // Agent communication endpoint
        bool isActive;
        uint256 registrationTime;
        uint256 totalRequests;
        uint256 successfulRequests;
    }

    mapping(uint256 => AgentRequest) public requests;
    mapping(address => AgentRegistration) public agents;
    mapping(string => address) public agentIdToAddress;
    
    uint256 public nextRequestId = 1;
    uint256 public requestTimeout = 1 hours;
    
    // Events
    event AgentRegistered(address indexed agentAddress, string agentId);
    event RequestCreated(uint256 indexed requestId, address indexed requester, string requestType);
    event RequestFulfilled(uint256 indexed requestId, address indexed agent, string result);
    event RequestTimeout(uint256 indexed requestId);

    modifier onlyRegisteredAgent() {
        require(agents[msg.sender].isActive, "Agent not registered or inactive");
        _;
    }

    /**
     * @dev Register an ASI agent
     */
    function registerAgent(
        string memory _agentId,
        string memory _capabilities,
        string memory _endpoint
    ) external {
        require(bytes(_agentId).length > 0, "Agent ID cannot be empty");
        require(agentIdToAddress[_agentId] == address(0), "Agent ID already registered");
        
        agents[msg.sender] = AgentRegistration({
            agentAddress: msg.sender,
            agentId: _agentId,
            capabilities: _capabilities,
            endpoint: _endpoint,
            isActive: true,
            registrationTime: block.timestamp,
            totalRequests: 0,
            successfulRequests: 0
        });
        
        agentIdToAddress[_agentId] = msg.sender;
        
        emit AgentRegistered(msg.sender, _agentId);
    }

    /**
     * @dev Create a request for ASI agents
     */
    function createRequest(
        string memory _requestType,
        string memory _inputData
    ) external returns (uint256) {
        uint256 requestId = nextRequestId++;
        
        requests[requestId] = AgentRequest({
            id: requestId,
            requester: msg.sender,
            requestType: _requestType,
            inputData: _inputData,
            timestamp: block.timestamp,
            fulfilled: false,
            result: "",
            fulfillmentAgent: address(0),
            fulfillmentTime: 0
        });
        
        emit RequestCreated(requestId, msg.sender, _requestType);
        
        return requestId;
    }

    /**
     * @dev Fulfill a request (called by ASI agent)
     */
    function fulfillRequest(
        uint256 _requestId,
        string memory _result
    ) external onlyRegisteredAgent nonReentrant {
        require(_requestId < nextRequestId, "Invalid request ID");
        
        AgentRequest storage request = requests[_requestId];
        require(!request.fulfilled, "Request already fulfilled");
        require(block.timestamp <= request.timestamp + requestTimeout, "Request timeout");
        
        request.fulfilled = true;
        request.result = _result;
        request.fulfillmentAgent = msg.sender;
        request.fulfillmentTime = block.timestamp;
        
        // Update agent stats
        AgentRegistration storage agent = agents[msg.sender];
        agent.totalRequests++;
        agent.successfulRequests++;
        
        emit RequestFulfilled(_requestId, msg.sender, _result);
    }

    /**
     * @dev Mark request as timed out
     */
    function markTimeout(uint256 _requestId) external {
        require(_requestId < nextRequestId, "Invalid request ID");
        
        AgentRequest storage request = requests[_requestId];
        require(!request.fulfilled, "Request already fulfilled");
        require(block.timestamp > request.timestamp + requestTimeout, "Request not timed out yet");
        
        emit RequestTimeout(_requestId);
    }

    /**
     * @dev Update agent status
     */
    function updateAgentStatus(bool _isActive) external {
        require(agents[msg.sender].agentAddress != address(0), "Agent not registered");
        agents[msg.sender].isActive = _isActive;
    }

    /**
     * @dev Update agent capabilities
     */
    function updateAgentCapabilities(string memory _capabilities) external {
        require(agents[msg.sender].agentAddress != address(0), "Agent not registered");
        agents[msg.sender].capabilities = _capabilities;
    }

    /**
     * @dev Get request details
     */
    function getRequest(uint256 _requestId) external view returns (AgentRequest memory) {
        return requests[_requestId];
    }

    /**
     * @dev Get agent details
     */
    function getAgent(address _agentAddress) external view returns (AgentRegistration memory) {
        return agents[_agentAddress];
    }

    /**
     * @dev Get agent by ID
     */
    function getAgentByID(string memory _agentId) external view returns (AgentRegistration memory) {
        address agentAddress = agentIdToAddress[_agentId];
        return agents[agentAddress];
    }

    /**
     * @dev Check if request is fulfilled
     */
    function isRequestFulfilled(uint256 _requestId) external view returns (bool) {
        return requests[_requestId].fulfilled;
    }

    /**
     * @dev Get pending requests for an agent type
     */
    function getPendingRequests(string memory _requestType) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // Count pending requests of this type
        for (uint256 i = 1; i < nextRequestId; i++) {
            if (!requests[i].fulfilled && 
                keccak256(bytes(requests[i].requestType)) == keccak256(bytes(_requestType)) &&
                block.timestamp <= requests[i].timestamp + requestTimeout) {
                count++;
            }
        }
        
        // Create array of pending request IDs
        uint256[] memory pendingIds = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i < nextRequestId; i++) {
            if (!requests[i].fulfilled && 
                keccak256(bytes(requests[i].requestType)) == keccak256(bytes(_requestType)) &&
                block.timestamp <= requests[i].timestamp + requestTimeout) {
                pendingIds[index] = i;
                index++;
            }
        }
        
        return pendingIds;
    }

    /**
     * @dev Admin functions
     */
    function setRequestTimeout(uint256 _timeout) external onlyOwner {
        requestTimeout = _timeout;
    }

    function deactivateAgent(address _agentAddress) external onlyOwner {
        agents[_agentAddress].isActive = false;
    }

    function activateAgent(address _agentAddress) external onlyOwner {
        require(agents[_agentAddress].agentAddress != address(0), "Agent not registered");
        agents[_agentAddress].isActive = true;
    }
}
