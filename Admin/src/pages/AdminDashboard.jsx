import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard'
import AdminNavbar from '../components/AdminNavbar'
import { questionService } from '../services/questionService'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    deleted: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchQuestionStats()
  }, [])

  const fetchQuestionStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const statsData = await questionService.getQuestionStats()
      setStats(statsData)
    } catch (err) {
      setError(err.message)
      console.error('Failed to fetch question stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddQuestion = () => {
    navigate('/questions/add')
  }

  const handleManageQuestions = () => {
    navigate('/questions/manage')
  }

  return (
    <>
      <AdminNavbar />
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <div className="header-content">
            <div>
              <h1>Admin Dashboard</h1>
              <p>Manage your interview question bank</p>
            </div>
          </div>
        </div>

        {/* Section A: Question Statistics */}
        <section className="question-stats-section">
          <h2>Question Statistics</h2>
          <div className="stats-grid">
            <StatCard
              title="Total Questions"
              value={stats.total}
              loading={loading}
              error={error}
            />
            <StatCard
              title="Active Questions"
              value={stats.active}
              loading={loading}
              error={error}
            />
            <StatCard
              title="Deleted Questions"
              value={stats.deleted}
              loading={loading}
              error={error}
            />
          </div>
          {error && (
            <div className="error-message">
              <p>Failed to load statistics: {error}</p>
              <button onClick={fetchQuestionStats} className="retry-button">
                Retry
              </button>
            </div>
          )}
        </section>

        {/* Section B: Quick Actions */}
        <section className="quick-actions-section">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button 
              className="action-button primary"
              onClick={handleAddQuestion}
            >
              <div className="button-icon">+</div>
              <div className="button-content">
                <h3>Add New Question</h3>
                <p>Create a new interview question</p>
              </div>
            </button>
            
            <button 
              className="action-button secondary"
              onClick={handleManageQuestions}
            >
              <div className="button-icon">📋</div>
              <div className="button-content">
                <h3>Manage Question Bank</h3>
                <p>View and edit existing questions</p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </>
  )
}

export default AdminDashboard