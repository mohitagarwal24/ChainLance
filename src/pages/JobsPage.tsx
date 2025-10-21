import { useState, useEffect } from 'react';
import { Search, Clock, Briefcase } from 'lucide-react';
import { useContractData, EnhancedJob } from '../contexts/ContractDataContext';
import { NetworkStatus } from '../components/NetworkStatus';


interface JobsPageProps {
  onNavigate: (page: string, data?: any) => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<EnhancedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedContractType, setSelectedContractType] = useState('all');
  const [budgetRange, setBudgetRange] = useState('all');
  const { getJobs, isLoading } = useContractData();


  useEffect(() => {
    loadJobs();
  }, [selectedCategory, selectedContractType, budgetRange]);

  const loadJobs = async () => {
    setLoading(true);
    
    const filters: any = { status: 'open' };
    
    if (selectedCategory !== 'all') {
      filters.category = selectedCategory;
    }
    
    if (selectedContractType !== 'all') {
      filters.contract_type = selectedContractType;
    }
    
    if (budgetRange !== 'all') {
      filters.budget_range = budgetRange;
    }
    
    const jobsData = getJobs(filters);
    setJobs(jobsData);
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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NetworkStatus />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Find Work</h1>
          <p className="text-gray-400">
            Browse {filteredJobs.length} available jobs with smart contract escrow
          </p>
        </div>

        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs by title, skills, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-10 pr-4 py-2"
              />
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="btn-primary"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input px-4 py-2"
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
              className="input px-4 py-2"
            >
              <option value="all">All Types</option>
              <option value="fixed">Fixed Price</option>
              <option value="hourly">Hourly</option>
              <option value="milestone">Milestone</option>
            </select>

            <select
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
              className="input px-4 py-2"
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
          <div className="card p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No jobs found</h3>
            <p className="text-gray-400">Try adjusting your filters or search criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => onNavigate('job-detail', { jobId: job.id })}
                className="card card-hover p-6 cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2 hover:text-blue-400">
                      {job.title}
                    </h3>
                    <p className="text-gray-400 line-clamp-2 mb-3">
                      {job.description}
                    </p>
                  </div>
                  <div className="ml-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        ${job.budget.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400 capitalize">
                        {job.contract_type}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {job.required_skills.slice(0, 5).map((skill, idx) => (
                    <span
                      key={idx}
                      className="badge badge-primary"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.required_skills.length > 5 && (
                    <span className="badge bg-gray-800 text-gray-400">
                      +{job.required_skills.length - 5} more
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {getTimeSince(job.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {job.bids_count} proposals
                    </span>
                    <span className="badge bg-gray-800 text-gray-400 text-xs capitalize">
                      {job.experience_level}
                    </span>
                  </div>
                  <span className="text-blue-400 font-medium hover:text-blue-300">
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
