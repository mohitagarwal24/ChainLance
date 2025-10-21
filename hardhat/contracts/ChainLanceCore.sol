// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChainLanceCore
 * @dev Main contract for the ChainLance decentralized freelancing platform
 * Handles job posting, bidding, escrow, and payments with ASI agent integration
 */
contract ChainLanceCore is ReentrancyGuard, Ownable {
    // Counters for IDs
    uint256 private _jobIds;
    uint256 private _bidIds;
    uint256 private _contractIds;

    constructor(address _pyusdToken, address _asiAgentVerifier) Ownable(msg.sender) {
        pyusdToken = IERC20(_pyusdToken);
        asiAgentVerifier = _asiAgentVerifier;
    }

    // PYUSD token contract
    IERC20 public immutable pyusdToken;
    
    // Platform fee (in basis points, e.g., 300 = 3%)
    uint256 public platformFee = 300; // 3%
    uint256 public constant MAX_PLATFORM_FEE = 1000; // 10% max
    
    // Minimum escrow deposit percentage (in basis points)
    uint256 public constant MIN_ESCROW_DEPOSIT = 1000; // 10%
    uint256 public constant MAX_ESCROW_DEPOSIT = 2000; // 20%

    // ASI Agent verification contract
    address public asiAgentVerifier;

    enum JobStatus { Open, InProgress, Completed, Cancelled, Disputed }
    enum ContractType { Fixed, Hourly, Milestone }
    enum BidStatus { Pending, Accepted, Rejected, Withdrawn }
    enum MilestoneStatus { Pending, Submitted, Approved, Disputed }

    struct Job {
        uint256 id;
        address client;
        string title;
        string description;
        string category;
        string[] requiredSkills;
        uint256 budget;
        ContractType contractType;
        uint256 escrowDeposit;
        JobStatus status;
        uint256 deadline;
        string experienceLevel;
        string projectDuration;
        uint256 numberOfMilestones;
        uint256 bidsCount;
        uint256 viewsCount;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Bid {
        uint256 id;
        uint256 jobId;
        address freelancer;
        uint256 proposedAmount;
        uint256 stakeAmount;
        string coverLetter;
        string estimatedTimeline;
        string[] proposedMilestones;
        BidStatus status;
        uint256 createdAt;
    }

    struct FreelanceContract {
        uint256 id;
        uint256 jobId;
        uint256 bidId;
        address client;
        address freelancer;
        uint256 totalAmount;
        uint256 escrowAmount;
        ContractType contractType;
        uint256 hourlyRate;
        uint256 hoursAllocated;
        JobStatus status;
        uint256 startDate;
        uint256 endDate;
        uint256 completionDate;
        Milestone[] milestones;
        uint256 createdAt;
    }

    struct Milestone {
        string name;
        uint256 amount;
        string description;
        MilestoneStatus status;
        uint256 submissionDate;
        uint256 approvalDeadline;
        bool asiVerified;
        string deliverableHash; // IPFS hash or similar
    }

    struct Profile {
        address wallet;
        string displayName;
        string bio;
        string location;
        string[] skills;
        string[] portfolioLinks;
        uint256 hourlyRate;
        uint256 totalEarned;
        uint256 totalSpent;
        uint256 jobsCompleted;
        uint256 successRate;
        uint256 averageRating;
        uint256 totalReviews;
        bool isVerified;
        uint256 createdAt;
    }

    // Storage mappings
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Bid) public bids;
    mapping(uint256 => FreelanceContract) public contracts;
    mapping(address => Profile) public profiles;
    mapping(uint256 => uint256[]) public jobBids; // jobId => bidIds[]
    mapping(address => uint256[]) public userJobs; // user => jobIds[]
    mapping(address => uint256[]) public userBids; // user => bidIds[]
    mapping(address => uint256[]) public userContracts; // user => contractIds[]
    
    // Escrow balances
    mapping(uint256 => uint256) public escrowBalances; // contractId => amount
    mapping(uint256 => uint256) public stakeBalances; // bidId => amount

    // Events
    event JobPosted(uint256 indexed jobId, address indexed client, uint256 budget);
    event BidPlaced(uint256 indexed bidId, uint256 indexed jobId, address indexed freelancer, uint256 amount);
    event BidAccepted(uint256 indexed bidId, uint256 indexed contractId);
    event ContractCreated(uint256 indexed contractId, uint256 indexed jobId, address client, address freelancer);
    event MilestoneSubmitted(uint256 indexed contractId, uint256 milestoneIndex, string deliverableHash);
    event MilestoneApproved(uint256 indexed contractId, uint256 milestoneIndex, uint256 amount);
    event PaymentReleased(uint256 indexed contractId, address indexed freelancer, uint256 amount);
    event StakeSlashed(uint256 indexed bidId, address indexed freelancer, uint256 amount);
    event ASIVerificationCompleted(uint256 indexed contractId, uint256 milestoneIndex, bool approved);
    event ProfileUpdated(address indexed user, string displayName);


    modifier onlyASIAgent() {
        require(msg.sender == asiAgentVerifier, "Only ASI agent can call this function");
        _;
    }

    modifier jobExists(uint256 _jobId) {
        require(_jobId > 0 && _jobId <= _jobIds, "Job does not exist");
        _;
    }

    modifier bidExists(uint256 _bidId) {
        require(_bidId > 0 && _bidId <= _bidIds, "Bid does not exist");
        _;
    }

    modifier contractExists(uint256 _contractId) {
        require(_contractId > 0 && _contractId <= _contractIds, "Contract does not exist");
        _;
    }

    /**
     * @dev Create or update user profile
     */
    function updateProfile(
        string memory _displayName,
        string memory _bio,
        string memory _location,
        string[] memory _skills,
        string[] memory _portfolioLinks,
        uint256 _hourlyRate
    ) external {
        Profile storage profile = profiles[msg.sender];
        
        if (profile.wallet == address(0)) {
            profile.wallet = msg.sender;
            profile.createdAt = block.timestamp;
        }
        
        profile.displayName = _displayName;
        profile.bio = _bio;
        profile.location = _location;
        profile.skills = _skills;
        profile.portfolioLinks = _portfolioLinks;
        profile.hourlyRate = _hourlyRate;
        
        emit ProfileUpdated(msg.sender, _displayName);
    }

    /**
     * @dev Post a new job with escrow deposit
     */
    function postJob(
        string memory _title,
        string memory _description,
        string memory _category,
        string[] memory _requiredSkills,
        uint256 _budget,
        ContractType _contractType,
        uint256 _deadline,
        string memory _experienceLevel,
        string memory _projectDuration,
        uint256 _numberOfMilestones
    ) external nonReentrant {
        require(_budget > 0, "Budget must be greater than 0");
        require(bytes(_title).length > 0, "Title cannot be empty");
        
        // Calculate required escrow deposit (10-20% of budget)
        uint256 escrowDeposit = (_budget * MIN_ESCROW_DEPOSIT) / 10000;
        
        // Transfer escrow deposit from client
        require(
            pyusdToken.transferFrom(msg.sender, address(this), escrowDeposit),
            "Escrow deposit transfer failed"
        );

        _jobIds++;
        uint256 jobId = _jobIds;

        Job storage job = jobs[jobId];
        job.id = jobId;
        job.client = msg.sender;
        job.title = _title;
        job.description = _description;
        job.category = _category;
        job.requiredSkills = _requiredSkills;
        job.budget = _budget;
        job.contractType = _contractType;
        job.escrowDeposit = escrowDeposit;
        job.status = JobStatus.Open;
        job.deadline = _deadline;
        job.experienceLevel = _experienceLevel;
        job.projectDuration = _projectDuration;
        job.numberOfMilestones = _numberOfMilestones;
        job.createdAt = block.timestamp;
        job.updatedAt = block.timestamp;

        userJobs[msg.sender].push(jobId);

        emit JobPosted(jobId, msg.sender, _budget);
    }

    /**
     * @dev Place a bid on a job with stake
     */
    function placeBid(
        uint256 _jobId,
        uint256 _proposedAmount,
        string memory _coverLetter,
        string memory _estimatedTimeline,
        string[] memory _proposedMilestones
    ) external jobExists(_jobId) nonReentrant {
        Job storage job = jobs[_jobId];
        require(job.status == JobStatus.Open, "Job is not open for bidding");
        require(job.client != msg.sender, "Cannot bid on your own job");
        require(_proposedAmount > 0, "Proposed amount must be greater than 0");

        // Calculate stake amount (10% of proposed amount)
        uint256 stakeAmount = (_proposedAmount * 1000) / 10000; // 10%
        
        // Transfer stake from freelancer
        require(
            pyusdToken.transferFrom(msg.sender, address(this), stakeAmount),
            "Stake transfer failed"
        );

        _bidIds++;
        uint256 bidId = _bidIds;

        Bid storage bid = bids[bidId];
        bid.id = bidId;
        bid.jobId = _jobId;
        bid.freelancer = msg.sender;
        bid.proposedAmount = _proposedAmount;
        bid.stakeAmount = stakeAmount;
        bid.coverLetter = _coverLetter;
        bid.estimatedTimeline = _estimatedTimeline;
        bid.proposedMilestones = _proposedMilestones;
        bid.status = BidStatus.Pending;
        bid.createdAt = block.timestamp;

        jobBids[_jobId].push(bidId);
        userBids[msg.sender].push(bidId);
        stakeBalances[bidId] = stakeAmount;
        
        job.bidsCount++;
        job.updatedAt = block.timestamp;

        emit BidPlaced(bidId, _jobId, msg.sender, _proposedAmount);
    }

    /**
     * @dev Accept a bid and create a contract
     */
    function acceptBid(uint256 _bidId) external bidExists(_bidId) nonReentrant {
        Bid storage bid = bids[_bidId];
        Job storage job = jobs[bid.jobId];
        
        require(job.client == msg.sender, "Only job client can accept bids");
        require(bid.status == BidStatus.Pending, "Bid is not pending");
        require(job.status == JobStatus.Open, "Job is not open");

        // Transfer remaining escrow amount (total - initial deposit)
        uint256 remainingEscrow = bid.proposedAmount - job.escrowDeposit;
        if (remainingEscrow > 0) {
            require(
                pyusdToken.transferFrom(msg.sender, address(this), remainingEscrow),
                "Remaining escrow transfer failed"
            );
        }

        _contractIds++;
        uint256 contractId = _contractIds;

        // Create contract
        FreelanceContract storage newContract = contracts[contractId];
        newContract.id = contractId;
        newContract.jobId = bid.jobId;
        newContract.bidId = _bidId;
        newContract.client = job.client;
        newContract.freelancer = bid.freelancer;
        newContract.totalAmount = bid.proposedAmount;
        newContract.escrowAmount = bid.proposedAmount;
        newContract.contractType = job.contractType;
        newContract.status = JobStatus.InProgress;
        newContract.startDate = block.timestamp;
        newContract.createdAt = block.timestamp;

        // Create milestones if milestone-based contract
        if (job.contractType == ContractType.Milestone) {
            uint256 milestoneAmount = bid.proposedAmount / job.numberOfMilestones;
            for (uint256 i = 0; i < job.numberOfMilestones; i++) {
                Milestone memory milestone = Milestone({
                    name: i < bid.proposedMilestones.length ? bid.proposedMilestones[i] : string(abi.encodePacked("Milestone ", i + 1)),
                    amount: i == job.numberOfMilestones - 1 ? bid.proposedAmount - (milestoneAmount * i) : milestoneAmount,
                    description: "",
                    status: MilestoneStatus.Pending,
                    submissionDate: 0,
                    approvalDeadline: 0,
                    asiVerified: false,
                    deliverableHash: ""
                });
                newContract.milestones.push(milestone);
            }
        }

        // Update statuses
        bid.status = BidStatus.Accepted;
        job.status = JobStatus.InProgress;
        
        // Store escrow
        escrowBalances[contractId] = bid.proposedAmount;
        
        // Add to user contracts
        userContracts[job.client].push(contractId);
        userContracts[bid.freelancer].push(contractId);

        // Reject all other bids and refund stakes
        uint256[] memory jobBidIds = jobBids[bid.jobId];
        for (uint256 i = 0; i < jobBidIds.length; i++) {
            if (jobBidIds[i] != _bidId && bids[jobBidIds[i]].status == BidStatus.Pending) {
                bids[jobBidIds[i]].status = BidStatus.Rejected;
                uint256 stakeToRefund = stakeBalances[jobBidIds[i]];
                if (stakeToRefund > 0) {
                    stakeBalances[jobBidIds[i]] = 0;
                    pyusdToken.transfer(bids[jobBidIds[i]].freelancer, stakeToRefund);
                }
            }
        }

        emit BidAccepted(_bidId, contractId);
        emit ContractCreated(contractId, bid.jobId, job.client, bid.freelancer);
    }

    /**
     * @dev Submit milestone deliverable
     */
    function submitMilestone(
        uint256 _contractId,
        uint256 _milestoneIndex,
        string memory _deliverableHash
    ) external contractExists(_contractId) {
        FreelanceContract storage contractData = contracts[_contractId];
        require(contractData.freelancer == msg.sender, "Only freelancer can submit milestones");
        require(_milestoneIndex < contractData.milestones.length, "Invalid milestone index");
        
        Milestone storage milestone = contractData.milestones[_milestoneIndex];
        require(milestone.status == MilestoneStatus.Pending, "Milestone already submitted");
        
        milestone.status = MilestoneStatus.Submitted;
        milestone.submissionDate = block.timestamp;
        milestone.approvalDeadline = block.timestamp + 14 days; // 14-day approval window
        milestone.deliverableHash = _deliverableHash;
        
        emit MilestoneSubmitted(_contractId, _milestoneIndex, _deliverableHash);
    }

    /**
     * @dev ASI agent verification of milestone
     */
    function verifyMilestone(
        uint256 _contractId,
        uint256 _milestoneIndex,
        bool _approved
    ) external onlyASIAgent contractExists(_contractId) {
        FreelanceContract storage contractData = contracts[_contractId];
        require(_milestoneIndex < contractData.milestones.length, "Invalid milestone index");
        
        Milestone storage milestone = contractData.milestones[_milestoneIndex];
        require(milestone.status == MilestoneStatus.Submitted, "Milestone not submitted");
        
        milestone.asiVerified = _approved;
        
        emit ASIVerificationCompleted(_contractId, _milestoneIndex, _approved);
    }

    /**
     * @dev Approve milestone and release payment
     */
    function approveMilestone(uint256 _contractId, uint256 _milestoneIndex) 
        external 
        contractExists(_contractId) 
        nonReentrant 
    {
        FreelanceContract storage contractData = contracts[_contractId];
        require(contractData.client == msg.sender, "Only client can approve milestones");
        require(_milestoneIndex < contractData.milestones.length, "Invalid milestone index");
        
        Milestone storage milestone = contractData.milestones[_milestoneIndex];
        require(milestone.status == MilestoneStatus.Submitted, "Milestone not submitted");
        
        milestone.status = MilestoneStatus.Approved;
        
        _releaseMilestonePayment(_contractId, _milestoneIndex);
    }

    /**
     * @dev Auto-release payment after 14 days if not approved/disputed
     */
    function autoReleaseMilestone(uint256 _contractId, uint256 _milestoneIndex) 
        external 
        contractExists(_contractId) 
        nonReentrant 
    {
        FreelanceContract storage contractData = contracts[_contractId];
        require(_milestoneIndex < contractData.milestones.length, "Invalid milestone index");
        
        Milestone storage milestone = contractData.milestones[_milestoneIndex];
        require(milestone.status == MilestoneStatus.Submitted, "Milestone not submitted");
        require(block.timestamp >= milestone.approvalDeadline, "Approval deadline not reached");
        
        // Auto-approve if ASI verified or deadline passed
        if (milestone.asiVerified || block.timestamp >= milestone.approvalDeadline) {
            milestone.status = MilestoneStatus.Approved;
            _releaseMilestonePayment(_contractId, _milestoneIndex);
        }
    }

    /**
     * @dev Internal function to release milestone payment
     */
    function _releaseMilestonePayment(uint256 _contractId, uint256 _milestoneIndex) internal {
        FreelanceContract storage contractData = contracts[_contractId];
        Milestone storage milestone = contractData.milestones[_milestoneIndex];
        
        uint256 paymentAmount = milestone.amount;
        uint256 platformFeeAmount = (paymentAmount * platformFee) / 10000;
        uint256 freelancerAmount = paymentAmount - platformFeeAmount;
        
        // Update escrow balance
        escrowBalances[_contractId] -= paymentAmount;
        
        // Transfer payment to freelancer
        pyusdToken.transfer(contractData.freelancer, freelancerAmount);
        
        // Transfer platform fee to owner
        if (platformFeeAmount > 0) {
            pyusdToken.transfer(owner(), platformFeeAmount);
        }
        
        // Update freelancer profile
        Profile storage freelancerProfile = profiles[contractData.freelancer];
        freelancerProfile.totalEarned += freelancerAmount;
        
        emit MilestoneApproved(_contractId, _milestoneIndex, freelancerAmount);
        emit PaymentReleased(_contractId, contractData.freelancer, freelancerAmount);
        
        // Check if all milestones are completed
        _checkContractCompletion(_contractId);
    }

    /**
     * @dev Check if contract is completed and update status
     */
    function _checkContractCompletion(uint256 _contractId) internal {
        FreelanceContract storage contractData = contracts[_contractId];
        
        bool allCompleted = true;
        for (uint256 i = 0; i < contractData.milestones.length; i++) {
            if (contractData.milestones[i].status != MilestoneStatus.Approved) {
                allCompleted = false;
                break;
            }
        }
        
        if (allCompleted) {
            contractData.status = JobStatus.Completed;
            contractData.completionDate = block.timestamp;
            
            // Update job status
            jobs[contractData.jobId].status = JobStatus.Completed;
            
            // Update profiles
            Profile storage freelancerProfile = profiles[contractData.freelancer];
            Profile storage clientProfile = profiles[contractData.client];
            
            freelancerProfile.jobsCompleted++;
            clientProfile.totalSpent += contractData.totalAmount;
            
            // Refund freelancer stake
            uint256 stakeToRefund = stakeBalances[contractData.bidId];
            if (stakeToRefund > 0) {
                stakeBalances[contractData.bidId] = 0;
                pyusdToken.transfer(contractData.freelancer, stakeToRefund);
            }
        }
    }

    /**
     * @dev Slash freelancer stake for contract breach
     */
    function slashStake(uint256 _bidId) 
        external 
        onlyOwner 
        bidExists(_bidId) 
        nonReentrant 
    {
        Bid storage bid = bids[_bidId];
        uint256 stakeAmount = stakeBalances[_bidId];
        require(stakeAmount > 0, "No stake to slash");
        
        stakeBalances[_bidId] = 0;
        
        // Transfer slashed stake to job client
        Job storage job = jobs[bid.jobId];
        pyusdToken.transfer(job.client, stakeAmount);
        
        emit StakeSlashed(_bidId, bid.freelancer, stakeAmount);
    }

    /**
     * @dev Withdraw bid (only if not accepted)
     */
    function withdrawBid(uint256 _bidId) external bidExists(_bidId) nonReentrant {
        Bid storage bid = bids[_bidId];
        require(bid.freelancer == msg.sender, "Only bid owner can withdraw");
        require(bid.status == BidStatus.Pending, "Can only withdraw pending bids");
        
        bid.status = BidStatus.Withdrawn;
        
        // Refund stake
        uint256 stakeToRefund = stakeBalances[_bidId];
        if (stakeToRefund > 0) {
            stakeBalances[_bidId] = 0;
            pyusdToken.transfer(msg.sender, stakeToRefund);
        }
    }

    // View functions
    function getJob(uint256 _jobId) external view returns (Job memory) {
        return jobs[_jobId];
    }

    function getBid(uint256 _bidId) external view returns (Bid memory) {
        return bids[_bidId];
    }

    function getContract(uint256 _contractId) external view returns (FreelanceContract memory) {
        return contracts[_contractId];
    }

    function getJobBids(uint256 _jobId) external view returns (uint256[] memory) {
        return jobBids[_jobId];
    }

    function getUserJobs(address _user) external view returns (uint256[] memory) {
        return userJobs[_user];
    }

    function getUserBids(address _user) external view returns (uint256[] memory) {
        return userBids[_user];
    }

    function getUserContracts(address _user) external view returns (uint256[] memory) {
        return userContracts[_user];
    }

    // Utility functions
    function getTotalJobs() external view returns (uint256) {
        return _jobIds;
    }

    function getTotalBids() external view returns (uint256) {
        return _bidIds;
    }

    function getTotalContracts() external view returns (uint256) {
        return _contractIds;
    }

    // Admin functions
    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_PLATFORM_FEE, "Fee too high");
        platformFee = _newFee;
    }

    function setASIAgentVerifier(address _newVerifier) external onlyOwner {
        asiAgentVerifier = _newVerifier;
    }

    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }
}
