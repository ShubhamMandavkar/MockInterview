import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import Navbar from '../components/Navbar';

const Home = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowDropdown(false);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setShowDropdown(false);
  };

  return (
    <div className="home-container">
      <Navbar></Navbar>
      <main className="home-main">
        <section className="hero-section">
          <h1 className="hero-title">
            Master Your Interview Skills with
            <span className="gradient-text"> Peer-to-Peer</span> Practice
          </h1>
          <p className="hero-subtitle">
            Connect with fellow developers, practice real interview scenarios, 
            and get valuable feedback to ace your next interview.
          </p>
          
          {!isAuthenticated && (
            <div className="hero-actions">
              <button 
                className="btn btn-primary btn-large"
                onClick={() => navigate('/login')}
              >
                Start Practicing
              </button>
              <button 
                className="btn btn-secondary btn-large"
                onClick={() => navigate('/login')}
              >
                Become an Interviewer
              </button>
            </div>
          )}

          {isAuthenticated && (
            <div className="welcome-section">
              <p className="welcome-text">
                Welcome back, <strong>{user?.name}</strong>!
              </p>
              <div className="hero-actions">
                <button 
                  className="btn btn-primary btn-large"
                  onClick={() => navigate('/create-interview')}
                >
                  Create Interview Request
                </button>
                <button 
                  className="btn btn-secondary btn-large"
                  onClick={() => navigate('/all-requests')}
                >
                  Browse Interviews
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="features-section">
          <h2 className="section-title">Why Choose MockInterview?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Real Practice</h3>
              <p>Practice with real interview questions from top tech companies</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Peer Learning</h3>
              <p>Learn from fellow developers and share your knowledge</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Instant Feedback</h3>
              <p>Get detailed feedback after each mock interview session</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Flexible Scheduling</h3>
              <p>Schedule interviews at your convenience</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <p>&copy; 2025 MockInterview. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;

