import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { interviewRequestService } from '../services/interviewRequestService';
import './AllOpenInterviewRequests.css';

const AllOpenInterviewRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [openRequests, setOpenRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [filters, setFilters] = useState({
    skills: [],
    interviewType: 'ALL',
    dateFilter: 'ALL'
  });
  const [skillInput, setSkillInput] = useState('');
  const [acceptingRequest, setAcceptingRequest] = useState(null);

  const isInterviewer = user?.roles?.includes('INTERVIEWER');

  // Redirect if not interviewer
  useEffect(() => {
    if (!loading && !isInterviewer) {
      navigate('/dashboard');
    }
  }, [isInterviewer, loading, navigate]);

  useEffect(() => {
    if (isInterviewer) {
      fetchOpenRequests();
    }
  }, [isInterviewer]);

  useEffect(() => {
    applyFilters();
  }, [openRequests, filters]);

  const fetchOpenRequests = async () => {
    try {
      setLoading(true);
      const requests = await dashboardService.getOpenRequests();
      
      // Add isExpired field and enrich with user data
      const now = new Date();
      const enrichedRequests = requests.map(req => ({
        ...req,
        isExpired: req.status === "OPEN" && req.expiresAt && new Date(req.expiresAt) < now
      }));

      setOpenRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching open requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...openRequests];

    // Skills filter
    if (filters.skills.length > 0) {
      filtered = filtered.filter(req => 
        filters.skills.some(skill => 
          req.skills?.some(reqSkill => 
            reqSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )
      );
    }

    // Interview type filter
    if (filters.interviewType !== 'ALL') {
      filtered = filtered.filter(req => 
        req.interviewTypes?.includes(filters.interviewType)
      );
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (filters.dateFilter === 'TODAY') {
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      filtered = filtered.filter(req => {
        const scheduledDate = new Date(req.scheduledAt);
        return scheduledDate >= today && scheduledDate < tomorrow;
      });
    } else if (filters.dateFilter === 'NEXT_7_DAYS') {
      filtered = filtered.filter(req => {
        const scheduledDate = new Date(req.scheduledAt);
        return scheduledDate >= today && scheduledDate <= next7Days;
      });
    } else if (filters.dateFilter === 'UPCOMING') {
      filtered = filtered.filter(req => new Date(req.scheduledAt) > now);
    }

    setFilteredRequests(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleSkillAdd = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      const skill = skillInput.trim();
      if (skill && !filters.skills.includes(skill)) {
        setFilters(prev => ({
          ...prev,
          skills: [...prev.skills, skill]
        }));
        setSkillInput('');
      }
    }
  };

  const handleSkillRemove = (skillToRemove) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status, isExpired) => {
    if (isExpired) return 'status-expired';
    return 'status-open';
  };

  const handleAcceptRequest = async (requestId) => {
    if (acceptingRequest) return;
    
    setAcceptingRequest(requestId);
    try {
      await interviewRequestService.acceptRequest(requestId);
      // Remove the accepted request from the list
      setOpenRequests(prev => prev.filter(req => req._id !== requestId));
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept interview request. Please try again.');
    } finally {
      setAcceptingRequest(null);
    }
  };

  const getTimeUntilInterview = (scheduledAt) => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diffMs = scheduled - now;
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) return 'Past';
    if (diffHours < 24) return `${diffHours}h`;
    if (diffHours < 168) return `${Math.ceil(diffHours / 24)}d`;
    return `${Math.ceil(diffHours / 168)}w`;
  };

  if (loading) {
    return (
      <div className="open-requests-container">
        <div className="loading-state">Loading open interview requests...</div>
      </div>
    );
  }

  if (!isInterviewer) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="open-requests-container">
      {/* Header */}
      <div className="open-requests-header">
        <div className="header-content">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate('/dashboard')}>
              ← Back to Dashboard
            </button>
            <div>
              <h1 className="page-title">Open Interview Requests</h1>
              <p className="page-subtitle">
                Available interview requests waiting for an interviewer
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-container">
          <div className="filter-group skills-filter">
            <label>Skills:</label>
            <div className="skill-input-container">
              <input
                type="text"
                placeholder="Type a skill and press Enter"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillAdd}
              />
              <button
                type="button"
                className="add-skill-btn"
                onClick={handleSkillAdd}
              >
                Add
              </button>
            </div>
            <div className="selected-skills">
              {filters.skills.map((skill, index) => (
                <div key={index} className="skill-chip">
                  <span>{skill}</span>
                  <button
                    type="button"
                    className="remove-skill-btn"
                    onClick={() => handleSkillRemove(skill)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Interview Type:</label>
            <select 
              value={filters.interviewType} 
              onChange={(e) => handleFilterChange('interviewType', e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="CODING">Coding</option>
              <option value="CONCEPTUAL">Conceptual</option>
              <option value="SYSTEM_DESIGN">System Design</option>
              <option value="BEHAVIORAL">Behavioral</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date:</label>
            <select 
              value={filters.dateFilter} 
              onChange={(e) => handleFilterChange('dateFilter', e.target.value)}
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="NEXT_7_DAYS">Next 7 Days</option>
              <option value="UPCOMING">All Upcoming</option>
            </select>
          </div>

          <div className="filter-results">
            Showing {filteredRequests.length} of {openRequests.length} requests
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="requests-section">
        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            {openRequests.length === 0 ? (
              <p>No open interview requests available at the moment.</p>
            ) : (
              <p>No interview requests match your current filters.</p>
            )}
          </div>
        ) : (
          <div className="requests-grid">
            {filteredRequests.map((request) => (
              <div key={request._id} className="request-card open-request-card">
                <div className="request-header">
                  <div className="request-title-section">
                    <div className="request-title-info">
                      <h3 className="request-title">{request.skills?.join(', ')}</h3>
                      <div className="interviewee-info">
                        <span className="interviewee-label">Requested by:</span>
                        <span className="interviewee-name">
                          {request.createdBy?.name || `User ${request.createdBy?._id?.slice(-4)}`}
                        </span>
                      </div>
                    </div>
                    <div className="time-badge">
                      {getTimeUntilInterview(request.scheduledAt)}
                    </div>
                  </div>
                  <span className={`request-status ${getStatusBadgeClass(request.status, request.isExpired)}`}>
                    {request.isExpired ? 'EXPIRED' : request.status}
                  </span>
                </div>

                <div className="request-info">
                  <div className="request-details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">
                        {request.interviewTypes?.join(', ') || 'Not specified'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Difficulty:</span>
                      <span className="detail-value">{request.difficulty}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Scheduled:</span>
                      <span className="detail-value">{formatDate(request.scheduledAt)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Duration:</span>
                      <span className="detail-value">{request.duration || 60} minutes</span>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className="skills-section">
                    {/* Required Skills */}
                    <div className="skill-group">
                      <span className="skill-group-label">Required Skills:</span>
                      <div className="skill-chips">
                        {request.skills?.map((skill, index) => (
                          <span key={index} className="skill-chip required-skill">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Interviewee Skills */}
                    {request.createdBy?.skills && request.createdBy.skills.length > 0 && (
                      <div className="skill-group">
                        <span className="skill-group-label">Interviewee Skills:</span>
                        <div className="skill-chips">
                          {request.createdBy.skills.map((skill, index) => (
                            <span key={index} className="skill-chip interviewee-skill">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="request-footer">
                  {!request.isExpired && 
                   isInterviewer && 
                   request.status === 'OPEN' &&
                   String(request.createdBy?._id) !== String(user._id) && (
                    <button 
                      className="accept-btn"
                      onClick={() => handleAcceptRequest(request._id)}
                      disabled={acceptingRequest === request._id}
                    >
                      {acceptingRequest === request._id ? 'Accepting...' : 'Accept Request'}
                    </button>
                  )}
                  {request.isExpired && (
                    <div className="expired-notice">This request has expired</div>
                  )}
                  {!request.isExpired && 
                   (!isInterviewer || String(request.createdBy?._id) === String(user._id)) && (
                    <div className="no-action-notice">
                      {String(request.createdBy?._id) === String(user._id) 
                        ? 'This is your request' 
                        : 'Interviewer role required'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllOpenInterviewRequests;