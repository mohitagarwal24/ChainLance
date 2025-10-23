import React, { useState } from 'react';
import { ArrowLeft, Plus, X, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContractData } from '../contexts/ContractDataContext';
import { useWallet } from '../contexts/WalletContext';
import { NetworkStatus } from '../components/NetworkStatus';

export const PostJobPage: React.FC = () => {
  const navigate = useNavigate();
  const { walletAddress } = useWallet();
  const { createJob, getPYUSDBalance, requestPYUSDFromFaucet } = useContractData();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Web Development',
    required_skills: [] as string[],
    budget: '',
    contract_type: 'fixed',
    experience_level: 'intermediate',
    project_duration: '',
    deadline: '',
    number_of_milestones: 1,
  });
  const [skillInput, setSkillInput] = useState('');
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

  // Load balance when wallet address changes
  React.useEffect(() => {
    if (walletAddress) {
      loadPYUSDBalance();
    }
  }, [walletAddress]);

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.required_skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        required_skills: [...formData.required_skills, skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      required_skills: formData.required_skills.filter((s) => s !== skill),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    const escrowDeposit = parseFloat(formData.budget) * 0.15;
    
    // Check if user has sufficient PYUSD balance
    if (pyusdBalance < escrowDeposit) {
      const needMore = escrowDeposit - pyusdBalance;
      alert(`Insufficient PYUSD balance. You need ${needMore.toFixed(2)} more PYUSD for the escrow deposit. Use the faucet to get test tokens.`);
      return;
    }

    setSubmitting(true);

    try {
      await createJob({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        required_skills: formData.required_skills,
        budget: parseFloat(formData.budget),
        contract_type: formData.contract_type as 'fixed' | 'hourly' | 'milestone',
        experience_level: formData.experience_level as 'beginner' | 'intermediate' | 'expert',
        project_duration: formData.project_duration,
        deadline: formData.deadline || null,
        number_of_milestones: formData.number_of_milestones,
      });

      alert('Job posted successfully! The escrow deposit has been locked in the smart contract.');
      // Reload balance after successful job posting
      loadPYUSDBalance();
      navigate('/my-jobs');
    } catch (error: any) {
      console.error('Error posting job:', error);
      if (error.message?.includes('insufficient funds')) {
        alert('Transaction failed: Insufficient funds for gas or token approval.');
      } else if (error.message?.includes('user rejected')) {
        alert('Transaction was rejected by user.');
      } else {
        alert('Error posting job. Please check your wallet connection and try again.');
      }
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <NetworkStatus />
        
        <div className="card p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Post a Job</h1>
            <p className="text-gray-400">
              Create a job posting with smart contract escrow protection
            </p>
            
            {/* PYUSD Balance Display */}
            {walletAddress && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-300">Your PYUSD Balance</h3>
                    <p className="text-lg font-semibold text-white">
                      {loadingBalance ? 'Loading...' : `${pyusdBalance.toFixed(2)} PYUSD`}
                    </p>
                  </div>
                  <button
                    onClick={handleRequestPYUSD}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Get Test PYUSD
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  You need PYUSD tokens to pay escrow deposits. Use the faucet to get test tokens.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center mb-8">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'} font-semibold`}>
                1
              </div>
              <span className="ml-2 hidden sm:inline">Details</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'} font-semibold`}>
                2
              </div>
              <span className="ml-2 hidden sm:inline">Budget</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'} font-semibold`}>
                3
              </div>
              <span className="ml-2 hidden sm:inline">Review</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Build a React-based Dashboard with Web3 Integration"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    placeholder="Describe your project in detail, including requirements, deliverables, and expectations..."
                    className="input w-full resize-none"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input w-full"
                    >
                      <option value="Web Development">Web Development</option>
                      <option value="Mobile Development">Mobile Development</option>
                      <option value="Design">Design</option>
                      <option value="Writing">Writing</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Blockchain">Blockchain</option>
                      <option value="AI/ML">AI/ML</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Experience Level *
                    </label>
                    <select
                      value={formData.experience_level}
                      onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                      className="input w-full"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Required Skills *
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="Add a skill and press Enter"
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="btn-primary px-4 py-2"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.required_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="badge badge-primary flex items-center gap-2"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-blue-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contract Type *
                  </label>
                  <div className="grid md:grid-cols-3 gap-4">
                    {['fixed', 'hourly', 'milestone'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, contract_type: type })}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          formData.contract_type === type
                            ? 'border-blue-500 bg-blue-900/20 text-white'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800 text-gray-300'
                        }`}
                      >
                        <div className="font-semibold capitalize mb-1">{type} Price</div>
                        <div className="text-sm text-gray-400">
                          {type === 'fixed' && 'One-time payment'}
                          {type === 'hourly' && 'Pay per hour worked'}
                          {type === 'milestone' && 'Pay per milestone'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Budget (PYUSD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="5000"
                      className="input w-full pl-10 pr-4"
                    />
                  </div>
                  {formData.budget && (
                    <div className={`mt-2 p-3 rounded-lg border ${
                      pyusdBalance >= (parseFloat(formData.budget) * 0.15) 
                        ? 'bg-blue-900/20 border-blue-800' 
                        : 'bg-red-900/20 border-red-800'
                    }`}>
                      <p className={`text-sm ${
                        pyusdBalance >= (parseFloat(formData.budget) * 0.15) 
                          ? 'text-blue-300' 
                          : 'text-red-300'
                      }`}>
                        <strong>Escrow Deposit Required:</strong> ${(parseFloat(formData.budget) * 0.15).toFixed(2)} PYUSD (15% of budget)
                      </p>
                      {pyusdBalance < (parseFloat(formData.budget) * 0.15) && (
                        <p className="text-xs text-red-400 mt-1">
                          ⚠️ Insufficient balance! You need ${((parseFloat(formData.budget) * 0.15) - pyusdBalance).toFixed(2)} more PYUSD.
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${
                        pyusdBalance >= (parseFloat(formData.budget) * 0.15) 
                          ? 'text-blue-600' 
                          : 'text-red-600'
                      }`}>
                        This deposit prevents spam and ensures serious job postings. Fully refundable if you cancel before accepting bids.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Duration
                    </label>
                    <input
                      type="text"
                      value={formData.project_duration}
                      onChange={(e) => setFormData({ ...formData, project_duration: e.target.value })}
                      placeholder="e.g. 2-4 weeks"
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                </div>

                {formData.contract_type === 'milestone' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Number of Milestones
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.number_of_milestones}
                      onChange={(e) => setFormData({ ...formData, number_of_milestones: parseInt(e.target.value) })}
                      className="input w-full"
                    />
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="btn-primary"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Review Your Job</h3>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Title</div>
                      <div className="font-medium text-white">{formData.title}</div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400 mb-1">Description</div>
                      <div className="text-gray-300">{formData.description}</div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Category</div>
                        <div className="font-medium text-white">{formData.category}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Experience Level</div>
                        <div className="font-medium text-white capitalize">{formData.experience_level}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-400 mb-1">Required Skills</div>
                      <div className="flex flex-wrap gap-2">
                        {formData.required_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="badge badge-primary flex items-center gap-1"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Contract Type</div>
                        <div className="font-medium text-white capitalize">{formData.contract_type}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Budget</div>
                        <div className="font-medium text-white">${parseFloat(formData.budget).toLocaleString()} PYUSD</div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-blue-300 mb-1">Escrow Deposit Required</div>
                          <div className="text-sm text-blue-400">
                            ${(parseFloat(formData.budget) * 0.15).toFixed(2)} PYUSD will be locked in escrow when you post this job.
                            This is fully refundable if you cancel before accepting any bids.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-300 mb-2">Before You Post</h4>
                  <ul className="text-sm text-yellow-400 space-y-1">
                    <li>✓ Make sure your wallet has sufficient PYUSD for the escrow deposit</li>
                    <li>✓ You'll need to approve the transaction in your wallet</li>
                    <li>✓ Job will be visible to all freelancers once posted</li>
                    <li>✓ You can edit or cancel before accepting any bids</li>
                  </ul>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || pyusdBalance < (parseFloat(formData.budget) * 0.15)}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Posting...' : 
                     pyusdBalance < (parseFloat(formData.budget) * 0.15) ? 'Insufficient PYUSD Balance' :
                     'Post Job & Pay Escrow'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
