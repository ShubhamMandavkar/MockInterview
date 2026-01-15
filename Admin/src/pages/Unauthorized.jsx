import { useNavigate } from 'react-router-dom'
import './PageLayout.css'

const Unauthorized = () => {
  const navigate = useNavigate()

  const handleGoToLogin = () => {
    navigate('/login')
  }

  return (
    <div className="page-layout">
      <div className="page-content centered">
        <div className="unauthorized-content">
          <div className="error-icon">🚫</div>
          <h1>Access Denied</h1>
          <p>You don't have permission to access this admin dashboard.</p>
          <p>Only users with ADMIN role can access this area.</p>
          
          <div className="action-buttons">
            <button onClick={handleGoToLogin} className="login-button">
              Go to Login
            </button>
            <button onClick={() => window.history.back()} className="back-button">
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Unauthorized