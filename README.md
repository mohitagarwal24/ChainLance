# ChainLance - Decentralized Freelancing Platform

A next-generation Web3 freelancing marketplace with smart contract escrow, AI-powered verification, and PYUSD stablecoin payments.

## 🚀 Overview

ChainLance eliminates the high fees and trust issues of traditional freelancing platforms by leveraging blockchain technology, autonomous AI agents, and decentralized escrow. Built for the modern gig economy with security, transparency, and fairness at its core.

## ✨Architechture
<img width="1412" height="2294" alt="Untitled-2025-09-25-1843" src="https://github.com/user-attachments/assets/a3ee387e-274d-45e2-90fe-9e2fb8324a54" />

## ✨ Key Features

### For Everyone
- **Zero Trust Required**: Smart contracts handle all payments automatically
- **On-Chain Reputation**: Permanent, tamper-proof ratings and reviews
- **0-3% Platform Fees**: Drastically lower than traditional 10-20% fees
- **PYUSD Payments**: Stable, USD-pegged cryptocurrency for predictable pricing
- **Global Access**: Work with anyone, anywhere, without intermediaries

### For Clients
- **Spam Prevention**: Required escrow deposit ensures serious job postings only
- **Quality Assurance**: AI agents verify deliverables meet your criteria
- **Automatic Release**: Payments auto-release after 14 days if no action taken
- **Multiple Contract Types**: Fixed-price, hourly, and milestone-based projects
- **Protected Deposits**: Get refunded if you cancel before accepting bids

### For Freelancers
- **Payment Security**: Funds locked in escrow before work begins
- **Fair Disputes**: AI verification protects against unfair rejections
- **Stake-Based Bidding**: Only serious bids with token collateral
- **Guaranteed Payments**: Auto-release ensures timely compensation
- **Portable Reputation**: Your ratings follow you on-chain forever

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Vite** - Lightning-fast build tool
- **Lucide React** - Beautiful icons

### Backend & Data
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Row Level Security** - Database-level access control
- **Real-time Updates** - Live notifications and contract changes

### Web3 Integration (Ready for Implementation)
- **Wallet Connection** - MetaMask and WalletConnect support
- **Smart Contracts** - Solidity-based escrow and payment logic
- **PYUSD Integration** - PayPal USD stablecoin for payments
- **Fetch.ai Agents** - AI-powered deliverable verification
- **Lit Protocol** - Delegated transaction signing with Vincent
- **Cross-Chain Support** - Multi-blockchain compatibility

## 📋 Database Schema

Complete PostgreSQL schema with 9 tables:

- **profiles** - User accounts with wallet addresses, ratings, earnings
- **jobs** - Job postings with escrow deposits and requirements
- **bids** - Freelancer proposals with stake amounts
- **contracts** - Active agreements between parties
- **milestones** - Deliverable checkpoints with AI verification
- **ratings** - On-chain reviews and reputation scores
- **notifications** - Real-time activity updates
- **messages** - Direct communication between users
- **time_logs** - Hour tracking for hourly contracts

All tables have Row Level Security enabled with proper access policies.

## 🎯 User Flows

### Client Flow
1. **Connect Wallet** - MetaMask or other Web3 wallet
2. **Post Job** - Describe project, set budget, deposit 15% escrow
3. **Review Proposals** - Evaluate freelancer bids with staked tokens
4. **Accept Bid** - Lock full payment in smart contract escrow
5. **Review Work** - Check deliverables or wait for auto-release
6. **Rate Freelancer** - Leave on-chain review after completion

### Freelancer Flow
1. **Connect Wallet** - Link your Web3 identity
2. **Browse Jobs** - Search and filter available projects
3. **Submit Bid** - Stake 10% of bid amount as collateral
4. **Get Hired** - Finalize contract terms with client
5. **Deliver Work** - Submit milestones verified by AI agents
6. **Receive Payment** - Automatic release on approval or 14-day timeout
7. **Rate Client** - Build on-chain reputation history

## 🔐 Security Features

### Smart Contract Security
- Escrow locks funds before work begins
- Automatic slashing for bad actors
- Multi-signature support for large contracts
- Emergency pause functionality
- Upgradeable contract patterns

