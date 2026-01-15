import { useAuth } from '../hooks/useAuth'
import './ProtectedRoute.css'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    )
  }

  // If not authenticated, useAuth hook will handle redirect
  if (!isAuthenticated) {
    return null
  }

  return children
}

export default ProtectedRoute