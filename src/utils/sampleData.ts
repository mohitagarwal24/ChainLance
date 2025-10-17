import { supabase } from '../lib/supabase';

export const insertSampleJobs = async () => {
  const sampleJobs = [
    {
      client_wallet: '0x1234567890123456789012345678901234567890',
      title: 'Build a React-based Dashboard with Web3 Integration',
      description: 'Looking for an experienced React developer to build a modern dashboard with Web3 wallet integration. The project includes user authentication, data visualization charts, and smart contract interactions. Must have experience with ethers.js or web3.js.',
      category: 'Web Development',
      required_skills: ['React', 'TypeScript', 'Web3', 'Tailwind CSS', 'Ethers.js'],
      budget: 5000,
      contract_type: 'milestone',
      experience_level: 'expert',
      project_duration: '4-6 weeks',
      number_of_milestones: 3,
      escrow_deposit: 750,
      status: 'open',
    },
    {
      client_wallet: '0x2345678901234567890123456789012345678901',
      title: 'Smart Contract Development for NFT Marketplace',
      description: 'Need a Solidity developer to create smart contracts for an NFT marketplace. Must include minting, buying, selling, and royalty distribution features. ERC-721 and ERC-1155 standards required.',
      category: 'Blockchain',
      required_skills: ['Solidity', 'Smart Contracts', 'Hardhat', 'OpenZeppelin', 'Web3'],
      budget: 8000,
      contract_type: 'fixed',
      experience_level: 'expert',
      project_duration: '3-4 weeks',
      number_of_milestones: 1,
      escrow_deposit: 1200,
      status: 'open',
    },
    {
      client_wallet: '0x3456789012345678901234567890123456789012',
      title: 'Mobile App UI/UX Design for DeFi Platform',
      description: 'Seeking a talented UI/UX designer to create a sleek, modern mobile app design for our DeFi platform. Need complete design system, wireframes, and high-fidelity mockups for iOS and Android.',
      category: 'Design',
      required_skills: ['Figma', 'UI/UX Design', 'Mobile Design', 'Design Systems', 'Prototyping'],
      budget: 3500,
      contract_type: 'milestone',
      experience_level: 'intermediate',
      project_duration: '2-3 weeks',
      number_of_milestones: 2,
      escrow_deposit: 525,
      status: 'open',
    },
    {
      client_wallet: '0x4567890123456789012345678901234567890123',
      title: 'Technical Writing for Blockchain Documentation',
      description: 'Looking for a technical writer with blockchain knowledge to create comprehensive documentation for our smart contract platform. Includes API docs, user guides, and developer tutorials.',
      category: 'Writing',
      required_skills: ['Technical Writing', 'Blockchain', 'API Documentation', 'Markdown', 'Git'],
      budget: 2000,
      contract_type: 'hourly',
      experience_level: 'intermediate',
      project_duration: '2-4 weeks',
      number_of_milestones: 1,
      escrow_deposit: 300,
      status: 'open',
    },
    {
      client_wallet: '0x5678901234567890123456789012345678901234',
      title: 'AI Chatbot Integration for Customer Support',
      description: 'Need an AI/ML engineer to integrate a conversational chatbot into our platform for customer support. Should handle common queries, escalate complex issues, and learn from interactions.',
      category: 'AI/ML',
      required_skills: ['Python', 'NLP', 'Machine Learning', 'TensorFlow', 'API Integration'],
      budget: 6000,
      contract_type: 'milestone',
      experience_level: 'expert',
      project_duration: '4-5 weeks',
      number_of_milestones: 3,
      escrow_deposit: 900,
      status: 'open',
    },
  ];

  try {
    const { data, error } = await supabase.from('jobs').insert(sampleJobs).select();

    if (error) {
      console.error('Error inserting sample jobs:', error);
      return { success: false, error };
    }

    console.log('Sample jobs inserted successfully:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error:', err);
    return { success: false, error: err };
  }
};

export const insertSampleProfiles = async () => {
  const sampleProfiles = [
    {
      wallet_address: '0x1234567890123456789012345678901234567890',
      display_name: 'Alice Johnson',
      bio: 'Experienced project manager and Web3 enthusiast. Posted over 20 successful projects on blockchain platforms.',
      location: 'San Francisco, CA',
      role: 'client',
      average_rating: 4.8,
      total_reviews: 15,
      jobs_completed: 20,
      total_spent: 50000,
    },
    {
      wallet_address: '0x2345678901234567890123456789012345678901',
      display_name: 'Bob Smith',
      bio: 'Startup founder building the next generation of DeFi tools.',
      location: 'New York, NY',
      role: 'client',
      average_rating: 4.9,
      total_reviews: 8,
      jobs_completed: 10,
      total_spent: 35000,
    },
  ];

  try {
    const { data, error } = await supabase.from('profiles').insert(sampleProfiles).select();

    if (error) {
      console.error('Error inserting sample profiles:', error);
      return { success: false, error };
    }

    console.log('Sample profiles inserted successfully:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Error:', err);
    return { success: false, error: err };
  }
};
