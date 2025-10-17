import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, DollarSign, Briefcase, MapPin, Award, Users, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWallet } from '../contexts/WalletContext';

interface JobDetailPageProps {
  jobId: string;
  onNavigate: (page: string, data?: any) => void;
}

export const JobDetailPage: React.FC<JobDetailPageProps> = ({ jobId, onNavigate }) => {
  const { walletAddress } = useWallet();
  const [job, setJob] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
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
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobData) {
      setJob(jobData);

      const { data: clientData } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', jobData.client_wallet)
        .single();

      if (clientData) {
        setClient(clientData);
      }

      const { data: bidsData } = await supabase
        .from('bids')
        .select('*, profiles!bids_freelancer_wallet_fkey(*)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (bidsData) {
        setBids(bidsData);
      }
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

    const { error } = await supabase.from('bids').insert({
      job_id: jobId,
      freelancer_wallet: walletAddress,
      proposed_amount: parseFloat(bidData.proposed_amount),
      stake_amount: stakeAmount,
      cover_letter: bidData.cover_letter,
      estimated_timeline: bidData.estimated_timeline,
      status: 'pending',
    });

    setSubmitting(false);

    if (error) {
      alert('Error submitting bid: ' + error.message);
    } else {
      alert('Bid submitted successfully! In production, you would now stake tokens to the smart contract.');
      setShowBidForm(false);
      loadJobDetails();

      await supabase.from('jobs').update({
        bids_count: (job.bids_count || 0) + 1
      }).eq('id', jobId);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate('jobs')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Jobs
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Posted {getTimeSince(job.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {bids.length} proposals
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      {job.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.required_skills.map((skill: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Category</div>
                  <div className="font-semibold text-gray-900">{job.category}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Experience Level</div>
                  <div className="font-semibold text-gray-900 capitalize">{job.experience_level}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Project Duration</div>
                  <div className="font-semibold text-gray-900">{job.project_duration || 'Not specified'}</div>
                </div>
              </div>
            </div>

            {isJobOwner && bids.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Proposals ({bids.length})
                </h3>
                <div className="space-y-4">
                  {bids.map((bid) => (
                    <div key={bid.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {bid.profiles?.display_name || `${bid.freelancer_wallet.slice(0, 8)}...`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {bid.profiles?.average_rating > 0 && (
                              <span className="flex items-center gap-1">
                                <Award className="w-4 h-4 text-yellow-500" />
                                {bid.profiles.average_rating.toFixed(1)} ({bid.profiles.total_reviews} reviews)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            ${bid.proposed_amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            Stake: ${bid.stake_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm mb-3">{bid.cover_letter}</p>
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
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <div className="mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  ${job.budget.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  {job.contract_type} price
                </div>
              </div>

              {!isJobOwner && !userHasBid && walletAddress && (
                <button
                  onClick={() => setShowBidForm(!showBidForm)}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors mb-4"
                >
                  {showBidForm ? 'Cancel' : 'Submit a Proposal'}
                </button>
              )}

              {userHasBid && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <div className="text-green-800 font-semibold mb-1">Proposal Submitted</div>
                  <div className="text-sm text-green-600">
                    Your proposal is being reviewed by the client
                  </div>
                </div>
              )}

              {isJobOwner && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <div className="text-blue-800 font-semibold mb-1">Your Job Posting</div>
                  <div className="text-sm text-blue-600">
                    Review proposals and select a freelancer
                  </div>
                </div>
              )}

              {showBidForm && (
                <form onSubmit={handleSubmitBid} className="space-y-4 border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Bid Amount (PYUSD) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={bidData.proposed_amount}
                      onChange={(e) => setBidData({ ...bidData, proposed_amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {bidData.proposed_amount && (
                      <p className="text-xs text-gray-500 mt-1">
                        Stake required: ${(parseFloat(bidData.proposed_amount) * 0.1).toFixed(2)} (10%)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Timeline *
                    </label>
                    <input
                      type="text"
                      required
                      value={bidData.estimated_timeline}
                      onChange={(e) => setBidData({ ...bidData, estimated_timeline: e.target.value })}
                      placeholder="e.g. 2 weeks"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Letter *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={bidData.cover_letter}
                      onChange={(e) => setBidData({ ...bidData, cover_letter: e.target.value })}
                      placeholder="Explain why you're the best fit for this project..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Proposal & Stake'}
                  </button>
                </form>
              )}

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-semibold text-gray-900">About the Client</h4>
                {client ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {client.display_name?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {client.display_name || 'Anonymous Client'}
                        </div>
                        {client.location && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {client.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Jobs Posted</div>
                        <div className="font-semibold text-gray-900">
                          {client.jobs_completed || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Rating</div>
                        <div className="font-semibold text-gray-900">
                          {client.average_rating > 0 ? client.average_rating.toFixed(1) : 'New'} ⭐
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">Loading client info...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
