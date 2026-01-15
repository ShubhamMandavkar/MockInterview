import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './Profile.css';

const Profile = () => {
  const { user, loading: authLoading, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    skills: [],
    experienceLevel: '',
    timezone: 'UTC',
    roles: ['INTERVIEWEE'], // Always include INTERVIEWEE by default
  });

  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        skills: user.skills || [],
        experienceLevel: user.experienceLevel || '',
        timezone: user.timezone || 'UTC',
        roles: user.roles || ['INTERVIEWEE'], // Ensure INTERVIEWEE is always present
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleRoleChange = (role, isChecked) => {
    if (role === 'INTERVIEWEE') {
      // INTERVIEWEE role cannot be removed
      return;
    }

    setFormData(prev => {
      let newRoles = [...prev.roles];
      
      if (isChecked) {
        // Add role if not already present
        if (!newRoles.includes(role)) {
          newRoles.push(role);
        }
      } else {
        // Remove role
        newRoles = newRoles.filter(r => r !== role);
      }
      
      // Ensure INTERVIEWEE is always present
      if (!newRoles.includes('INTERVIEWEE')) {
        newRoles.unshift('INTERVIEWEE');
      }
      
      return {
        ...prev,
        roles: newRoles
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Call the update profile API
      await authService.updateProfile(formData);
      
      // Refresh user data in the auth context
      await refreshUser();
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="error-message">Please log in to view your profile</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-info">
            <div className="profile-avatar">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h2>{user.name}</h2>
            <p className="profile-email">{user.email}</p>
            <div className="profile-roles">
              {user.roles?.map((role, index) => (
                <span key={index} className="role-badge">{role}</span>
              ))}
            </div>
          </div>

          {user.stats && (
            <div className="profile-stats">
              <h3>Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{user.stats.interviewsGiven || 0}</span>
                  <span className="stat-label">Interviews Given</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{user.stats.interviewsTaken || 0}</span>
                  <span className="stat-label">Interviews Taken</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{user.stats.rating || 0}</span>
                  <span className="stat-label">Rating</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="profile-form-card">
          <h2>Edit Profile</h2>
          
          {error && (
            <div className="error-message">{error}</div>
          )}
          
          {success && (
            <div className="success-message">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled
                className="disabled-input"
              />
              <small>Email cannot be changed</small>
            </div>

            <div className="form-group">
              <label htmlFor="experienceLevel">Experience Level</label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleInputChange}
              >
                <option value="">Select level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="timezone">Timezone</label>
              <input
                id="timezone"
                name="timezone"
                type="text"
                value={formData.timezone}
                onChange={handleInputChange}
                placeholder="e.g., UTC, America/New_York"
              />
            </div>

            <div className="form-group">
              <label>Roles</label>
              <div className="roles-selection">
                <div className="role-option">
                  <label className="role-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes('INTERVIEWEE')}
                      onChange={(e) => handleRoleChange('INTERVIEWEE', e.target.checked)}
                      disabled={true}
                    />
                    <span className="checkmark"></span>
                    <span className="role-label">Interviewee</span>
                  </label>
                  <small className="role-description">Request mock interviews (Required)</small>
                </div>
                
                <div className="role-option">
                  <label className="role-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes('INTERVIEWER')}
                      onChange={(e) => handleRoleChange('INTERVIEWER', e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    <span className="role-label">Interviewer</span>
                  </label>
                  <small className="role-description">Conduct mock interviews (Optional)</small>
                </div>
              </div>
              <small className="helper-text">
                <strong>Note:</strong> Interviewee role is required and cannot be removed.
              </small>
            </div>

            <div className="form-group">
              <label>Skills</label>
              <div className="skills-input">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  placeholder="Add a skill"
                />
                <button type="button" onClick={handleAddSkill} className="add-skill-btn">
                  Add
                </button>
              </div>
              <div className="skills-list">
                {formData.skills.map((skill, index) => (
                  <span key={index} className="skill-tag">
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="remove-skill-btn"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

