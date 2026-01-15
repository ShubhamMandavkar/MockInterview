import api from './api';

export const dashboardService = {
  // Get user's interview requests
  getMyRequests: async () => {
    const response = await api.get('/interview-requests/mine');
    return response.data;
  },

  // Get open interview requests
  getOpenRequests: async () => {
    const response = await api.get('/interview-requests/open');
    return response.data;
  },

  // Get user's sessions (we'll need to fetch all sessions and filter)
  // Note: This might need a backend endpoint, but for now we'll work with what we have
  getUserSessions: async (userId) => {
    // This would ideally be a backend endpoint like GET /api/interview-sessions/user/:userId
    // For now, we'll calculate from requests and sessions
    // This is a placeholder - you may need to add this endpoint
    try {
      const response = await api.get(`/interview-sessions/user/${userId}`);
      return response.data;
    } catch (error) {
      // If endpoint doesn't exist, return empty array
      return [];
    }
  },

  // Get questions (for admin)
  getQuestions: async () => {
    const response = await api.get('/questions');
    return response.data;
  },

  // Get feedback for sessions
  getSessionFeedback: async (sessionId) => {
    const response = await api.get(`/feedback/session/${sessionId}`);
    return response.data;
  },

  // Get interviewer's sessions with optional limit/status filters
  getInterviewerSessions: async (options = {}) => {
    const params = new URLSearchParams();
    params.append('role', 'interviewer');
    params.append('populate', 'intervieweeId'); // Request populated interviewee data
    if (options.limit) params.append('limit', options.limit);
    if (options.status) params.append('status', options.status);
    const response = await api.get(`/interview-sessions?${params.toString()}`);
    return response.data;
  },

  // Get interviewee's upcoming sessions
  getIntervieweeSessions: async (limit = null) => {
    const params = new URLSearchParams();
    params.append('role', 'interviewee');
    params.append('populate', 'interviewerId,requestId'); // Request populated interviewer and request data
    if (limit) params.append('limit', limit);
    const response = await api.get(`/interview-sessions?${params.toString()}`);
    return response.data;
  },

  // Get completed sessions for current user (both interviewer and interviewee)
  // Optional limit is applied client-side after sorting by endedAt/createdAt desc
  getCompletedSessions: async (limit = null) => {
    const params = new URLSearchParams();
    params.append('status', 'COMPLETED');
    // Don't specify role - backend will return sessions where user is either interviewer or interviewee
    const response = await api.get(`/interview-sessions?${params.toString()}`);
    const data = response.data || [];
    if (limit) {
      return data
        .slice()
        .sort((a, b) => new Date(b.endedAt || b.createdAt) - new Date(a.endedAt || a.createdAt))
        .slice(0, limit);
    }
    return data;
  },

  // Get interviewer's completed sessions (kept for backward compatibility)
  getInterviewerCompletedSessions: async () => {
    return dashboardService.getCompletedSessions();
  },

  // Submit feedback
  submitFeedback: async (payload) => {
    const response = await api.post('/feedback', payload);
    return response.data;
  },

  // Get session details by ID
  getSessionById: async (sessionId) => {
    const params = new URLSearchParams();
    params.append('populate', 'intervieweeId,requestId'); // Request populated data
    const response = await api.get(`/interview-sessions/${sessionId}?${params.toString()}`);
    return response.data;
  },

  // Start interview session (Interviewer only)
  startSession: async (sessionId) => {
    const response = await api.post(`/interview-sessions/${sessionId}/start`);
    return response.data;
  },

  // End interview session (Interviewer only)
  endSession: async (sessionId) => {
    const response = await api.post(`/interview-sessions/${sessionId}/end`);
    return response.data;
  },

  // Extend interview session (Interviewer only)
  extendSession: async (sessionId, extraMinutes = 15) => {
    const response = await api.post(`/interview-sessions/${sessionId}/extend`, {
      extraMinutes
    });
    return response.data;
  },

  // Mark interviewee as joined (Interviewee only)
  // Called when interviewee joins a LIVE session to set firstIntervieweeJoinedAt
  markIntervieweeJoined: async (sessionId) => {
    const response = await api.post(`/interview-sessions/${sessionId}/mark-interviewee-joined`);
    console.log("markIntervieweeJoined", response)
    return response.data;
  },
};