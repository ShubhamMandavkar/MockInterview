import api from './api'

export const questionService = {
  // Get question statistics
  getQuestionStats: async () => {
    try {
      // Get active questions
      const activeQuestionsResponse = await api.get('/questions?limit=1000')
      const activeQuestions = activeQuestionsResponse.data
      
      // Get deleted questions
      const deletedQuestionsResponse = await api.get('/questions?includeDeleted=true&limit=1000')
      const allQuestions = deletedQuestionsResponse.data
      const deletedQuestions = allQuestions.filter(q => q.isDeleted)
      
      return {
        total: allQuestions.length,
        active: activeQuestions.length,
        deleted: deletedQuestions.length
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch question statistics')
    }
  },

  // Get questions with filters (supports deleted questions for admin)
  getQuestions: async (filters = {}) => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, value)
      })
      
      const response = await api.get(`/questions?${params.toString()}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch questions')
    }
  },

  // Get all questions including deleted ones (admin only)
  getAllQuestions: async (filters = {}) => {
    try {
      const params = new URLSearchParams()
      params.append('includeDeleted', 'true')
      params.append('limit', '1000')
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && key !== 'includeDeleted') {
          params.append(key, value)
        }
      })
      
      try {
        const response = await api.get(`/questions?${params.toString()}`)
        return response.data
      } catch (error) {
        // If includeDeleted parameter is not supported, fall back to regular endpoint
        if (error.response?.status === 400) {
          const fallbackParams = new URLSearchParams()
          fallbackParams.append('limit', '1000')
          
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== '' && key !== 'includeDeleted') {
              fallbackParams.append(key, value)
            }
          })
          
          const fallbackResponse = await api.get(`/questions?${fallbackParams.toString()}`)
          return fallbackResponse.data
        }
        throw error
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch all questions')
    }
  },

  // Restore a soft-deleted question
  restoreQuestion: async (id) => {
    try {
      // Try the restore endpoint first
      const response = await api.patch(`/questions/${id}/restore`)
      return response.data
    } catch (error) {
      // If restore endpoint doesn't exist, try updating the question directly
      if (error.response?.status === 404) {
        try {
          const response = await api.put(`/questions/${id}`, {
            isDeleted: false,
            deletedAt: null
          })
          return response.data
        } catch (updateError) {
          throw new Error(updateError.response?.data?.message || 'Failed to restore question')
        }
      }
      throw new Error(error.response?.data?.message || 'Failed to restore question')
    }
  },

  // Add new question
  addQuestion: async (questionData) => {
    try {
      const response = await api.post('/questions/add', questionData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add question')
    }
  },

  // Update question
  updateQuestion: async (id, questionData) => {
    try {
      const response = await api.put(`/questions/${id}`, questionData)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update question')
    }
  },

  // Soft delete question
  softDeleteQuestion: async (id) => {
    try {
      const response = await api.delete(`/questions/${id}`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete question')
    }
  },

  // Hard delete question
  hardDeleteQuestion: async (id) => {
    try {
      const response = await api.delete(`/questions/${id}/hard`)
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to permanently delete question')
    }
  }
}