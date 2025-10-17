import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  profiles: {
    id: string;
    wallet_address: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    role: 'client' | 'freelancer' | 'both';
    skills: string[];
    portfolio_links: string[];
    hourly_rate: number | null;
    location: string | null;
    total_earned: number;
    total_spent: number;
    jobs_completed: number;
    success_rate: number;
    average_rating: number;
    total_reviews: number;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
  };
  jobs: {
    id: string;
    client_wallet: string;
    title: string;
    description: string;
    category: string;
    required_skills: string[];
    budget: number;
    contract_type: 'fixed' | 'hourly' | 'milestone';
    escrow_deposit: number;
    escrow_tx_hash: string | null;
    status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
    deadline: string | null;
    experience_level: 'beginner' | 'intermediate' | 'expert';
    project_duration: string | null;
    number_of_milestones: number;
    bids_count: number;
    views_count: number;
    created_at: string;
    updated_at: string;
  };
  bids: {
    id: string;
    job_id: string;
    freelancer_wallet: string;
    proposed_amount: number;
    stake_amount: number;
    stake_tx_hash: string | null;
    cover_letter: string | null;
    estimated_timeline: string | null;
    proposed_milestones: any;
    status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
    created_at: string;
    updated_at: string;
  };
  contracts: {
    id: string;
    job_id: string;
    bid_id: string | null;
    client_wallet: string;
    freelancer_wallet: string;
    total_amount: number;
    escrow_amount: number;
    escrow_tx_hash: string | null;
    contract_type: 'fixed' | 'hourly' | 'milestone';
    hourly_rate: number | null;
    hours_allocated: number | null;
    payment_schedule: string | null;
    status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
    start_date: string;
    end_date: string | null;
    completion_date: string | null;
    dispute_reason: string | null;
    created_at: string;
    updated_at: string;
  };
  milestones: {
    id: string;
    contract_id: string;
    title: string;
    description: string | null;
    amount: number;
    due_date: string | null;
    status: 'pending' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disputed';
    submission_description: string | null;
    submission_files: string[];
    submitted_at: string | null;
    ai_verification_status: 'pending' | 'passed' | 'failed' | 'not_applicable' | null;
    ai_verification_details: any;
    client_feedback: string | null;
    revision_requested: boolean;
    auto_release_date: string | null;
    released_at: string | null;
    release_tx_hash: string | null;
    created_at: string;
    updated_at: string;
  };
  ratings: {
    id: string;
    contract_id: string;
    rater_wallet: string;
    rated_wallet: string;
    rating: number;
    quality_rating: number | null;
    communication_rating: number | null;
    timeliness_rating: number | null;
    review_text: string | null;
    would_recommend: boolean;
    is_public: boolean;
    created_at: string;
  };
  notifications: {
    id: string;
    user_wallet: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    metadata: any;
    is_read: boolean;
    created_at: string;
  };
  messages: {
    id: string;
    contract_id: string | null;
    job_id: string | null;
    sender_wallet: string;
    receiver_wallet: string;
    message_text: string;
    attachments: string[];
    is_read: boolean;
    created_at: string;
  };
  time_logs: {
    id: string;
    contract_id: string;
    freelancer_wallet: string;
    date: string;
    hours: number;
    description: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'disputed';
    approved_at: string | null;
    created_at: string;
    updated_at: string;
  };
};
