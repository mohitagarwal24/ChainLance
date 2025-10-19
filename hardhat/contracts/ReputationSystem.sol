// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ReputationSystem
 * @dev On-chain reputation system for ChainLance platform
 * Stores ratings, reviews, and calculates reputation scores
 */
contract ReputationSystem is Ownable, ReentrancyGuard {
    
    struct Rating {
        uint256 id;
        uint256 contractId;
        address rater;
        address rated;
        uint8 overallRating; // 1-5 stars
        uint8 qualityRating;
        uint8 communicationRating;
        uint8 timelinessRating;
        string reviewText;
        bool wouldRecommend;
        bool isPublic;
        uint256 createdAt;
        bool disputed;
    }

    struct ReputationScore {
        uint256 totalRatings;
        uint256 averageRating; // Scaled by 100 (e.g., 450 = 4.5 stars)
        uint256 totalEarned;
        uint256 totalSpent;
        uint256 jobsCompleted;
        uint256 successRate; // Percentage scaled by 100
        uint256 responseTime; // Average response time in hours
        uint256 lastUpdated;
        bool isVerified;
    }

    // Storage
    mapping(uint256 => Rating) public ratings;
    mapping(address => ReputationScore) public reputationScores;
    mapping(uint256 => uint256[]) public contractRatings; // contractId => ratingIds[]
    mapping(address => uint256[]) public userRatings; // user => ratingIds[]
    mapping(bytes32 => bool) public ratingExists; // hash(contractId, rater, rated) => bool
    
    uint256 public nextRatingId = 1;
    
    // Authorized contracts that can submit ratings
    mapping(address => bool) public authorizedContracts;
    
    // Reputation thresholds for different levels
    uint256 public constant BRONZE_THRESHOLD = 100; // 1 star average, 5+ jobs
    uint256 public constant SILVER_THRESHOLD = 350; // 3.5 stars average, 10+ jobs  
    uint256 public constant GOLD_THRESHOLD = 450;   // 4.5 stars average, 25+ jobs
    uint256 public constant PLATINUM_THRESHOLD = 480; // 4.8 stars average, 50+ jobs

    enum ReputationLevel { None, Bronze, Silver, Gold, Platinum }

    // Events
    event RatingSubmitted(uint256 indexed ratingId, uint256 indexed contractId, address indexed rater, address rated);
    event ReputationUpdated(address indexed user, uint256 newAverageRating, ReputationLevel level);
    event RatingDisputed(uint256 indexed ratingId, address indexed disputer);
    event ContractAuthorized(address indexed contractAddress);
    event ContractDeauthorized(address indexed contractAddress);

    modifier onlyAuthorizedContract() {
        require(authorizedContracts[msg.sender], "Not authorized to submit ratings");
        _;
    }

    constructor() {
        // Initialize with deployer as authorized contract initially
        authorizedContracts[msg.sender] = true;
    }

    /**
     * @dev Authorize a contract to submit ratings
     */
    function authorizeContract(address _contract) external onlyOwner {
        require(_contract != address(0), "Invalid contract address");
        authorizedContracts[_contract] = true;
        emit ContractAuthorized(_contract);
    }

    /**
     * @dev Deauthorize a contract from submitting ratings
     */
    function deauthorizeContract(address _contract) external onlyOwner {
        authorizedContracts[_contract] = false;
        emit ContractDeauthorized(_contract);
    }

    /**
     * @dev Submit a rating for a completed contract
     */
    function submitRating(
        uint256 _contractId,
        address _rater,
        address _rated,
        uint8 _overallRating,
        uint8 _qualityRating,
        uint8 _communicationRating,
        uint8 _timelinessRating,
        string memory _reviewText,
        bool _wouldRecommend,
        bool _isPublic
    ) external onlyAuthorizedContract nonReentrant returns (uint256) {
        require(_rater != _rated, "Cannot rate yourself");
        require(_overallRating >= 1 && _overallRating <= 5, "Invalid overall rating");
        require(_qualityRating >= 1 && _qualityRating <= 5, "Invalid quality rating");
        require(_communicationRating >= 1 && _communicationRating <= 5, "Invalid communication rating");
        require(_timelinessRating >= 1 && _timelinessRating <= 5, "Invalid timeliness rating");

        // Prevent duplicate ratings for the same contract
        bytes32 ratingHash = keccak256(abi.encodePacked(_contractId, _rater, _rated));
        require(!ratingExists[ratingHash], "Rating already exists for this contract");

        uint256 ratingId = nextRatingId++;

        ratings[ratingId] = Rating({
            id: ratingId,
            contractId: _contractId,
            rater: _rater,
            rated: _rated,
            overallRating: _overallRating,
            qualityRating: _qualityRating,
            communicationRating: _communicationRating,
            timelinessRating: _timelinessRating,
            reviewText: _reviewText,
            wouldRecommend: _wouldRecommend,
            isPublic: _isPublic,
            createdAt: block.timestamp,
            disputed: false
        });

        ratingExists[ratingHash] = true;
        contractRatings[_contractId].push(ratingId);
        userRatings[_rated].push(ratingId);

        // Update reputation score
        _updateReputationScore(_rated);

        emit RatingSubmitted(ratingId, _contractId, _rater, _rated);

        return ratingId;
    }

    /**
     * @dev Update reputation score for a user
     */
    function _updateReputationScore(address _user) internal {
        uint256[] memory userRatingIds = userRatings[_user];
        
        if (userRatingIds.length == 0) return;

        uint256 totalRating = 0;
        uint256 validRatings = 0;

        // Calculate average rating
        for (uint256 i = 0; i < userRatingIds.length; i++) {
            Rating storage rating = ratings[userRatingIds[i]];
            if (!rating.disputed) {
                totalRating += rating.overallRating;
                validRatings++;
            }
        }

        if (validRatings == 0) return;

        ReputationScore storage score = reputationScores[_user];
        score.totalRatings = validRatings;
        score.averageRating = (totalRating * 100) / validRatings; // Scale by 100
        score.lastUpdated = block.timestamp;

        // Determine reputation level
        ReputationLevel level = _getReputationLevel(_user);

        emit ReputationUpdated(_user, score.averageRating, level);
    }

    /**
     * @dev Get reputation level based on score and job count
     */
    function _getReputationLevel(address _user) internal view returns (ReputationLevel) {
        ReputationScore memory score = reputationScores[_user];
        
        if (score.totalRatings < 5) return ReputationLevel.None;
        
        if (score.averageRating >= PLATINUM_THRESHOLD && score.jobsCompleted >= 50) {
            return ReputationLevel.Platinum;
        } else if (score.averageRating >= GOLD_THRESHOLD && score.jobsCompleted >= 25) {
            return ReputationLevel.Gold;
        } else if (score.averageRating >= SILVER_THRESHOLD && score.jobsCompleted >= 10) {
            return ReputationLevel.Silver;
        } else if (score.averageRating >= BRONZE_THRESHOLD && score.jobsCompleted >= 5) {
            return ReputationLevel.Bronze;
        }
        
        return ReputationLevel.None;
    }

    /**
     * @dev Update job completion stats
     */
    function updateJobStats(
        address _user,
        uint256 _totalEarned,
        uint256 _totalSpent,
        uint256 _jobsCompleted,
        uint256 _successRate
    ) external onlyAuthorizedContract {
        ReputationScore storage score = reputationScores[_user];
        score.totalEarned = _totalEarned;
        score.totalSpent = _totalSpent;
        score.jobsCompleted = _jobsCompleted;
        score.successRate = _successRate;
        score.lastUpdated = block.timestamp;
    }

    /**
     * @dev Dispute a rating
     */
    function disputeRating(uint256 _ratingId, string memory _reason) external {
        require(_ratingId < nextRatingId, "Invalid rating ID");
        
        Rating storage rating = ratings[_ratingId];
        require(rating.rated == msg.sender, "Only rated user can dispute");
        require(!rating.disputed, "Rating already disputed");

        rating.disputed = true;
        
        // Recalculate reputation without disputed rating
        _updateReputationScore(rating.rated);

        emit RatingDisputed(_ratingId, msg.sender);
    }

    /**
     * @dev Resolve rating dispute (admin function)
     */
    function resolveDispute(uint256 _ratingId, bool _upholdRating) external onlyOwner {
        require(_ratingId < nextRatingId, "Invalid rating ID");
        
        Rating storage rating = ratings[_ratingId];
        require(rating.disputed, "Rating not disputed");

        if (_upholdRating) {
            rating.disputed = false;
            _updateReputationScore(rating.rated);
        }
        // If not upholding, rating remains disputed and excluded from calculations
    }

    /**
     * @dev Verify a user's identity (admin function)
     */
    function verifyUser(address _user) external onlyOwner {
        reputationScores[_user].isVerified = true;
    }

    /**
     * @dev Remove verification (admin function)
     */
    function removeVerification(address _user) external onlyOwner {
        reputationScores[_user].isVerified = false;
    }

    // View functions

    /**
     * @dev Get user's reputation score
     */
    function getReputationScore(address _user) external view returns (ReputationScore memory) {
        return reputationScores[_user];
    }

    /**
     * @dev Get user's reputation level
     */
    function getReputationLevel(address _user) external view returns (ReputationLevel) {
        return _getReputationLevel(_user);
    }

    /**
     * @dev Get rating details
     */
    function getRating(uint256 _ratingId) external view returns (Rating memory) {
        return ratings[_ratingId];
    }

    /**
     * @dev Get all ratings for a user
     */
    function getUserRatings(address _user) external view returns (uint256[] memory) {
        return userRatings[_user];
    }

    /**
     * @dev Get public ratings for a user
     */
    function getPublicRatings(address _user) external view returns (Rating[] memory) {
        uint256[] memory userRatingIds = userRatings[_user];
        
        // Count public ratings
        uint256 publicCount = 0;
        for (uint256 i = 0; i < userRatingIds.length; i++) {
            if (ratings[userRatingIds[i]].isPublic && !ratings[userRatingIds[i]].disputed) {
                publicCount++;
            }
        }

        // Create array of public ratings
        Rating[] memory publicRatings = new Rating[](publicCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < userRatingIds.length; i++) {
            Rating memory rating = ratings[userRatingIds[i]];
            if (rating.isPublic && !rating.disputed) {
                publicRatings[index] = rating;
                index++;
            }
        }

        return publicRatings;
    }

    /**
     * @dev Get ratings for a specific contract
     */
    function getContractRatings(uint256 _contractId) external view returns (uint256[] memory) {
        return contractRatings[_contractId];
    }

    /**
     * @dev Check if rating exists for a contract and user pair
     */
    function hasRating(uint256 _contractId, address _rater, address _rated) external view returns (bool) {
        bytes32 ratingHash = keccak256(abi.encodePacked(_contractId, _rater, _rated));
        return ratingExists[ratingHash];
    }

    /**
     * @dev Get reputation summary for display
     */
    function getReputationSummary(address _user) external view returns (
        uint256 averageRating,
        uint256 totalRatings,
        uint256 jobsCompleted,
        ReputationLevel level,
        bool isVerified
    ) {
        ReputationScore memory score = reputationScores[_user];
        return (
            score.averageRating,
            score.totalRatings,
            score.jobsCompleted,
            _getReputationLevel(_user),
            score.isVerified
        );
    }
}
