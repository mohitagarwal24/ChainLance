import { Search, Briefcase, Shield, Zap, Users, TrendingUp, CheckCircle } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { walletAddress, connectWallet, isConnecting } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
            The Future of
            <span className="gradient-text"> Freelancing</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Decentralized marketplace with smart contract escrow, AI verification, and PYUSD payments. Zero middleman fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!walletAddress ? (
              <>
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="btn-primary text-lg px-8 py-4 glow-blue disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Get Started'}
                </button>
                <button
                  onClick={() => onNavigate('jobs')}
                  className="btn-secondary text-lg px-8 py-4"
                >
                  Browse Jobs
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('jobs')}
                  className="btn-primary text-lg px-8 py-4 glow-blue"
                >
                  Find Work
                </button>
                <button
                  onClick={() => onNavigate('post-job')}
                  className="btn-secondary text-lg px-8 py-4"
                >
                  Post a Job
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Smart Contract Escrow
            </h3>
            <p className="text-gray-400">
              Payments secured in trustless escrow. Automatic release after 14 days or AI verification approval.
            </p>
          </div>

          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              AI-Powered Verification
            </h3>
            <p className="text-gray-400">
              Fetch.ai agents automatically verify deliverables against contract criteria, ensuring fair outcomes.
            </p>
          </div>

          <div className="card card-hover p-8">
            <div className="w-12 h-12 bg-orange-900 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Stablecoin Payments
            </h3>
            <p className="text-gray-400">
              Get paid in PYUSD stablecoin. No volatility, instant global transfers, minimal fees.
            </p>
          </div>
        </div>

        <div className="card p-8 sm:p-12 mb-20">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold text-blue-400 mb-6">
                For Clients
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-blue-400 font-semibold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Post Your Job</h4>
                    <p className="text-gray-400 text-sm">
                      Describe your project and deposit 10-20% escrow to prevent spam
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-blue-400 font-semibold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Review Proposals</h4>
                    <p className="text-gray-400 text-sm">
                      Freelancers stake tokens to bid, ensuring serious applicants only
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-blue-400 font-semibold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Fund Contract</h4>
                    <p className="text-gray-400 text-sm">
                      Lock full payment in smart contract escrow with milestone terms
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center text-blue-400 font-semibold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Approve & Release</h4>
                    <p className="text-gray-400 text-sm">
                      Review work and approve, or wait 14 days for automatic payment
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-green-400 mb-6">
                For Freelancers
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-900 rounded-full flex items-center justify-center text-green-400 font-semibold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Browse Jobs</h4>
                    <p className="text-gray-400 text-sm">
                      Find projects matching your skills and experience level
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-900 rounded-full flex items-center justify-center text-green-400 font-semibold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Submit Bid</h4>
                    <p className="text-gray-400 text-sm">
                      Stake tokens with your proposal to show commitment
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-900 rounded-full flex items-center justify-center text-green-400 font-semibold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Deliver Work</h4>
                    <p className="text-gray-400 text-sm">
                      Submit milestones verified by AI agents for quality assurance
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-900 rounded-full flex items-center justify-center text-green-400 font-semibold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Get Paid</h4>
                    <p className="text-gray-400 text-sm">
                      Receive PYUSD automatically on approval or after 14-day timeout
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 sm:p-12 text-white text-center glow-blue">
          <h2 className="text-3xl font-bold mb-4">
            Why Choose ChainLance?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Built on blockchain technology with AI automation for the most secure, transparent, and efficient freelancing experience.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold mb-2">0-3%</div>
              <div className="text-blue-100">Platform Fees</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-blue-100">Payment Security</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">14 Days</div>
              <div className="text-blue-100">Auto-Release</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">AI</div>
              <div className="text-blue-100">Verification</div>
            </div>
          </div>
        </div>

        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card card-hover p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
            <h4 className="font-semibold text-white mb-2">Trustless Escrow</h4>
            <p className="text-sm text-gray-400">
              Smart contracts eliminate the need to trust a centralized platform
            </p>
          </div>
          <div className="card card-hover p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
            <h4 className="font-semibold text-white mb-2">On-Chain Reputation</h4>
            <p className="text-sm text-gray-400">
              Your ratings and reviews are permanently stored on the blockchain
            </p>
          </div>
          <div className="card card-hover p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
            <h4 className="font-semibold text-white mb-2">Stake-Based Bidding</h4>
            <p className="text-sm text-gray-400">
              Only serious freelancers bid by staking tokens as collateral
            </p>
          </div>
          <div className="card card-hover p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
            <h4 className="font-semibold text-white mb-2">Global Payments</h4>
            <p className="text-sm text-gray-400">
              Get paid instantly worldwide with PYUSD stablecoin
            </p>
          </div>
          <div className="card card-hover p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
            <h4 className="font-semibold text-white mb-2">Automated Disputes</h4>
            <p className="text-sm text-gray-400">
              AI agents and slashing mechanisms resolve most disputes automatically
            </p>
          </div>
          <div className="card card-hover p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
            <h4 className="font-semibold text-white mb-2">Multiple Contract Types</h4>
            <p className="text-sm text-gray-400">
              Support for fixed-price, milestone, and hourly contracts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
