import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './AdminNavbar.css'

const AdminNavbar = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  return (
    <nav className="admin-navbar">
      <div className="navbar-content">
        <div className="navbar-logo" onClick={() => navigate('/dashboard')}>
          Admin Panel
        </div>
        
        <div className="navbar-menu">
          <button 
            className="nav-btn"
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>
          
          <button 
            className="nav-btn"
            onClick={() => navigate('/questions/add')}
          >
            Add Question
          </button>
          
          <button 
            className="nav-btn"
            onClick={() => navigate('/questions/manage')}
          >
            Manage Questions
          </button>
          
          {user && (
            <div className="user-section">
              <span className="user-name">{user.name}</span>
              <button 
                className="logout-btn"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default AdminNavbar