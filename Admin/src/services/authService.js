import api from './api'

export const authService = {
  // Login with email and password
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      })
      
      const { token, message } = response.data
      
      if (token) {
        localStorage.setItem('adminToken', token)
      }
      
      return { token, message }
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  },

  // Get current user details
  getMe: async () => {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get user details')
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('adminToken')
  },

  // Check if user is logged in
  isAuthenticated: () => {
    return !!localStorage.getItem('adminToken')
  },

  // Get stored token
  getToken: () => {
    return localStorage.getItem('adminToken')
  }
}