import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef(null);

  const isInterviewee = user?.roles?.includes('INTERVIEWEE');
  const isInterviewer = user?.roles?.includes('INTERVIEWER');
  const isAdmin = user?.roles?.includes('ADMIN');

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
    setShowMobileMenu(false);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setShowDropdown(false);
    setShowMobileMenu(false);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setShowMobileMenu(false);
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const getNavLinks = () => {
    if (!isAuthenticated) {
      return [];
    }

    // Keep navbar minimal - only show Dashboard link
    const links = [
      { path: '/dashboard', label: 'Dashboard', roles: ['INTERVIEWEE', 'INTERVIEWER', 'ADMIN'] }
    ];

    return links.filter(link => 
      link.roles.some(role => user?.roles?.includes(role))
    );
  };

  const navLinks = getNavLinks();

  return (
    <header className="navbar">
      <div className="navbar-content">
        <h1 className="navbar-logo" onClick={() => navigate('/')}>
          MockInterview
        </h1>
        
        {/* Desktop Navigation */}
        <nav className="navbar-menu desktop-nav">
          {isAuthenticated ? (
            <>
              {navLinks.map((link) => (
                <button
                  key={link.path}
                  className={`nav-btn ${isActivePath(link.path) ? 'active' : ''}`}
                  onClick={() => handleNavigation(link.path)}
                >
                  {link.label}
                </button>
              ))}
              
              {/* Simple primary CTA - Create Interview for all authenticated users */}
              <button 
                className="nav-btn primary"
                onClick={() => handleNavigation('/create-interview')}
              >
                Create Interview
              </button>
              
              <div 
                className={`user-dropdown ${showDropdown ? 'active' : ''}`}
                ref={dropdownRef}
              >
                <span 
                  className="user-name"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  {user?.name || 'User'}
                  <span className="dropdown-arrow">▼</span>
                </span>
                {showDropdown && (
                  <div className="dropdown-menu">
                    <button 
                      className="dropdown-item"
                      onClick={handleProfileClick}
                    >
                      Profile
                    </button>
                    <button 
                      className="dropdown-item"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button 
              className="nav-btn primary"
              onClick={() => handleNavigation('/login')}
            >
              Get Started
            </button>
          )}
        </nav>

        {/* Mobile Menu Toggle */}
        {isAuthenticated && (
          <button 
            className="mobile-menu-toggle"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            aria-label="Toggle mobile menu"
          >
            <span className={`hamburger ${showMobileMenu ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        )}

        {/* Mobile Navigation */}
        <nav className={`navbar-menu mobile-nav ${showMobileMenu ? 'active' : ''}`}>
          {isAuthenticated ? (
            <>
              {navLinks.map((link) => (
                <button
                  key={link.path}
                  className={`nav-btn mobile-nav-btn ${isActivePath(link.path) ? 'active' : ''}`}
                  onClick={() => handleNavigation(link.path)}
                >
                  {link.label}
                </button>
              ))}
              
              <button 
                className="nav-btn mobile-nav-btn"
                onClick={handleProfileClick}
              >
                Profile
              </button>
              <button 
                className="nav-btn mobile-nav-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <button 
              className="nav-btn primary mobile-nav-btn"
              onClick={() => handleNavigation('/login')}
            >
              Get Started
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;