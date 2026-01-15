import './StatCard.css'

const StatCard = ({ title, value, loading = false, error = null }) => {
  if (loading) {
    return (
      <div className="stat-card loading">
        <div className="stat-card-content">
          <h3>{title}</h3>
          <div className="stat-value">
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="stat-card error">
        <div className="stat-card-content">
          <h3>{title}</h3>
          <div className="stat-value error-text">
            Error
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="stat-card">
      <div className="stat-card-content">
        <h3>{title}</h3>
        <div className="stat-value">
          {value}
        </div>
      </div>
    </div>
  )
}

export default StatCard