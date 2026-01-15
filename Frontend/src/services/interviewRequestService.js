import api from './api';

export const interviewRequestService = {
  // Accept an interview request
  acceptRequest: async (requestId) => {
    const response = await api.post(`/interview-requests/${requestId}/accept`);
    return response.data;
  },

  // Delete an interview request (if backend supports it)
  deleteRequest: async (requestId) => {
    const response = await api.delete(`/interview-requests/${requestId}`);
    return response.data;
  },

  // Update an interview request (if backend supports it)
  updateRequest: async (requestId, data) => {
    const response = await api.put(`/interview-requests/${requestId}`, data);
    return response.data;
  },

  // Get a single interview request by ID
  getRequestById: async (requestId) => {
    const response = await api.get(`/interview-requests/${requestId}`);
    return response.data;
  },
};