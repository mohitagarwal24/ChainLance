# ChainLance Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Web3      │  │  Supabase   │  │   UI Components     │ │
│  │  Wallet     │  │   Client    │  │  (Jobs, Bids, etc)  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
           │                  │                    │
           │                  │                    │
           ▼                  ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  MetaMask/Web3  │  │    Supabase     │  │   Fetch.ai      │
│     Wallet      │  │    Database     │  │  AI Agents      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
           │                                        │
           ▼                                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Blockchain Network (EVM-Compatible)             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Escrow    │  │   Bidding   │  │    Reputation       │ │
│  │  Contract   │  │  Contract   │  │     Registry        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Smart Contract Architecture

### 1. Escrow Contract
**Purpose**: Trustless payment holding and release

**Core Functions**:
```solidity
// Deposit funds when job is created
function depositEscrow(uint256 jobId, uint256 amount) external payable

// Release payment to freelancer
function releasePayment(uint256 contractId) external

// Automatic release after timeout (14 days)
function autoRelease(uint256 contractId) external

// Slash stakes on contract violation
function slashStake(uint256 contractId, address violator) external
```

**Key Features**:
- Time-locked releases
- Multi-milestone support
- Emergency withdrawal
- Slashing mechanism for bad actors

### 2. Job Contract
**Purpose**: Job posting and management

**Core Functions**:
```solidity
// Create new job posting
function createJob(
    string memory title,
    string memory description,
    uint256 budget,
    uint256 escrowDeposit
) external payable returns (uint256 jobId)

// Cancel job and refund deposit
function cancelJob(uint256 jobId) external

// Update job details
function updateJob(uint256 jobId, ...) external
```

**Key Features**:
- Minimum deposit requirement (10-20% of budget)
- Status tracking (draft, open, in_progress, completed)
- Job metadata stored on-chain or IPFS

### 3. Bidding Contract
**Purpose**: Freelancer proposal system with stakes

**Core Functions**:
```solidity
// Submit bid with stake
function submitBid(
    uint256 jobId,
    uint256 proposedAmount,
    uint256 stakeAmount
) external payable

// Accept bid and form contract
function acceptBid(uint256 bidId) external

// Withdraw rejected bid stake
function withdrawStake(uint256 bidId) external
```

**Key Features**:
- Stake locking (typically 10% of bid)
- Automatic refund for rejected bids
- Stake becomes collateral when accepted

### 4. Contract Manager
**Purpose**: Active agreement management

**Core Functions**:
```solidity
// Create contract from accepted bid
function createContract(
    uint256 jobId,
    uint256 bidId,
    address client,
    address freelancer
) external returns (uint256 contractId)

// Submit milestone deliverable
function submitMilestone(
    uint256 contractId,
    uint256 milestoneId,
    string memory submissionHash
) external

// Approve or reject milestone
function reviewMilestone(
    uint256 contractId,
    uint256 milestoneId,
    bool approved
) external

// Initiate dispute
function openDispute(
    uint256 contractId,
    string memory reason
) external
```

**Key Features**:
- Milestone tracking
- AI verification integration
- Dispute resolution hooks
- Payment scheduling

### 5. Reputation Registry
**Purpose**: On-chain ratings and reviews

**Core Functions**:
```solidity
// Submit rating after contract
function rateUser(
    address rated,
    uint256 contractId,
    uint8 rating,
    string memory review
) external

// Get user reputation score
function getReputation(address user) external view returns (uint256)

// Check if rating exists
function hasRated(
    uint256 contractId,
    address rater
) external view returns (bool)
```

**Key Features**:
- Immutable ratings
- Weighted average calculation
- Dispute impact on scores
- Verification badges

## Database Schema (Supabase)

### Tables

#### profiles
```sql
- id: uuid (PK)
- wallet_address: text (unique, indexed)
- display_name: text
- bio: text
- avatar_url: text
- role: enum (client/freelancer/both)
- skills: text[]
- hourly_rate: numeric
- average_rating: numeric
- total_reviews: int
- jobs_completed: int
- total_earned: numeric
- total_spent: numeric
- created_at: timestamptz
```

#### jobs
```sql
- id: uuid (PK)
- client_wallet: text (FK profiles, indexed)
- title: text
- description: text
- category: text (indexed)
- required_skills: text[]
- budget: numeric
- contract_type: enum (fixed/hourly/milestone)
- escrow_deposit: numeric
- escrow_tx_hash: text
- status: enum (indexed)
- deadline: timestamptz
- bids_count: int
- created_at: timestamptz (indexed)
```

#### bids
```sql
- id: uuid (PK)
- job_id: uuid (FK jobs, indexed)
- freelancer_wallet: text (FK profiles, indexed)
- proposed_amount: numeric
- stake_amount: numeric
- stake_tx_hash: text
- cover_letter: text
- estimated_timeline: text
- status: enum (pending/accepted/rejected)
- created_at: timestamptz
```

#### contracts
```sql
- id: uuid (PK)
- job_id: uuid (FK jobs)
- bid_id: uuid (FK bids)
- client_wallet: text (FK profiles, indexed)
- freelancer_wallet: text (FK profiles, indexed)
- total_amount: numeric
- escrow_amount: numeric
- contract_type: enum
- status: enum (active/completed/disputed)
- start_date: timestamptz
- completion_date: timestamptz
- created_at: timestamptz
```

