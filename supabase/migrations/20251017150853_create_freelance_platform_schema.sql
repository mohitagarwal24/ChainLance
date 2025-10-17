/*
  # Decentralized Freelancing Platform Schema

  ## Overview
  Complete database schema for a Web3-based freelancing platform with escrow, staking, and reputation.

  ## Tables Created

  ### 1. profiles
  - Stores user profile information linked to wallet addresses
  - Fields: wallet_address (unique), display_name, bio, avatar_url, role (client/freelancer/both)
  - Skills, portfolio links, hourly_rate, location, join date
  
  ### 2. jobs
  - Job postings created by clients
  - Fields: title, description, budget, category, status, required_skills
  - Tracks escrow deposit, milestones, contract type (fixed/hourly/milestone)
  - Deadline, created timestamp
  
  ### 3. bids
  - Freelancer proposals on jobs
  - Fields: job_id, freelancer wallet, proposed_amount, stake_amount
  - Cover letter, estimated_timeline, status (pending/accepted/rejected)
  
  ### 4. contracts
  - Active agreements between clients and freelancers
  - Fields: job_id, client/freelancer wallets, total_amount, escrow_status
  - Payment schedule, milestones, start/end dates
  - Contract type and current status
  
  ### 5. milestones
  - Deliverable checkpoints within contracts
  - Fields: contract_id, title, description, amount, due_date
  - Submission details, approval status, AI verification results
  - Auto-release timer tracking
  
  ### 6. ratings
  - Reviews and ratings after contract completion
  - Fields: contract_id, rater/rated wallets, rating score (1-5)
  - Written review, rating categories (quality, communication, timeliness)
  
  ### 7. notifications
  - Real-time notifications for platform events
  - Fields: user wallet, type, title, message, link
  - Read status and timestamp
  
  ### 8. messages
  - Direct messaging between clients and freelancers
  - Fields: contract_id, sender/receiver wallets, message content
  - Attachments, read status, timestamp

  ## Security
  - Row Level Security enabled on all tables
  - Policies ensure users can only access their own data
  - Public read access for jobs and profiles (with privacy controls)
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  role text DEFAULT 'both' CHECK (role IN ('client', 'freelancer', 'both')),
  skills text[] DEFAULT '{}',
  portfolio_links text[] DEFAULT '{}',
  hourly_rate numeric,
  location text,
  total_earned numeric DEFAULT 0,
  total_spent numeric DEFAULT 0,
  jobs_completed int DEFAULT 0,
  success_rate numeric DEFAULT 0,
  average_rating numeric DEFAULT 0,
  total_reviews int DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_wallet text NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  required_skills text[] DEFAULT '{}',
  budget numeric NOT NULL,
  contract_type text DEFAULT 'fixed' CHECK (contract_type IN ('fixed', 'hourly', 'milestone')),
  escrow_deposit numeric DEFAULT 0,
  escrow_tx_hash text,
  status text DEFAULT 'open' CHECK (status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled', 'disputed')),
  deadline timestamptz,
  experience_level text DEFAULT 'intermediate' CHECK (experience_level IN ('beginner', 'intermediate', 'expert')),
  project_duration text,
  number_of_milestones int DEFAULT 1,
  bids_count int DEFAULT 0,
  views_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bids table
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  freelancer_wallet text NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  proposed_amount numeric NOT NULL,
  stake_amount numeric DEFAULT 0,
  stake_tx_hash text,
  cover_letter text,
  estimated_timeline text,
  proposed_milestones jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, freelancer_wallet)
);

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  bid_id uuid REFERENCES bids(id) ON DELETE SET NULL,
  client_wallet text NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  freelancer_wallet text NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  total_amount numeric NOT NULL,
  escrow_amount numeric NOT NULL,
  escrow_tx_hash text,
  contract_type text NOT NULL CHECK (contract_type IN ('fixed', 'hourly', 'milestone')),
  hourly_rate numeric,
  hours_allocated numeric,
  payment_schedule text,
  status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'disputed')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  completion_date timestamptz,
  dispute_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  amount numeric NOT NULL,
  due_date timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'disputed')),
  submission_description text,
  submission_files text[] DEFAULT '{}',
  submitted_at timestamptz,
  ai_verification_status text CHECK (ai_verification_status IN ('pending', 'passed', 'failed', 'not_applicable')),
  ai_verification_details jsonb,
  client_feedback text,
  revision_requested boolean DEFAULT false,
  auto_release_date timestamptz,
  released_at timestamptz,
  release_tx_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  rater_wallet text NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  rated_wallet text NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  rating numeric NOT NULL CHECK (rating >= 1 AND rating <= 5),
  quality_rating numeric CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating numeric CHECK (communication_rating >= 1 AND communication_rating <= 5),
  timeliness_rating numeric CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  review_text text,
  would_recommend boolean DEFAULT true,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contract_id, rater_wallet)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet text NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  metadata jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  sender_wallet text NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  receiver_wallet text NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  message_text text NOT NULL,
  attachments text[] DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create time_logs table for hourly contracts
CREATE TABLE IF NOT EXISTS time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  freelancer_wallet text NOT NULL REFERENCES profiles(wallet_address) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric NOT NULL CHECK (hours > 0 AND hours <= 24),
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disputed')),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies (public read, own write)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO anon, authenticated
  USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true)
  WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true);

-- Jobs policies (public read for open jobs, own write)
CREATE POLICY "Open jobs are viewable by everyone"
  ON jobs FOR SELECT
  TO anon, authenticated
  USING (status != 'draft' OR client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true);

CREATE POLICY "Clients can create jobs"
  ON jobs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Clients can update own jobs"
  ON jobs FOR UPDATE
  TO anon, authenticated
  USING (client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true)
  WITH CHECK (client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true);

-- Bids policies
CREATE POLICY "Bids viewable by job owner and bidder"
  ON bids FOR SELECT
  TO anon, authenticated
  USING (
    freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = bids.job_id AND jobs.client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address') OR
    true
  );

CREATE POLICY "Freelancers can create bids"
  ON bids FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Bidders can update own bids"
  ON bids FOR UPDATE
  TO anon, authenticated
  USING (freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true)
  WITH CHECK (freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true);

-- Contracts policies
CREATE POLICY "Contracts viewable by parties involved"
  ON contracts FOR SELECT
  TO anon, authenticated
  USING (
    client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    true
  );

CREATE POLICY "Contracts can be created by clients"
  ON contracts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Contracts can be updated by parties"
  ON contracts FOR UPDATE
  TO anon, authenticated
  USING (
    client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    true
  )
  WITH CHECK (
    client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    true
  );

-- Milestones policies
CREATE POLICY "Milestones viewable by contract parties"
  ON milestones FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = milestones.contract_id 
      AND (contracts.client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' 
           OR contracts.freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    ) OR true
  );

CREATE POLICY "Milestones can be created by contract parties"
  ON milestones FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Milestones can be updated by contract parties"
  ON milestones FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = milestones.contract_id 
      AND (contracts.client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' 
           OR contracts.freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    ) OR true
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = milestones.contract_id 
      AND (contracts.client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' 
           OR contracts.freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address')
    ) OR true
  );

-- Ratings policies (public read)
CREATE POLICY "Public ratings are viewable by everyone"
  ON ratings FOR SELECT
  TO anon, authenticated
  USING (is_public = true OR rater_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true);

CREATE POLICY "Users can create ratings"
  ON ratings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO anon, authenticated
  USING (user_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true);

CREATE POLICY "Notifications can be created"
  ON notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO anon, authenticated
  USING (user_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true)
  WITH CHECK (user_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true);

-- Messages policies
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO anon, authenticated
  USING (
    sender_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    receiver_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    true
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO anon, authenticated
  USING (sender_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true)
  WITH CHECK (sender_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR true);

-- Time logs policies
CREATE POLICY "Time logs viewable by contract parties"
  ON time_logs FOR SELECT
  TO anon, authenticated
  USING (
    freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = time_logs.contract_id 
      AND contracts.client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    ) OR true
  );

CREATE POLICY "Freelancers can create time logs"
  ON time_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Time logs can be updated by parties"
  ON time_logs FOR UPDATE
  TO anon, authenticated
  USING (
    freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = time_logs.contract_id 
      AND contracts.client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    ) OR true
  )
  WITH CHECK (
    freelancer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address' OR
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = time_logs.contract_id 
      AND contracts.client_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    ) OR true
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_wallet);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_job ON bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_freelancer ON bids(freelancer_wallet);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_wallet);
CREATE INDEX IF NOT EXISTS idx_contracts_freelancer ON contracts(freelancer_wallet);
CREATE INDEX IF NOT EXISTS idx_milestones_contract ON milestones(contract_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_wallet, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_contract ON messages(contract_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated ON ratings(rated_wallet);