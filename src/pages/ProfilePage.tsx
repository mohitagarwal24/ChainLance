import { useState, useEffect } from 'react';
import { MapPin, Star, Edit2 } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useData, Rating } from '../contexts/DataContext';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = () => {
  const { walletAddress, userProfile, updateProfile } = useWallet();
  const { getRatingsForWallet } = useData();
  const [editing, setEditing] = useState(false);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    location: '',
    hourly_rate: '',
    skills: [] as string[],
  });
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (userProfile) {
      setFormData({
        display_name: userProfile.display_name || '',
        bio: userProfile.bio || '',
        location: userProfile.location || '',
        hourly_rate: userProfile.hourly_rate?.toString() || '',
        skills: userProfile.skills || [],
      });
      loadRatings();
    }
  }, [userProfile]);

  const loadRatings = async () => {
    if (!walletAddress) return;

    const ratingsData = getRatingsForWallet(walletAddress);
    setRatings(ratingsData.slice(0, 5)); // Limit to 5 most recent
  };

  const handleSave = async () => {
    await updateProfile({
      display_name: formData.display_name,
      bio: formData.bio,
      location: formData.location,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      skills: formData.skills,
      updated_at: new Date().toISOString(),
    });
    setEditing(false);
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  if (!userProfile) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please connect your wallet to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600"></div>

          <div className="px-6 pb-6">
            <div className="flex justify-between items-start -mt-16 mb-6">
              <div className="flex items-end gap-4">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-4 border-gray-800 flex items-center justify-center text-white text-4xl font-bold">
                  {formData.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="mb-4">
                  {editing ? (
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="text-2xl font-bold text-white bg-transparent border-b-2 border-blue-600 focus:outline-none"
                      placeholder="Your Name"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-white">
                      {formData.display_name || 'Anonymous User'}
                    </h1>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => (editing ? handleSave() : setEditing(true))}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                {editing ? 'Save Profile' : 'Edit Profile'}
              </button>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Jobs Completed</div>
                <h1 className="text-2xl font-bold text-white">{userProfile.jobs_completed}</h1>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Success Rate</div>
                <div className="text-2xl font-bold text-white">{userProfile.success_rate}%</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Average Rating</div>
                <div className="text-2xl font-bold text-white flex items-center gap-1">
                  {userProfile.average_rating > 0 ? userProfile.average_rating.toFixed(1) : 'N/A'}
                  {userProfile.average_rating > 0 && <Star className="w-5 h-5 text-yellow-500" />}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Total Earned</div>
                <div className="text-2xl font-bold text-white">
                  ${userProfile.total_earned.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">About</h3>
                {editing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    className="input w-full resize-none"
                    placeholder="Tell clients about your experience and expertise..."
                  />
                ) : (
                  <p className="text-gray-400">{userProfile.bio || 'No bio provided'}</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Location</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="input w-full"
                        placeholder="City, Country"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-white">
                        <MapPin className="w-4 h-4" />
                        {formData.location || 'Not specified'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                        className="input w-full"
                        placeholder="Your Name"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-white">
                        {formData.display_name || 'Anonymous User'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Skills</h3>
                {editing && (
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                      className="input flex-1"
                      placeholder="Add a skill"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="btn-primary"
                    >
                      Add
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {formData.skills.length > 0 ? (
                    formData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="badge badge-primary flex items-center gap-1"
                      >
                        {skill}
                        {editing && (
                          <button
                            onClick={() =>
                              setFormData({
                                ...formData,
                                skills: formData.skills.filter((s) => s !== skill),
                              })
                            }
                            className="hover:text-blue-900"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">No skills added yet</p>
                  )}
                </div>
              </div>

              {ratings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Recent Reviews</h3>
                  <div className="space-y-4">
                    {ratings.map((rating) => (
                      <div key={rating.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < rating.rating ? 'text-yellow-500 fill-current' : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-400">
                            {new Date(rating.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm">{rating.review_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