### AI Verification
- Fetch.ai autonomous agents evaluate deliverables
- Automated testing for code submissions
- Content quality checks for creative work
- Guaranteed minimum payment on AI approval
- Reduces dispute resolution time

### Access Control
- Row Level Security on all database tables
- Wallet-based authentication
- Protected API endpoints
- Rate limiting on submissions
- Input validation and sanitization

## 🚦 Getting Started

### Prerequisites
```bash
Node.js 18+ and npm
MetaMask or Web3 wallet browser extension
Supabase account (for database)
```

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/chainlance.git
cd chainlance

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables
Create a `.env` file with:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📱 Features Implemented

### ✅ Core Platform
- [x] Wallet connection and authentication
- [x] User profiles with editable information
- [x] Job posting with multi-step form
- [x] Job browsing with search and filters
- [x] Detailed job views with requirements
- [x] Freelancer bidding system with stakes
- [x] Contract management dashboard
- [x] Responsive mobile-first design
- [x] Real-time database subscriptions ready

### 🔄 In Progress / Future
- [ ] Smart contract deployment and integration
- [ ] PYUSD payment processing
- [ ] Fetch.ai agent integration
- [ ] Lit Protocol Vincent signing
- [ ] Milestone submission and approval
- [ ] Time tracking for hourly contracts
- [ ] Direct messaging system
- [ ] Notification center
- [ ] Rating and review system
- [ ] Dispute resolution interface
- [ ] Cross-chain support

## 🎨 Design Philosophy

- **Upwork-Inspired UX** - Familiar, intuitive interface for users
- **Modern Aesthetics** - Clean, professional design with gradients
- **Mobile-First** - Responsive layouts for all screen sizes
- **Accessible** - WCAG-compliant with keyboard navigation
- **Performance** - Optimized loading and smooth interactions

## 🤝 Partner Integrations

### PayPal PYUSD
USD-pegged stablecoin for all platform payments. Eliminates crypto volatility while maintaining blockchain benefits.

### Fetch.ai / ASI Alliance
Autonomous agents verify deliverables against contract criteria, ensuring fair outcomes and reducing disputes.

### Lit Protocol Vincent
Delegated signing enables automatic payments without compromising security. Freelancers pre-authorize fund releases based on conditions.

### Yellow Network (Bonus)
Off-chain state channels for micropayments in hourly contracts, reducing gas fees and enabling instant transfers.

## 📊 Contract Types

1. **Fixed Price** - One-time payment for complete project
2. **Milestone-Based** - Split into phases with separate payments
3. **Hourly** - Pay per tracked hour with weekly settlements
4. **Retainer** - Prepaid time bank for ongoing work

## 🛡 Dispute Resolution

1. **AI Verification** - First line of defense for quality issues
2. **14-Day Auto-Release** - Prevents payment withholding
3. **Stake Slashing** - Automatic penalties for breach of contract
4. **Community Arbitration** - Optional Kleros integration for complex cases

## 📈 Business Model

- **3% Platform Fee** - Taken from freelancer earnings (vs 10-20% on traditional platforms)
- **No Client Fees** - Clients pay only the project amount plus gas
- **Escrow Interest** - Revenue from locked funds (optional)
- **Premium Features** - Verified badges, featured listings, analytics

## 🌍 Roadmap

### Phase 1 (Current)
- ✅ Core platform UI/UX
- ✅ Database schema and API
- ✅ Wallet authentication
- ✅ Job and bid management

### Phase 2 (Next)
- Smart contract development
- PYUSD integration
- Basic AI verification
- Testing on testnet

### Phase 3
- Mainnet launch
- Advanced AI features
- Cross-chain support
- Mobile apps

### Phase 4
- DAO governance
- Token launch
- Global expansion
- Enterprise features

## 🤝 Contributing

We welcome contributions! Please see CONTRIBUTING.md for guidelines.

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- Website: https://chainlance.io (coming soon)
- Documentation: https://docs.chainlance.io (coming soon)
- Twitter: @ChainLance
- Discord: discord.gg/chainlance

## 💬 Support

- GitHub Issues: Report bugs and request features
- Discord: Join our community for help
- Email: support@chainlance.io

---

Built with ❤️ by the ChainLance team for the future of work.
