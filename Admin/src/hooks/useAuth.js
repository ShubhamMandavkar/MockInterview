import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = authService.getToken()
      
      if (!token) {
        setIsAuthenticated(false)
        setIsLoading(false)
        navigate('/login')
        return
      }

      // Verify token and get user details
      const userDetails = await authService.getMe()
      
      // Check if user has admin role
      if (!userDetails.roles || !userDetails.roles.includes('ADMIN')) {
        authService.logout()
        setIsAuthenticated(false)
        setUser(null)
        setIsLoading(false)
        navigate('/unauthorized')
        return
      }

      setUser(userDetails)
      setIsAuthenticated(true)
      setIsLoading(false)
    } catch (error) {
      // Token is invalid or expired
      authService.logout()
      setIsAuthenticated(false)
      setUser(null)
      setIsLoading(false)
      navigate('/login')
    }
  }

  const logout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setUser(null)
    navigate('/login')
  }

  return {
    isAuthenticated,
    isLoading,
    user,
    logout,
    checkAuthStatus
  }
}