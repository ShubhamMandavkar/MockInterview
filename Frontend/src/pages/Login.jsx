import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await authService.login(email, password);
      } else {
        if (!name) {
          setError('Name is required for registration');
          setLoading(false);
          return;
        }
        response = await authService.register(name, email, password);
      }

      // Fetch user data and update context
      const userData = await authService.getMe();
      login(userData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const response = await authService.googleLogin(credentialResponse.credential);
      
      // Fetch user data and update context
      const userData = await authService.getMe();
      login(userData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Google authentication failed. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google authentication failed. Please try again.');
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">MockInterview</h1>
          <p className="login-subtitle">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {googleClientId && (
          <div className="google-auth-section">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="outline"
              size="large"
              text={isLogin ? 'signin_with' : 'signup_with'}
              shape="rectangular"
            />
            <div className="divider">
              <span>OR</span>
            </div>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button 
              type="button"
              className="switch-btn"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>

        {!googleClientId && (
          <div className="google-warning">
            <p>⚠️ Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

