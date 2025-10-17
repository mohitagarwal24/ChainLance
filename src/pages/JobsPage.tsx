import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, DollarSign, MapPin, Briefcase, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useWallet } from '../contexts/WalletContext';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  required_skills: string[];
  budget: number;
  contract_type: string;
  experience_level: string;
  project_duration: string | null;
  bids_count: number;
  created_at: string;
  client_wallet: string;
  status: string;
}

interface JobsPageProps {
  onNavigate: (page: string, data?: any) => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedContractType, setSelectedContractType] = useState('all');
  const [budgetRange, setBudgetRange] = useState('all');
  const { walletAddress } = useWallet();

  const categories = [
    'All Categories',
    'Web Development',
    'Mobile Development',
    'Design',
    'Writing',
    'Marketing',
    'Data Science',
    'Blockchain',
    'AI/ML',
    'Other',
  ];

  useEffect(() => {
    loadJobs();
  }, [selectedCategory, selectedContractType, budgetRange]);

  const loadJobs = async () => {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (selectedCategory !== 'all') {
      query = query.eq('category', selectedCategory);
    }

    if (selectedContractType !== 'all') {
      query = query.eq('contract_type', selectedContractType);
    }

    if (budgetRange !== 'all') {
      const [min, max] = budgetRange.split('-').map(Number);
      query = query.gte('budget', min);
      if (max) {
        query = query.lte('budget', max);
      }
    }

    const { data, error } = await query;

    if (!error && data) {
      setJobs(data);
    }
    setLoading(false);
  };

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.required_skills.some((skill) =>
      skill.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Work</h1>
          <p className="text-gray-600">
            Browse {filteredJobs.length} available jobs with smart contract escrow
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs by title, skills, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="Web Development">Web Development</option>
              <option value="Mobile Development">Mobile Development</option>
              <option value="Design">Design</option>
              <option value="Writing">Writing</option>
              <option value="Marketing">Marketing</option>
              <option value="Data Science">Data Science</option>
              <option value="Blockchain">Blockchain</option>
              <option value="AI/ML">AI/ML</option>
            </select>

            <select
              value={selectedContractType}
              onChange={(e) => setSelectedContractType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="fixed">Fixed Price</option>
              <option value="hourly">Hourly</option>
              <option value="milestone">Milestone</option>
            </select>

            <select
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Any Budget</option>
              <option value="0-500">Under $500</option>
              <option value="500-1000">$500 - $1,000</option>
              <option value="1000-5000">$1,000 - $5,000</option>
              <option value="5000-10000">$5,000 - $10,000</option>
              <option value="10000-999999">$10,000+</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600">Try adjusting your filters or search criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => onNavigate('job-detail', { jobId: job.id })}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer border border-gray-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600">
                      {job.title}
                    </h3>
                    <p className="text-gray-600 line-clamp-2 mb-3">
                      {job.description}
                    </p>
                  </div>
                  <div className="ml-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        ${job.budget.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {job.contract_type}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {job.required_skills.slice(0, 5).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.required_skills.length > 5 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                      +{job.required_skills.length - 5} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {getTimeSince(job.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {job.bids_count} proposals
                    </span>
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs capitalize">
                      {job.experience_level}
                    </span>
                  </div>
                  <span className="text-blue-600 font-medium hover:text-blue-700">
                    View Details →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
