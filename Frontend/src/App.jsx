import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import CreateInterviewRequest from './pages/CreateInterviewRequest';
import AllInterviewRequests from './pages/AllInterviewRequests';
import AllOpenInterviewRequests from './pages/AllOpenInterviewRequests';
import InterviewerUpcomingSessions from './pages/InterviewerUpcomingSessions';
import ViewSessionPage from './pages/ViewSessionPage';
import AllUpcomingSessions from './pages/AllUpcomingSessions';
import CompletedSessions from './pages/CompletedSessions';
import FeedbackSubmissionPage from './pages/FeedbackSubmissionPage';
import FeedbackViewPage from './pages/FeedbackViewPage';
import InterviewRoom from './pages/InterviewRoom';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirects to home if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Routes without layout (Home and Login) */}
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Routes with layout (all other pages) */}
      <Route element={<AppLayout />}>
        <Route
          path="/interview/:sessionId"
          element={
            <ProtectedRoute>
              <InterviewRoom />
            </ProtectedRoute>
          } />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-interview"
          element={
            <ProtectedRoute>
              <CreateInterviewRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/all-requests"
          element={
            <ProtectedRoute>
              <AllInterviewRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/open-requests"
          element={
            <ProtectedRoute>
              <AllOpenInterviewRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interviewer/upcoming-sessions"
          element={
            <ProtectedRoute>
              <InterviewerUpcomingSessions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upcoming-sessions"
          element={
            <ProtectedRoute>
              <AllUpcomingSessions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/completed-sessions"
          element={
            <ProtectedRoute>
              <CompletedSessions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback/:sessionId"
          element={
            <ProtectedRoute>
              <FeedbackSubmissionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback/view/:sessionId"
          element={
            <ProtectedRoute>
              <FeedbackViewPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Full-focus routes without navbar */}
      <Route
        path="/sessions/:sessionId"
        element={
          <ProtectedRoute>
            <ViewSessionPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
