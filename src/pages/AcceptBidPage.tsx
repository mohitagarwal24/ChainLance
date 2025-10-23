import React, { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, Clock, Award, AlertTriangle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContractData, EnhancedJob, EnhancedBid } from '../contexts/ContractDataContext';
import { useWallet } from '../contexts/WalletContext';
import { useData, Profile } from '../contexts/DataContext';

export const AcceptBidPage: React.FC = () => {
  const { jobId, bidId } = useParams<{ jobId: string; bidId: string }>();
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const { getJob, getBidsForJob, acceptBid, rejectBid, getPYUSDBalance } = useContractData();
  const { getProfile } = useData();
  const [job, setJob] = useState<EnhancedJob | null>(null);
  const [bid, setBid] = useState<EnhancedBid | null>(null);
  const [freelancerProfile, setFreelancerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [pyusdBalance, setPyusdBalance] = useState<number>(0);

  useEffect(() => {
    loadBidDetails();
    loadPYUSDBalance();
  }, [jobId, bidId]);

  const loadBidDetails = async () => {
    try {
      setLoading(true);
      
      // Get job details
      const jobData = getJob(String(jobId));
      if (!jobData) {
        console.error('Job not found:', jobId);
        return;
      }
      setJob(jobData);

      // Get bid details
      const bids = await getBidsForJob(String(jobId));
      const bidData = bids.find((b: any) => b.id.toString() === String(bidId));
      if (!bidData) {
        console.error('Bid not found:', bidId);
        return;
      }
      setBid(bidData);

      // Get freelancer profile
      const profile = getProfile(bidData.freelancer_wallet);
      setFreelancerProfile(profile);

    } catch (error) {
      console.error('Error loading bid details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPYUSDBalance = async () => {
    if (!walletAddress) return;
    try {
      const balance = await getPYUSDBalance();
      setPyusdBalance(balance);
    } catch (error) {
      console.error('Error loading PYUSD balance:', error);
    }
  };

  const handleAcceptBid = async () => {
    if (!job || !bid) {
      alert('Job or bid information is missing.');
      return;
    }

    // Calculate remaining escrow needed (80% of bid amount)
    // Client already deposited 20% of job budget, now needs 80% of accepted bid
    const remainingEscrow = bid.proposed_amount * 0.8;
    
    // Check if user has sufficient PYUSD balance
    if (pyusdBalance < remainingEscrow) {
      alert(`Insufficient PYUSD balance. You need ${remainingEscrow.toFixed(2)} more PYUSD to fund the full contract amount.`);
      return;
    }

    setAccepting(true);
    try {
      await acceptBid(String(bidId));
      alert('Bid accepted successfully! The contract has been created and funds are now in escrow.');
      navigate('/contracts');
    } catch (error) {
      console.error('Error accepting bid:', error);
      alert('Error accepting bid. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleRejectBid = async () => {
    if (!job || !bid) {
      alert('Job or bid information is missing.');
      return;
    }

    const confirmReject = window.confirm(
      `Are you sure you want to reject this proposal from ${freelancerProfile?.display_name || 'this freelancer'}? This action cannot be undone and will return their stake.`
    );

    if (!confirmReject) return;

    setRejecting(true);
    try {
      await rejectBid(String(bidId));
      alert('Bid rejected successfully! The freelancer\'s stake has been returned.');
      navigate(`/job/${jobId}`);
    } catch (error) {
      console.error('Error rejecting bid:', error);
      alert('Error rejecting bid. Please try again.');
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job || !bid) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Bid not found</h2>
        <p className="text-gray-400 mb-6">
          The specified bid could not be found.
        </p>
        <button
          onClick={() => navigate('/jobs')}
          className="btn-primary"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  const initialDeposit = job.budget * 0.2; // 20% initial deposit
  const remainingEscrow = bid.proposed_amount * 0.8; // 80% of bid amount
  const hasEnoughBalance = pyusdBalance >= remainingEscrow;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(`/job/${jobId}`)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Job
        </button>

        <div className="card p-8">
          <h1 className="text-3xl font-bold text-white mb-6">Accept Proposal</h1>
          
          {/* Job Info */}
          <div className="mb-8 p-6 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-2">{job.title}</h2>
            <p className="text-gray-400 mb-4">{job.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Budget: ${job.budget.toLocaleString()}</span>
              <span className="capitalize">{job.contract_type} contract</span>
            </div>
          </div>

          {/* Freelancer Info */}
          <div className="mb-8 p-6 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Freelancer Details</h3>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                {freelancerProfile?.display_name?.[0]?.toUpperCase() || 'F'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-xl font-semibold text-white">
                    {freelancerProfile?.display_name || 'Anonymous Freelancer'}
                  </h4>
                  {(freelancerProfile as any)?.average_rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-500 font-medium">
                        {(freelancerProfile as any)?.average_rating.toFixed(1)}
                      </span>
                      <span className="text-gray-400 text-sm">
                        ({(freelancerProfile as any)?.total_reviews} reviews)
                      </span>
                    </div>
                  )}
                </div>
                
                {freelancerProfile?.bio && (
                  <p className="text-gray-400 mb-3">{freelancerProfile.bio}</p>
                )}
                
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Jobs Completed:</span>
                    <div className="font-medium text-white">
                      {freelancerProfile?.jobs_completed || 0}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Success Rate:</span>
                    <div className="font-medium text-white">
                      {freelancerProfile?.success_rate || 0}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Hourly Rate:</span>
                    <div className="font-medium text-white">
                      ${freelancerProfile?.hourly_rate || 'Not set'}/hr
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Proposal Details */}
          <div className="mb-8 p-6 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Proposal Details</h3>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className="text-gray-400">Proposed Amount:</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  ${bid.proposed_amount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">
                  Stake: ${bid.stake_amount.toFixed(2)} (10%)
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400">Estimated Timeline:</span>
                </div>
                <div className="text-xl font-semibold text-white">
                  {bid.estimated_timeline}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-white mb-2">Cover Letter:</h4>
              <p className="text-gray-300">{bid.cover_letter}</p>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="mb-8 p-6 bg-blue-900/20 border border-blue-800 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-300 mb-4">Payment Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-200">Initial Escrow Deposit (15%):</span>
                <span className="text-white font-medium">${(job.budget * 0.15).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">Additional Escrow Required:</span>
                <span className="text-white font-medium">${remainingEscrow.toFixed(2)}</span>
              </div>
              <div className="border-t border-blue-700 pt-2">
                <div className="flex justify-between">
                  <span className="text-blue-200 font-medium">Total Contract Value:</span>
                  <span className="text-white font-bold text-lg">${bid.proposed_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-800/50 rounded">
              <div className="flex justify-between items-center">
                <span className="text-blue-200">Your PYUSD Balance:</span>
                <span className={`font-medium ${hasEnoughBalance ? 'text-green-400' : 'text-red-400'}`}>
                  ${pyusdBalance.toFixed(2)}
                </span>
              </div>
              {!hasEnoughBalance && (
                <div className="mt-2 text-sm text-red-400">
                  ⚠️ Insufficient balance! You need ${(remainingEscrow - pyusdBalance).toFixed(2)} more PYUSD.
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-300 mb-2">Before You Accept</h4>
                <ul className="text-sm text-yellow-200 space-y-1">
                  <li>• The full contract amount will be locked in escrow</li>
                  <li>• Payments will be released based on milestone completion</li>
                  <li>• You can approve milestones or they will auto-release after 14 days</li>
                  <li>• This action cannot be undone once confirmed</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate(`/job/${jobId}`)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectBid}
              disabled={rejecting || accepting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium flex-1 flex items-center justify-center"
            >
              {rejecting ? (
                <>
                  <Clock className="w-5 h-5 animate-spin mr-2" />
                  Rejecting...
                </>
              ) : (
                'Reject Proposal'
              )}
            </button>
            <button
              onClick={handleAcceptBid}
              disabled={accepting || !hasEnoughBalance || rejecting}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <>
                  <Clock className="w-5 h-5 animate-spin mr-2" />
                  Accepting...
                </>
              ) : !hasEnoughBalance ? (
                'Insufficient Balance'
              ) : (
                <>
                  <DollarSign className="w-5 h-5 mr-2" />
                  Accept Proposal & Fund Escrow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
