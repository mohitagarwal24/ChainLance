import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useWallet } from '../contexts/WalletContext';
import { Star, Award, TrendingUp, User } from 'lucide-react';

interface ReputationData {
  overallRating: number;
  totalRatings: number;
  qualityScore: number;
  communicationScore: number;
  timelinessScore: number;
  level: string;
  completedJobs: number;
}

interface ReputationDisplayProps {
  userAddress?: string;
  className?: string;
}

export const ReputationDisplay: React.FC<ReputationDisplayProps> = ({ 
  userAddress, 
  className = '' 
}) => {
  const { contracts, isInitialized } = useWeb3();
  const { walletAddress } = useWallet();
  const [reputation, setReputation] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetAddress = userAddress || walletAddress;

  const fetchReputation = async () => {
    if (!isInitialized || !contracts.reputationSystem || !targetAddress) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get reputation score from contract
      const reputationScore = await contracts.reputationSystem.getReputationScore(targetAddress);
      
      // Parse the reputation data based on actual contract structure
      const averageRating = Number(reputationScore.averageRating) / 100; // Convert from basis points
      const reputationData: ReputationData = {
        overallRating: averageRating,
        totalRatings: Number(reputationScore.totalRatings),
        qualityScore: averageRating, // Use average rating for all scores since detailed scores aren't available
        communicationScore: averageRating,
        timelinessScore: averageRating,
        level: getReputationLevel(averageRating),
        completedJobs: Number(reputationScore.jobsCompleted)
      };

      setReputation(reputationData);
    } catch (error) {
      console.error('Error fetching reputation:', error);
      setError('Failed to load reputation data');
      // Set default reputation for new users
      setReputation({
        overallRating: 0,
        totalRatings: 0,
        qualityScore: 0,
        communicationScore: 0,
        timelinessScore: 0,
        level: 'New User',
        completedJobs: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getReputationLevel = (rating: number): string => {
    if (rating >= 4.5) return 'Platinum';
    if (rating >= 4.0) return 'Gold';
    if (rating >= 3.5) return 'Silver';
    if (rating >= 3.0) return 'Bronze';
    return 'New User';
  };

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'Platinum': return 'text-purple-400';
      case 'Gold': return 'text-yellow-400';
      case 'Silver': return 'text-gray-300';
      case 'Bronze': return 'text-orange-400';
      default: return 'text-gray-500';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : i < rating 
            ? 'text-yellow-400 fill-current opacity-50'
            : 'text-gray-600'
        }`}
      />
    ));
  };

  useEffect(() => {
    fetchReputation();
  }, [isInitialized, targetAddress]);

  if (!isInitialized) {
    return (
      <div className={`card p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <User className="w-5 h-5" />
          <span>Reputation - Initializing...</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`card p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-400">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span>Loading reputation...</span>
        </div>
      </div>
    );
  }

  if (error && !reputation) {
    return (
      <div className={`card p-4 ${className}`}>
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  if (!reputation) return null;

  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Reputation</h3>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(reputation.level)}`}>
          {reputation.level}
        </div>
      </div>

      <div className="space-y-3">
        {/* Overall Rating */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex">{renderStars(reputation.overallRating)}</div>
            <span className="text-white font-medium">
              {reputation.overallRating.toFixed(1)}
            </span>
          </div>
          <span className="text-sm text-gray-400">
            ({reputation.totalRatings} reviews)
          </span>
        </div>

        {/* Detailed Scores */}
        {reputation.totalRatings > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Quality</span>
              <div className="flex items-center gap-2">
                <div className="flex">{renderStars(reputation.qualityScore)}</div>
                <span className="text-sm text-white">{reputation.qualityScore.toFixed(1)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Communication</span>
              <div className="flex items-center gap-2">
                <div className="flex">{renderStars(reputation.communicationScore)}</div>
                <span className="text-sm text-white">{reputation.communicationScore.toFixed(1)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Timeliness</span>
              <div className="flex items-center gap-2">
                <div className="flex">{renderStars(reputation.timelinessScore)}</div>
                <span className="text-sm text-white">{reputation.timelinessScore.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-700">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">
              {reputation.completedJobs} jobs completed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
