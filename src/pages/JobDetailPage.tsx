import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, Award } from 'lucide-react';
import { useData, Job, Bid, Profile } from '../contexts/DataContext';
import { useWallet } from '../contexts/WalletContext';

interface JobDetailPageProps {
  jobId: string;
  onNavigate: (page: string, data?: any) => void;
}

export const JobDetailPage: React.FC<JobDetailPageProps> = ({ jobId, onNavigate }) => {
  const { walletAddress } = useWallet();
  const { getJob, getProfile, getBidsForJob, createBid } = useData();
  const [job, setJob] = useState<Job | null>(null);
  const [client, setClient] = useState<Profile | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidProfiles, setBidProfiles] = useState<{[key: string]: Profile}>({});
  const [loading, setLoading] = useState(true);
  const [showBidForm, setShowBidForm] = useState(false);

  const [bidData, setBidData] = useState({
    proposed_amount: '',
    stake_amount: '',
    cover_letter: '',
    estimated_timeline: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    const jobData = getJob(jobId);

    if (jobData) {
      setJob(jobData);

      const clientData = getProfile(jobData.client_wallet);
      if (clientData) {
        setClient(clientData);
      }

      const bidsData = getBidsForJob(jobId);
      setBids(bidsData);

      // Load profiles for each bid
      const profiles: {[key: string]: Profile} = {};
      bidsData.forEach(bid => {
        const profile = getProfile(bid.freelancer_wallet);
        if (profile) {
          profiles[bid.freelancer_wallet] = profile;
        }
      });
      setBidProfiles(profiles);
    }

    setLoading(false);
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      alert('Please connect your wallet');
      return;
    }

    setSubmitting(true);

    const stakeAmount = parseFloat(bidData.proposed_amount) * 0.1;

    try {
      await createBid({
        job_id: jobId,
        freelancer_wallet: walletAddress,
        proposed_amount: parseFloat(bidData.proposed_amount),
        stake_amount: stakeAmount,
        cover_letter: bidData.cover_letter,
        estimated_timeline: bidData.estimated_timeline,
        status: 'pending',
      });

      alert('Bid submitted successfully! In production, you would now stake tokens to the smart contract.');
      setShowBidForm(false);
      setBidData({
        proposed_amount: '',
        stake_amount: '',
        cover_letter: '',
        estimated_timeline: '',
      });
      loadJobDetails();
    } catch (error) {
      alert('Error submitting bid');
    }

    setSubmitting(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Job not found</h2>
      </div>
    );
  }

  const userHasBid = bids.some(bid => bid.freelancer_wallet === walletAddress);
  const isJobOwner = job.client_wallet === walletAddress;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate('jobs')}
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
                  <div className="flex items-center gap-4 text-sm text-gray-500">
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
            </div>

            {isJobOwner && bids.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  Proposals ({bids.length})
                </h3>
                <div className="space-y-4">
                  {bids.map((bid) => (
                    <div key={bid.id} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-white">
                            {bidProfiles[bid.freelancer_wallet]?.display_name || `${bid.freelancer_wallet.slice(0, 8)}...`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {bidProfiles[bid.freelancer_wallet]?.average_rating > 0 && (
                              <span className="flex items-center gap-1">
                                <Award className="w-4 h-4 text-yellow-500" />
                                {bidProfiles[bid.freelancer_wallet].average_rating.toFixed(1)} ({bidProfiles[bid.freelancer_wallet].total_reviews} reviews)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">
                            ${bid.proposed_amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            Stake: ${bid.stake_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">{bid.cover_letter}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          Timeline: {bid.estimated_timeline}
                        </span>
                        {bid.status === 'pending' && (
                          <button
                            onClick={() => onNavigate('accept-bid', { jobId: job.id, bidId: bid.id })}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            Accept Proposal
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                <form onSubmit={handleSubmitBid} className="space-y-4 border-t border-gray-700 pt-4">
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
                      <p className="text-xs text-gray-400 mt-1">
                        Stake required: ${(parseFloat(bidData.proposed_amount) * 0.1).toFixed(2)} (10%)
                      </p>
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
                    disabled={submitting}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Proposal & Stake'}
                  </button>
                </form>
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
