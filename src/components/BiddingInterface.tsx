import React, { useState } from 'react';
import { useContractData } from '../contexts/ContractDataContext';
import { useWallet } from '../contexts/WalletContext';
import { DollarSign, Clock, FileText, AlertTriangle } from 'lucide-react';

interface BiddingInterfaceProps {
  jobId: string;
  jobBudget: number;
  onBidSubmitted?: () => void;
  className?: string;
}

export const BiddingInterface: React.FC<BiddingInterfaceProps> = ({
  jobId,
  jobBudget,
  onBidSubmitted,
  className = ''
}) => {
  const { createBid, getPYUSDBalance } = useContractData();
  const { walletAddress } = useWallet();
  const [bidData, setBidData] = useState({
    proposed_amount: '',
    cover_letter: '',
    estimated_timeline: '',
    proposed_milestones: ['']
  });
  const [submitting, setSubmitting] = useState(false);
  const [pyusdBalance, setPyusdBalance] = useState(0);

  React.useEffect(() => {
    loadBalance();
  }, [walletAddress]);

  const loadBalance = async () => {
    try {
      const balance = await getPYUSDBalance();
      setPyusdBalance(balance);
    } catch (error) {
      console.error('Error loading PYUSD balance:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    const proposedAmount = parseFloat(bidData.proposed_amount);
    const stakeAmount = proposedAmount

    if (pyusdBalance < stakeAmount) {
      alert(`Insufficient PYUSD balance. You need ${stakeAmount.toFixed(2)} PYUSD for the stake (10% of bid amount).`);
      return;
    }

    setSubmitting(true);
    try {
      await createBid({
        job_id: jobId,
        proposed_amount: proposedAmount,
        cover_letter: bidData.cover_letter,
        estimated_timeline: bidData.estimated_timeline,
        proposed_milestones: bidData.proposed_milestones.filter(m => m.trim() !== '')
      });

      alert('Bid submitted successfully! Your stake has been locked in the smart contract.');
      setBidData({
        proposed_amount: '',
        cover_letter: '',
        estimated_timeline: '',
        proposed_milestones: ['']
      });
      
      if (onBidSubmitted) {
        onBidSubmitted();
      }
    } catch (error: any) {
      console.error('Error submitting bid:', error);
      if (error.message?.includes('insufficient funds')) {
        alert('Transaction failed: Insufficient funds for gas or token approval.');
      } else if (error.message?.includes('user rejected')) {
        alert('Transaction was rejected by user.');
      } else {
        alert('Error submitting bid. Please check your wallet connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const addMilestone = () => {
    setBidData({
      ...bidData,
      proposed_milestones: [...bidData.proposed_milestones, '']
    });
  };

  const removeMilestone = (index: number) => {
    setBidData({
      ...bidData,
      proposed_milestones: bidData.proposed_milestones.filter((_, i) => i !== index)
    });
  };

  const updateMilestone = (index: number, value: string) => {
    const newMilestones = [...bidData.proposed_milestones];
    newMilestones[index] = value;
    setBidData({
      ...bidData,
      proposed_milestones: newMilestones
    });
  };

  const proposedAmount = parseFloat(bidData.proposed_amount) || 0;
  const stakeAmount = proposedAmount;

  return (
    <div className={`card p-6 ${className}`}>
      <h3 className="text-xl font-semibold text-white mb-4">Submit Your Bid</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Proposed Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Proposed Amount (PYUSD) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={bidData.proposed_amount}
              onChange={(e) => setBidData({ ...bidData, proposed_amount: e.target.value })}
              placeholder={`Budget: $${jobBudget.toLocaleString()}`}
              className="input w-full pl-10"
            />
          </div>
          {proposedAmount > 0 && (
            <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/20 rounded">
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Stake Required: ${stakeAmount.toFixed(2)} PYUSD (10% of bid)</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Your Balance: ${pyusdBalance.toFixed(2)} PYUSD
              </div>
            </div>
          )}
        </div>

        {/* Estimated Timeline */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Estimated Timeline *
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              required
              value={bidData.estimated_timeline}
              onChange={(e) => setBidData({ ...bidData, estimated_timeline: e.target.value })}
              placeholder="e.g., 2 weeks, 1 month"
              className="input w-full pl-10"
            />
          </div>
        </div>

        {/* Cover Letter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cover Letter *
          </label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
            <textarea
              required
              rows={4}
              value={bidData.cover_letter}
              onChange={(e) => setBidData({ ...bidData, cover_letter: e.target.value })}
              placeholder="Explain why you're the best fit for this project..."
              className="input w-full pl-10 pt-3 resize-none"
            />
          </div>
        </div>

        {/* Proposed Milestones */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Proposed Milestones
          </label>
          {bidData.proposed_milestones.map((milestone, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={milestone}
                onChange={(e) => updateMilestone(index, e.target.value)}
                placeholder={`Milestone ${index + 1}`}
                className="input flex-1"
              />
              {bidData.proposed_milestones.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMilestone(index)}
                  className="btn-secondary px-3"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addMilestone}
            className="btn-secondary text-sm"
          >
            Add Milestone
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !walletAddress || pyusdBalance < stakeAmount}
          className="btn-primary w-full disabled:opacity-50"
        >
          {submitting ? 'Submitting Bid...' : 'Submit Bid & Lock Stake'}
        </button>

        {!walletAddress && (
          <p className="text-red-400 text-sm text-center">
            Please connect your wallet to submit a bid
          </p>
        )}
      </form>
    </div>
  );
};
