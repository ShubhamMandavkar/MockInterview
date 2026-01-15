import './StatCard.css';

const StatCard = ({ title, value, icon, color = 'blue' }) => {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-card-content">
        <div className="stat-card-icon">{icon}</div>
        <div className="stat-card-info">
          <div className="stat-card-value">{value}</div>
          <div className="stat-card-title">{title}</div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;

