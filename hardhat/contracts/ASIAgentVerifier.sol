// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IChainLanceCore {
    function verifyMilestone(uint256 _contractId, uint256 _milestoneIndex, bool _approved) external;
}

/**
 * @title ASIAgentVerifier
 * @dev Contract for ASI agents to verify work deliverables and trigger payments
 * Integrates with Fetch.ai ASI agents for autonomous verification
 */
contract ASIAgentVerifier is Ownable, ReentrancyGuard {
    
    IChainLanceCore public chainLanceCore;
    
    // Registered ASI agents
    mapping(address => bool) public registeredAgents;
    mapping(address => string) public agentMetadata; // IPFS hash or agent info
    
    // Verification requests
    struct VerificationRequest {
        uint256 contractId;
        uint256 milestoneIndex;
        address requestor;
        string deliverableHash;
        string verificationCriteria;
        uint256 requestTime;
        bool completed;
        bool approved;
        address verifyingAgent;
        string verificationReport;
    }
    
    mapping(uint256 => VerificationRequest) public verificationRequests;
    mapping(bytes32 => uint256) public requestHashes; // Hash of (contractId, milestoneIndex) => requestId
    uint256 public nextRequestId = 1;
    
    // Agent performance tracking
    struct AgentStats {
        uint256 totalVerifications;
        uint256 correctVerifications;
        uint256 disputedVerifications;
        uint256 averageResponseTime;
        bool isActive;
    }
    
    mapping(address => AgentStats) public agentStats;
    
    // Verification criteria templates
    mapping(string => string) public verificationTemplates; // category => criteria template
    
    // Events
    event AgentRegistered(address indexed agent, string metadata);
    event AgentDeregistered(address indexed agent);
    event VerificationRequested(uint256 indexed requestId, uint256 indexed contractId, uint256 milestoneIndex);
    event VerificationCompleted(uint256 indexed requestId, bool approved, address indexed agent);
    event VerificationDisputed(uint256 indexed requestId, address indexed disputer);
    event TemplateUpdated(string indexed category, string criteria);

    modifier onlyRegisteredAgent() {
        require(registeredAgents[msg.sender], "Not a registered agent");
        _;
    }

    modifier onlyChainLanceCore() {
        require(msg.sender == address(chainLanceCore), "Only ChainLance core can call");
        _;
    }

    constructor(address _chainLanceCore) {
        chainLanceCore = IChainLanceCore(_chainLanceCore);
        
        // Initialize default verification templates
        _initializeTemplates();
    }

    /**
     * @dev Initialize default verification templates for different job categories
     */
    function _initializeTemplates() internal {
        verificationTemplates["Web Development"] = "Check code compilation, test coverage >80%, responsive design, security best practices";
        verificationTemplates["Mobile Development"] = "App builds successfully, UI/UX guidelines followed, performance optimized, security implemented";
        verificationTemplates["Design"] = "Design meets specifications, proper file formats, source files included, brand guidelines followed";
        verificationTemplates["Writing"] = "Grammar check, plagiarism check, word count met, style guide followed, SEO optimized";
        verificationTemplates["Marketing"] = "Campaign metrics met, target audience reached, ROI demonstrated, compliance verified";
        verificationTemplates["Data Science"] = "Data quality verified, model accuracy >threshold, documentation complete, reproducible results";
        verificationTemplates["Blockchain"] = "Smart contract security audit, gas optimization, test coverage >90%, documentation complete";
        verificationTemplates["AI/ML"] = "Model performance metrics, data preprocessing quality, ethical AI guidelines, deployment ready";
    }

    /**
     * @dev Register a new ASI agent
     */
    function registerAgent(address _agent, string memory _metadata) external onlyOwner {
        require(_agent != address(0), "Invalid agent address");
        require(!registeredAgents[_agent], "Agent already registered");
        
        registeredAgents[_agent] = true;
        agentMetadata[_agent] = _metadata;
        agentStats[_agent].isActive = true;
        
        emit AgentRegistered(_agent, _metadata);
    }

    /**
     * @dev Deregister an ASI agent
     */
    function deregisterAgent(address _agent) external onlyOwner {
        require(registeredAgents[_agent], "Agent not registered");
        
        registeredAgents[_agent] = false;
        agentStats[_agent].isActive = false;
        
        emit AgentDeregistered(_agent);
    }

    /**
     * @dev Request verification for a milestone deliverable
     */
    function requestVerification(
        uint256 _contractId,
        uint256 _milestoneIndex,
        string memory _deliverableHash,
        string memory _category,
        string memory _customCriteria
    ) external returns (uint256) {
        bytes32 requestHash = keccak256(abi.encodePacked(_contractId, _milestoneIndex));
        require(requestHashes[requestHash] == 0, "Verification already requested for this milestone");
        
        uint256 requestId = nextRequestId++;
        
        // Use custom criteria or template
        string memory criteria = bytes(_customCriteria).length > 0 
            ? _customCriteria 
            : verificationTemplates[_category];
        
        verificationRequests[requestId] = VerificationRequest({
            contractId: _contractId,
            milestoneIndex: _milestoneIndex,
            requestor: msg.sender,
            deliverableHash: _deliverableHash,
            verificationCriteria: criteria,
            requestTime: block.timestamp,
            completed: false,
            approved: false,
            verifyingAgent: address(0),
            verificationReport: ""
        });
        
        requestHashes[requestHash] = requestId;
        
        emit VerificationRequested(requestId, _contractId, _milestoneIndex);
        
        return requestId;
    }

    /**
     * @dev ASI agent submits verification result
     */
    function submitVerification(
        uint256 _requestId,
        bool _approved,
        string memory _verificationReport
    ) external onlyRegisteredAgent nonReentrant {
        require(_requestId < nextRequestId, "Invalid request ID");
        
        VerificationRequest storage request = verificationRequests[_requestId];
        require(!request.completed, "Verification already completed");
        require(agentStats[msg.sender].isActive, "Agent is not active");
        
        // Update request
        request.completed = true;
        request.approved = _approved;
        request.verifyingAgent = msg.sender;
        request.verificationReport = _verificationReport;
        
        // Update agent stats
        AgentStats storage stats = agentStats[msg.sender];
        stats.totalVerifications++;
        
        // Calculate response time
        uint256 responseTime = block.timestamp - request.requestTime;
        stats.averageResponseTime = (stats.averageResponseTime * (stats.totalVerifications - 1) + responseTime) / stats.totalVerifications;
        
        // Notify ChainLance core contract
        chainLanceCore.verifyMilestone(request.contractId, request.milestoneIndex, _approved);
        
        emit VerificationCompleted(_requestId, _approved, msg.sender);
    }

    /**
     * @dev Batch verification for multiple requests (for efficiency)
     */
    function batchVerification(
        uint256[] memory _requestIds,
        bool[] memory _approvals,
        string[] memory _reports
    ) external onlyRegisteredAgent nonReentrant {
        require(_requestIds.length == _approvals.length, "Arrays length mismatch");
        require(_requestIds.length == _reports.length, "Arrays length mismatch");
        require(_requestIds.length <= 10, "Too many requests in batch");
        
        for (uint256 i = 0; i < _requestIds.length; i++) {
            submitVerification(_requestIds[i], _approvals[i], _reports[i]);
        }
    }

    /**
     * @dev Dispute a verification result
     */
    function disputeVerification(uint256 _requestId, string memory _reason) external {
        VerificationRequest storage request = verificationRequests[_requestId];
        require(request.completed, "Verification not completed");
        require(msg.sender == request.requestor, "Only requestor can dispute");
        
        // Mark agent verification as disputed
        AgentStats storage stats = agentStats[request.verifyingAgent];
        stats.disputedVerifications++;
        
        emit VerificationDisputed(_requestId, msg.sender);
        
        // TODO: Implement dispute resolution mechanism
        // This could involve multiple agents, human arbitrators, or DAO voting
    }

    /**
     * @dev Update verification template for a category
     */
    function updateVerificationTemplate(string memory _category, string memory _criteria) external onlyOwner {
        verificationTemplates[_category] = _criteria;
        emit TemplateUpdated(_category, _criteria);
    }

    /**
     * @dev Get agent performance metrics
     */
    function getAgentStats(address _agent) external view returns (AgentStats memory) {
        return agentStats[_agent];
    }

    /**
     * @dev Get verification request details
     */
    function getVerificationRequest(uint256 _requestId) external view returns (VerificationRequest memory) {
        return verificationRequests[_requestId];
    }

    /**
     * @dev Get verification template for category
     */
    function getVerificationTemplate(string memory _category) external view returns (string memory) {
        return verificationTemplates[_category];
    }

    /**
     * @dev Check if milestone has pending verification
     */
    function hasPendingVerification(uint256 _contractId, uint256 _milestoneIndex) external view returns (bool) {
        bytes32 requestHash = keccak256(abi.encodePacked(_contractId, _milestoneIndex));
        uint256 requestId = requestHashes[requestHash];
        
        if (requestId == 0) return false;
        
        VerificationRequest storage request = verificationRequests[requestId];
        return !request.completed;
    }

    /**
     * @dev Get all active agents
     */
    function getActiveAgents() external view returns (address[] memory activeAgents) {
        // Note: This is a simplified implementation
        // In production, you'd want to maintain a separate array of active agents
        // for gas efficiency
        
        // For now, return empty array - implement proper tracking in production
        return new address[](0);
    }

    /**
     * @dev Emergency functions
     */
    function pauseAgent(address _agent) external onlyOwner {
        agentStats[_agent].isActive = false;
    }

    function unpauseAgent(address _agent) external onlyOwner {
        require(registeredAgents[_agent], "Agent not registered");
        agentStats[_agent].isActive = true;
    }

    /**
     * @dev Update ChainLance core contract address
     */
    function updateChainLanceCore(address _newCore) external onlyOwner {
        require(_newCore != address(0), "Invalid address");
        chainLanceCore = IChainLanceCore(_newCore);
    }
}
