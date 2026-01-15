# Admin Dashboard - Mock Interview Platform

A clean and minimal admin dashboard for managing the interview question bank with secure authentication.

## Features

### Authentication System
- **Secure Login**: Email/password authentication using backend API
- **JWT Token Management**: Automatic token handling with Axios interceptors
- **Role-based Access**: Only users with ADMIN role can access the dashboard
- **Auto-logout**: Invalid/expired tokens trigger automatic logout
- **Demo Mode**: Development demo login for testing

### Question Statistics
- **Total Questions**: Shows the complete count of questions in the system
- **Active Questions**: Displays currently available questions (isDeleted = false)
- **Deleted Questions**: Shows soft-deleted questions (isDeleted = true)

### Quick Actions
- **Add New Question**: Navigate to question creation page
- **Manage Question Bank**: Navigate to question management interface

## Access Control

- **Admin Only**: Only users with ADMIN role can access this dashboard
- **Authentication**: Uses JWT token-based authentication with backend validation
- **Protected Routes**: All admin routes require authentication
- **Unauthorized Access**: Non-admin users are redirected to unauthorized page

## Authentication Flow

1. **Login Page** (`/login`): Email/password form with validation
2. **Token Verification**: Backend validates credentials and returns JWT
3. **Role Check**: System verifies user has ADMIN role
4. **Dashboard Access**: Successful admin login redirects to dashboard
5. **Auto-logout**: Invalid tokens or role changes trigger logout


### Components
- `Login`: Secure login form with validation and error handling
- `ProtectedRoute`: HOC that wraps protected pages with auth checks
- `AdminDashboard`: Main dashboard page with stats and actions
- `StatCard`: Reusable component for displaying statistics
- `useAuth`: Custom hook for authentication state management

### Services
- `authService`: Handles login, logout, and user verification
- `questionService`: Manages question-related API calls
- `api`: Axios instance with JWT interceptor

### API Integration
- Uses backend `/api/auth/login` endpoint for authentication
- Uses `/api/auth/me` endpoint for user verification
- Automatic JWT token management
- Handles loading states and error scenarios

### Routing
- `/login` - Admin login page
- `/dashboard` - Main admin dashboard (protected)
- `/questions/add` - Add new question (protected)
- `/questions/manage` - Manage questions (protected)
- `/unauthorized` - Access denied page

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file in the Admin directory:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Authentication Options

### Production Login
Use valid admin credentials:
- Email: admin@example.com
- Password: your-admin-password