#### milestones
```sql
- id: uuid (PK)
- contract_id: uuid (FK contracts, indexed)
- title: text
- description: text
- amount: numeric
- due_date: timestamptz
- status: enum
- submission_files: text[]
- ai_verification_status: enum
- auto_release_date: timestamptz
- release_tx_hash: text
```

## Data Flow

### Job Posting Flow
```
1. Client connects wallet → Profile created in Supabase
2. Client fills job form → Validates required fields
3. Client deposits escrow → Calls smart contract
4. Transaction confirmed → Job saved to database
5. Job appears in listings → Real-time update to UI
```

### Bidding Flow
```
1. Freelancer browses jobs → Queries Supabase
2. Freelancer submits bid → Stakes tokens on-chain
3. Bid saved to database → Client notified
4. Client reviews bids → Fetches from Supabase
5. Client accepts bid → Creates contract on-chain
6. Contract formed → Updated in database
```

### Milestone Flow
```
1. Freelancer submits work → Uploads to IPFS/storage
2. AI agent verifies → Fetch.ai integration
3. Agent approval → Updates contract state
4. Client reviews → 14-day timer starts
5. Auto-release or approval → Payment released on-chain
6. Transaction confirmed → Database updated
```

## Integration Points

### Web3 Wallet
- **MetaMask**: Primary wallet connection
- **WalletConnect**: Mobile wallet support
- **Coinbase Wallet**: Alternative provider
- **Authentication**: Sign message for session

### PYUSD Integration
```typescript
// ERC-20 token interface
const PYUSD_CONTRACT = '0x...'
const pyusd = new ethers.Contract(PYUSD_CONTRACT, ERC20_ABI, signer)

// Approve escrow contract
await pyusd.approve(ESCROW_CONTRACT, amount)

// Deposit to escrow
await escrowContract.deposit(jobId, amount)
```

### Fetch.ai AI Agents
```python
# Agent verification example
from uagents import Agent, Context

verification_agent = Agent(name="deliverable_verifier")

@verification_agent.on_event("milestone_submitted")
async def verify_deliverable(ctx: Context, milestone_id: str):
    # Run automated tests
    result = await run_verification(milestone_id)

    # Update smart contract
    if result.passed:
        await approve_milestone(milestone_id)
    else:
        await request_revision(milestone_id)
```

### Lit Protocol Vincent
```typescript
// Delegate payment release authority
const ability = await litClient.createAbility({
  delegatee: freelancerAddress,
  contract: escrowContract.address,
  functions: ['releasePayment'],
  conditions: [
    { type: 'time', value: autoReleaseDate },
    { type: 'agent_approval', value: true }
  ]
})

// Freelancer can claim with delegated signature
await escrowContract.releasePayment(contractId, ability.signature)
```

## Security Considerations

### Smart Contract Security
- ✅ ReentrancyGuard on all fund transfers
- ✅ Access control with OpenZeppelin
- ✅ Emergency pause mechanism
- ✅ Time locks on critical functions
- ✅ Rate limiting on actions
- ✅ Input validation and bounds checking

### Database Security
- ✅ Row Level Security on all tables
- ✅ Prepared statements (SQL injection prevention)
- ✅ Wallet signature verification
- ✅ Rate limiting on API calls
- ✅ CORS policies
- ✅ Input sanitization

### Application Security
- ✅ XSS prevention (React auto-escaping)
- ✅ CSRF tokens
- ✅ Secure session management
- ✅ Environment variable protection
- ✅ HTTPS enforcement
- ✅ Content Security Policy

## Performance Optimizations

### Frontend
- Code splitting by route
- Lazy loading of components
- Image optimization
- Service worker caching
- Debounced search inputs

### Database
- Indexes on frequently queried columns
- Pagination for large lists
- Real-time subscriptions for updates
- Connection pooling
- Query optimization

### Blockchain
- Batch transactions where possible
- Gas optimization in contracts
- Off-chain data storage (IPFS)
- Layer 2 scaling solutions
- State channels for micropayments

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Cloudflare CDN                     │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              Vercel / Netlify (Frontend)             │
│                    - React App                       │
│                    - Static Assets                   │
└─────────────────────────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
┌──────────────────────┐  ┌──────────────────────┐
│   Supabase Cloud     │  │  Blockchain Network  │
│   - PostgreSQL       │  │  - Smart Contracts   │
│   - Real-time API    │  │  - PYUSD Tokens      │
│   - Auth             │  │  - Reputation        │
└──────────────────────┘  └──────────────────────┘
```

## Future Enhancements

1. **Mobile Apps** - React Native for iOS/Android
2. **Multi-Chain** - Support Ethereum, Polygon, Arbitrum
3. **Advanced AI** - GPT-4 for proposal matching
4. **DAO Governance** - Token-based platform decisions
5. **Identity Verification** - KYC for high-value contracts
6. **Insurance Pool** - Community-backed dispute resolution
7. **Fiat On-Ramp** - Credit card to PYUSD conversion
8. **Analytics Dashboard** - Detailed earnings/spending insights

---

This architecture ensures scalability, security, and decentralization while maintaining excellent user experience.
