import React, { useState } from 'react';
import { ArrowLeft, Plus, X, DollarSign, Calendar, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWallet } from '../contexts/WalletContext';

interface PostJobPageProps {
  onNavigate: (page: string) => void;
}

export const PostJobPage: React.FC<PostJobPageProps> = ({ onNavigate }) => {
  const { walletAddress } = useWallet();
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

    setSubmitting(true);

    const escrowDeposit = parseFloat(formData.budget) * 0.15;

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        client_wallet: walletAddress,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        required_skills: formData.required_skills,
        budget: parseFloat(formData.budget),
        contract_type: formData.contract_type,
        experience_level: formData.experience_level,
        project_duration: formData.project_duration,
        deadline: formData.deadline || null,
        number_of_milestones: formData.number_of_milestones,
        escrow_deposit: escrowDeposit,
        status: 'open',
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      alert('Error posting job: ' + error.message);
    } else {
      alert('Job posted successfully! In production, you would now deposit the escrow to the smart contract.');
      onNavigate('my-jobs');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a Job</h1>
            <p className="text-gray-600">
              Create a job posting with smart contract escrow protection
            </p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Build a React-based Dashboard with Web3 Integration"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={6}
                    placeholder="Describe your project in detail, including requirements, deliverables, and expectations..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Level *
                    </label>
                    <select
                      value={formData.experience_level}
                      onChange={(e) => setFormData({ ...formData, experience_level: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.required_skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold capitalize mb-1">{type} Price</div>
                        <div className="text-sm text-gray-600">
                          {type === 'fixed' && 'One-time payment'}
                          {type === 'hourly' && 'Pay per hour worked'}
                          {type === 'milestone' && 'Pay per milestone'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {formData.budget && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Escrow Deposit Required:</strong> ${(parseFloat(formData.budget) * 0.15).toFixed(2)} PYUSD (15% of budget)
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        This deposit prevents spam and ensures serious job postings. Fully refundable if you cancel before accepting bids.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Duration
                    </label>
                    <input
                      type="text"
                      value={formData.project_duration}
                      onChange={(e) => setFormData({ ...formData, project_duration: e.target.value })}
                      placeholder="e.g. 2-4 weeks"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {formData.contract_type === 'milestone' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Milestones
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.number_of_milestones}
                      onChange={(e) => setFormData({ ...formData, number_of_milestones: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Job</h3>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Title</div>
                      <div className="font-medium text-gray-900">{formData.title}</div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Description</div>
                      <div className="text-gray-900">{formData.description}</div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Category</div>
                        <div className="font-medium text-gray-900">{formData.category}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Experience Level</div>
                        <div className="font-medium text-gray-900 capitalize">{formData.experience_level}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Required Skills</div>
                      <div className="flex flex-wrap gap-2">
                        {formData.required_skills.map((skill, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Contract Type</div>
                        <div className="font-medium text-gray-900 capitalize">{formData.contract_type}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Budget</div>
                        <div className="font-medium text-gray-900">${parseFloat(formData.budget).toLocaleString()} PYUSD</div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-blue-900 mb-1">Escrow Deposit Required</div>
                          <div className="text-sm text-blue-700">
                            ${(parseFloat(formData.budget) * 0.15).toFixed(2)} PYUSD will be locked in escrow when you post this job.
                            This is fully refundable if you cancel before accepting any bids.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">Before You Post</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
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
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Posting...' : 'Post Job & Pay Escrow'}
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
