import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { interviewRequestService } from '../services/interviewRequestService';
import './AllInterviewRequests.css';

const AllInterviewRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allRequests, setAllRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [filters, setFilters] = useState({
    status: 'ALL',
    interviewType: 'ALL',
    dateFilter: 'ALL'
  });
  const [acceptingRequest, setAcceptingRequest] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(null);

  const isInterviewee = user?.roles?.includes('INTERVIEWEE');
  const isInterviewer = user?.roles?.includes('INTERVIEWER');

  useEffect(() => {
    fetchAllRequests();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [allRequests, filters]);

  const fetchAllRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      let requests = [];

      if (isInterviewee) {
        // Get user's own requests
        requests = await dashboardService.getMyRequests();
      } else if (isInterviewer) {
        // Get both open requests and user's accepted requests
        const [openRequests, myRequests] = await Promise.all([
          dashboardService.getOpenRequests(),
          dashboardService.getMyRequests()
        ]);
        
        // Combine and deduplicate
        const allRequestsMap = new Map();
        
        // Add open requests
        openRequests.forEach(req => allRequestsMap.set(req._id, req));
        
        // Add user's requests (accepted ones)
        myRequests.forEach(req => {
          if (req.acceptedBy?.toString() === user._id) {
            allRequestsMap.set(req._id, req);
          }
        });
        
        requests = Array.from(allRequestsMap.values());
      }

      // Add isExpired field
      const now = new Date();
      const enrichedRequests = requests.map(req => ({
        ...req,
        isExpired: req.status === "OPEN" && req.expiresAt && new Date(req.expiresAt) < now
      }));

      setAllRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allRequests];

    // Status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(req => {
        if (filters.status === 'EXPIRED') {
          return req.isExpired;
        }
        return req.status === filters.status;
      });
    }

    // Interview type filter
    if (filters.interviewType !== 'ALL') {
      filtered = filtered.filter(req => 
        req.interviewTypes?.includes(filters.interviewType)
      );
    }

    // Date filter
    const now = new Date();
    if (filters.dateFilter === 'UPCOMING') {
      filtered = filtered.filter(req => new Date(req.scheduledAt) > now);
    } else if (filters.dateFilter === 'PAST') {
      filtered = filtered.filter(req => new Date(req.scheduledAt) <= now);
    }

    setFilteredRequests(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
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
    const statusMap = {
      OPEN: 'status-open',
      ACCEPTED: 'status-accepted',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
      EXPIRED: 'status-expired',
    };
    return statusMap[status] || 'status-default';
  };

  const handleAcceptRequest = async (requestId) => {
    if (acceptingRequest) return;
    
    setAcceptingRequest(requestId);
    try {
      await interviewRequestService.acceptRequest(requestId);
      await fetchAllRequests(); // Refresh data
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept interview request. Please try again.');
    } finally {
      setAcceptingRequest(null);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (deletingRequest) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this interview request? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingRequest(requestId);
    try {
      await interviewRequestService.deleteRequest(requestId);
      await fetchAllRequests(); // Refresh data
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Delete functionality is not available yet. Please contact support if you need to cancel a request.');
    } finally {
      setDeletingRequest(null);
    }
  };

  const handleEditRequest = (requestId) => {
    navigate(`/create-interview?edit=${requestId}`);
  };

  const canEditDelete = (request) => {
    return isInterviewee && 
           String(request.createdBy?._id) === String(user._id) && 
           request.status === 'OPEN' && 
           !request.isExpired;
  };

  const canAccept = (request) => {
    return isInterviewer && 
           request.status === 'OPEN' && 
           !request.isExpired &&
           String(request.createdBy?._id) !== String(user._id);
  };

  if (loading) {
    return (
      <div className="all-requests-container">
        <div className="loading-state">Loading interview requests...</div>
      </div>
    );
  }

  return (
    <div className="all-requests-container">
      {/* Header */}
      <div className="all-requests-header">
        <div className="header-content">
          <div className="header-left">
            <div>
              <h1 className="page-title">All Interview Requests</h1>
              <p className="page-subtitle">
                {isInterviewee ? 'Your interview requests' : 'Available and accepted interview requests'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-container">
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>
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
              <option value="UPCOMING">Upcoming</option>
              <option value="PAST">Past</option>
            </select>
          </div>

          <div className="filter-results">
            Showing {filteredRequests.length} of {allRequests.length} requests
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="requests-section">
        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <p>No interview requests found matching your filters.</p>
          </div>
        ) : (
          <div className="requests-grid">
            {filteredRequests.map((request) => (
              <div key={request._id} className="request-card">
                <div className="request-info">
                  <h3 className="request-title">{request.skills?.join(', ')}</h3>
                  
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

                  {/* Participant Information */}
                  <div className="participant-info">
                    <div className="participant-item">
                      <span className="participant-label">Interviewee:</span>
                      <span className="participant-name">
                        {request.createdBy?.name || `User ${request.createdBy?._id?.slice(-4)}`}
                      </span>
                    </div>
                    <div className="participant-item">
                      <span className="participant-label">Interviewer:</span>
                      <span className="participant-name">
                        {request.status === 'ACCEPTED' && request.acceptedBy?.name 
                          ? request.acceptedBy.name
                          : request.status === 'OPEN' && !request.isExpired
                          ? 'Awaiting interviewer'
                          : request.isExpired
                          ? 'Request expired'
                          : 'Not assigned'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="request-footer">
                  <span className={`request-status ${getStatusBadgeClass(request.status, request.isExpired)}`}>
                    {request.isExpired ? 'EXPIRED' : request.status}
                  </span>
                  
                  <div className="request-actions">
                    {canEditDelete(request) && (
                      <>
                        <button 
                          className="edit-btn"
                          onClick={() => handleEditRequest(request._id)}
                          title="Edit Request"
                        >
                          ✏️
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => handleDeleteRequest(request._id)}
                          disabled={deletingRequest === request._id}
                          title="Delete Request"
                        >
                          {deletingRequest === request._id ? '⏳' : '🗑️'}
                        </button>
                      </>
                    )}
                    
                    {canAccept(request) && (
                      <button 
                        className="accept-btn"
                        onClick={() => handleAcceptRequest(request._id)}
                        disabled={acceptingRequest === request._id}
                      >
                        {acceptingRequest === request._id ? 'Accepting...' : 'Accept'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllInterviewRequests;