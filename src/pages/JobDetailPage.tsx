import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, Award } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContractData, EnhancedJob, EnhancedBid } from '../contexts/ContractDataContext';
import { useWallet } from '../contexts/WalletContext';
import { useData, Profile } from '../contexts/DataContext';

export const JobDetailPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const { getJob, getJobs, createBid, getBidsForJob, rejectBid, isLoading, getPYUSDBalance, requestPYUSDFromFaucet } = useContractData();
  const { getProfile } = useData();
  const [job, setJob] = useState<EnhancedJob | null>(null);
  const [bids, setBids] = useState<EnhancedBid[]>([]);
  const [bidProfiles, setBidProfiles] = useState<{ [key: string]: Profile }>({});
  const [client, setClient] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBidForm, setShowBidForm] = useState(false);

  const [bidData, setBidData] = useState({
    proposed_amount: '',
    stake_amount: '',
    cover_letter: '',
    estimated_timeline: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [pyusdBalance, setPyusdBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Load PYUSD balance when wallet is connected
  const loadPYUSDBalance = async () => {
    if (!walletAddress) return;
    setLoadingBalance(true);
    try {
      const balance = await getPYUSDBalance();
      setPyusdBalance(balance);
    } catch (error) {
      console.error('Error loading PYUSD balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  // Request PYUSD from faucet for testing
  const handleRequestPYUSD = async () => {
    if (!walletAddress) return;
    try {
      await requestPYUSDFromFaucet();
      // Reload balance after faucet request
      setTimeout(loadPYUSDBalance, 2000);
      alert('PYUSD requested from faucet! Please wait a moment for the transaction to confirm.');
    } catch (error) {
      console.error('Error requesting PYUSD:', error);
      alert('Error requesting PYUSD from faucet');
    }
  };

  useEffect(() => {
    if (jobId !== undefined && jobId !== null) {
      loadJobDetails();
    }
  }, [jobId]);

  // Reload job details when wallet address changes
  useEffect(() => {
    if (jobId !== undefined && jobId !== null && walletAddress) {
      console.log('🔄 Wallet address changed, reloading job details for:', walletAddress);
      loadJobDetails();
    }
  }, [walletAddress]);

  // Load balance when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      loadPYUSDBalance();
    }
  }, [walletAddress]);

  const loadJobDetails = async () => {
    try {
      console.log('🔍 Loading job details for ID:', jobId, 'type:', typeof jobId);

      // Convert jobId to string for getJob function
      const jobIdString = String(jobId);
      const jobData = getJob(jobIdString);
      console.log('📋 Job data found:', jobData);

      if (jobData) {
        setJob(jobData);

        // Load client profile
        const clientProfile = getProfile(jobData.client_wallet);
        setClient(clientProfile);

        // Load bids for this job
        const jobBids = await getBidsForJob(jobIdString);
        setBids(jobBids);

        // Load profiles for all bidders
        const profiles: { [key: string]: Profile } = {};
        jobBids.forEach(bid => {
          const profile = getProfile(bid.freelancer_wallet);
          if (profile) {
            profiles[bid.freelancer_wallet] = profile;
          }
        });
        setBidProfiles(profiles);
      } else {
        console.log('❌ Job not found for ID:', jobId);
        const allJobs = getJobs();
        console.log('📋 Available jobs:', allJobs.map(j => ({ id: j.id, title: j.title })));
        console.log('🔍 Looking for job with ID:', jobIdString, 'in jobs with IDs:', allJobs.map(j => j.id));
      }
    } catch (error) {
      console.error('Error loading job details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      alert('Please connect your wallet');
      return;
    }

    if (!job) {
      alert('Job not found');
      return;
    }

    // Prevent job owners from bidding on their own jobs
    if (job.client_wallet?.toLowerCase() === walletAddress?.toLowerCase()) {
      alert('You cannot bid on your own job posting');
      return;
    }

    setSubmitting(true);

    const proposedAmount = parseFloat(bidData.proposed_amount);
    const stakeAmount = proposedAmount; // Full bid amount as stake

    // Check if user has sufficient PYUSD balance for stake
    if (pyusdBalance < stakeAmount) {
      const needMore = stakeAmount - pyusdBalance;
      alert(`Insufficient PYUSD balance. You need ${needMore.toFixed(2)} more PYUSD to stake for this bid. Use the faucet to get test tokens.`);
      setSubmitting(false);
      return;
    }

    try {
      // Create bid with real contract interaction
      await createBid({
        job_id: jobId,
        freelancer_wallet: walletAddress,
        proposed_amount: proposedAmount,
        stake_amount: stakeAmount,
        cover_letter: bidData.cover_letter,
        estimated_timeline: bidData.estimated_timeline,
        proposed_milestones: bidData.cover_letter ? [bidData.cover_letter] : [],
        status: 'pending',
      });

      alert('Bid submitted successfully! Your stake has been locked in the smart contract.');
      setShowBidForm(false);
      setBidData({
        proposed_amount: '',
        stake_amount: '',
        cover_letter: '',
        estimated_timeline: '',
      });

      // Reload job details to show the new bid
      await loadJobDetails();
    } catch (error) {
      console.error('Error submitting bid:', error);
      alert(`Error submitting bid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectBid = async (bidId: string, freelancerName: string) => {
    const confirmReject = window.confirm(
      `Are you sure you want to reject the proposal from ${freelancerName}? This action cannot be undone and will return their stake.`
    );

    if (!confirmReject) return;

    try {
      await rejectBid(bidId);
      alert('Bid rejected successfully! The freelancer\'s stake has been returned.');
      // Reload job details to update the bid list
      await loadJobDetails();
    } catch (error) {
      console.error('Error rejecting bid:', error);
      alert(`Error rejecting bid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    const allJobs = getJobs();
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Job not found</h2>
        <p className="text-gray-400 mb-4">
          Job ID "{jobId}" could not be found.
        </p>
        <p className="text-gray-400 mb-6">
          Available jobs: {allJobs.length > 0 ? allJobs.map(j => j.id).join(', ') : 'None'}
        </p>
        <button
          onClick={() => navigate('/jobs')}
          className="btn-primary"
        >
          Back to Find Work
        </button>
      </div>
    );
  }

  const userHasBid = bids.some(bid =>
    bid.freelancer_wallet?.toLowerCase() === walletAddress?.toLowerCase()
  );
  const isJobOwner = job.client_wallet?.toLowerCase() === walletAddress?.toLowerCase();

  // Debug logging for job owner detection
  console.log('🔍 Job owner detection:', {
    jobClientWallet: job.client_wallet,
    currentWalletAddress: walletAddress,
    isJobOwner,
    userHasBid,
    bidsCount: bids.length
  });

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/jobs')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Jobs
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-4">{job.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Posted {getTimeSince(job.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold text-white mb-4">Job Details</h3>
                <p className="text-gray-400 mb-6">{job.description}</p>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill: string, idx: number) => (
                    <span className="badge badge-primary" key={idx}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Category</div>
                  <span className="font-medium text-white">{job.category}</span>
                </div>
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Experience Level</div>
                  <span className="font-medium text-white capitalize">{job.experience_level}</span>
                </div>
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">Project Duration</div>
                  <span className="font-medium text-white">{job.project_duration || 'Not specified'}</span>
                </div>
              </div>

              {/* Milestone Information for milestone contracts */}
              {job.contract_type === 'milestone' && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Project Milestones</h3>
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-gray-400">Payment Structure</div>
                      <div className="text-sm font-medium text-blue-400">Milestone-based</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">30%</div>
                        <div className="text-gray-400">Setup & Planning</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">50%</div>
                        <div className="text-gray-400">Core Development</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">20%</div>
                        <div className="text-gray-400">Testing & Deployment</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      Payments are released automatically upon milestone completion and AI verification
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isJobOwner && (
              <div className="bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  Proposals ({bids.length})
                </h3>
                {bids.length > 0 ? (
                  <div className="space-y-4">
                    {bids.map((bid) => (
                      <div key={bid.id} className="border border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-white">
                              {bidProfiles[bid.freelancer_wallet]?.display_name ||
                                `${bid.freelancer_wallet.slice(0, 8)}...`}
                            </div>
                            <div className="text-sm text-gray-400">
                              {bidProfiles[bid.freelancer_wallet]?.average_rating > 0 && (
                                <span className="flex items-center gap-1">
                                  <Award className="w-4 h-4 text-yellow-500" />
                                  {bidProfiles[bid.freelancer_wallet].average_rating.toFixed(1)} (
                                  {bidProfiles[bid.freelancer_wallet].total_reviews} reviews)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white">
                              ${bid.proposed_amount.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-400">
                              Stake: ${bid.stake_amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">{bid.cover_letter}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">
                            Timeline: {bid.estimated_timeline}
                          </span>
                          {bid.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRejectBid(bid.id.toString(), bidProfiles[bid.freelancer_wallet]?.display_name || 'Freelancer')}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => navigate(`/accept-bid/${job.id}/${bid.id}`)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                              >
                                Accept Proposal
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">No proposals yet</div>
                    <div className="text-sm text-gray-500">
                      Freelancers will be able to submit proposals for your job posting.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg shadow-sm p-6 sticky top-24">
              <div className="mb-6">
                <div className="text-3xl font-bold text-white">${job.budget.toLocaleString()}</div>
                <div className="text-sm text-gray-400 capitalize">
                  {job.contract_type} price
                </div>
                
                {/* Milestone breakdown for milestone contracts */}
                {job.contract_type === 'milestone' && (
                  <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                    <div className="text-xs text-gray-400 mb-2">Milestone Breakdown:</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Setup & Planning:</span>
                        <span className="text-white font-medium">${(job.budget * 0.3).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Core Development:</span>
                        <span className="text-white font-medium">${(job.budget * 0.5).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Testing & Deployment:</span>
                        <span className="text-white font-medium">${(job.budget * 0.2).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!isJobOwner && !userHasBid && walletAddress && (
                <button
                  onClick={() => setShowBidForm(!showBidForm)}
                  className="btn-primary w-full mb-4"
                >
                  {showBidForm ? 'Cancel' : 'Submit a Proposal'}
                </button>
              )}

              {userHasBid && (
                <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg mb-4">
                  <div className="text-green-300 font-semibold mb-1">Proposal Submitted</div>
                  <div className="text-sm text-green-400">
                    Your proposal is being reviewed by the client
                  </div>
                </div>
              )}

              {isJobOwner && (
                <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg mb-4">
                  <div className="text-blue-300 font-semibold mb-1">Your Job Posting</div>
                  <div className="text-sm text-blue-400">
                    Review proposals and select a freelancer
                  </div>
                </div>
              )}

              {showBidForm && (
                <div className="border-t border-gray-700 pt-4">
                  {/* PYUSD Balance Display */}
                  <div className="bg-gray-800 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-medium text-gray-300">Your PYUSD Balance</h3>
                        <p className="text-lg font-semibold text-white">
                          {loadingBalance ? 'Loading...' : `${pyusdBalance.toFixed(2)} PYUSD`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRequestPYUSD}
                        className="btn-secondary text-sm"
                      >
                        Get Test PYUSD
                      </button>
                    </div>
                  </div>

                <form onSubmit={handleSubmitBid} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Your Bid Amount (PYUSD) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={bidData.proposed_amount}
                      onChange={(e) => setBidData({ ...bidData, proposed_amount: e.target.value })}
                      className="input w-full"
                    />
                    {bidData.proposed_amount && (
                      <div className="mt-2">
                        <p className="text-xs text-yellow-400">
                          ⚠️ Full amount (${parseFloat(bidData.proposed_amount).toFixed(2)}) will be staked and locked until bid resolution
                        </p>
                        {parseFloat(bidData.proposed_amount) > pyusdBalance && (
                          <p className="text-xs text-red-400 mt-1">
                            ❌ Insufficient balance! You need ${(parseFloat(bidData.proposed_amount) - pyusdBalance).toFixed(2)} more PYUSD.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Estimated Timeline *
                    </label>
                    <input
                      type="text"
                      required
                      value={bidData.estimated_timeline}
                      onChange={(e) => setBidData({ ...bidData, estimated_timeline: e.target.value })}
                      placeholder="e.g. 2 weeks"
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Cover Letter *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={bidData.cover_letter}
                      onChange={(e) => setBidData({ ...bidData, cover_letter: e.target.value })}
                      placeholder="Explain why you're the best fit for this project..."
                      className="input w-full resize-none bg-gray-900 border-gray-700 text-white placeholder-gray-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || (bidData.proposed_amount !== '' && parseFloat(bidData.proposed_amount) > pyusdBalance)}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 
                     (bidData.proposed_amount !== '' && parseFloat(bidData.proposed_amount) > pyusdBalance) ? 'Insufficient PYUSD Balance' :
                     'Submit Proposal & Stake'}
                  </button>
                </form>
                </div>
              )}

              <div className="border-t border-gray-700 pt-4 space-y-3">
                <h4 className="font-semibold text-white">About the Client</h4>
                {client ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {client.display_name?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          {client.display_name || 'Anonymous Client'}
                        </div>
                        {client.location && (
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {client.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Jobs Posted:</span>
                        <div className="font-semibold text-white">
                          {client.jobs_completed || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Rating:</span>
                        <div className="font-semibold text-white">
                          {client.average_rating > 0 ? client.average_rating.toFixed(1) : 'New'} ⭐
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400">Loading client info...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
