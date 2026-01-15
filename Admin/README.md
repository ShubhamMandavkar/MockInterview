# Admin Dashboard - Mock Interview Platform

A clean and minimal admin dashboard for managing the interview question bank with secure authentication.

## Features

### Design System Consistency
- **Unified Theme**: Matches your core application's design language
- **Color Palette**: Uses your existing blue-based color scheme
- **Typography**: Consistent font family and text hierarchy
- **Component Library**: Reusable components with consistent styling
- **Responsive Design**: Mobile-first approach with breakpoints
- **Accessibility**: Proper focus states and keyboard navigation

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

## Design System

The admin dashboard now uses a **consistent design system** that matches your core application:

### Color Palette
- **Primary Blue**: `#2563eb` (blue-600) - Main brand color
- **Light Blue**: `#eff6ff` (blue-50) - Background accents
- **Text Colors**: `#1e293b` (slate-800), `#64748b` (slate-500)
- **Background**: `#ffffff` (white) - Clean, professional
- **Borders**: `#e0e7ff` (blue-100) - Subtle boundaries
- **Success**: `#059669` (emerald-600)
- **Error**: `#dc2626` (red-600)

### Typography
- **Font Family**: `system-ui, Avenir, Helvetica, Arial, sans-serif`
- **Headings**: Bold weights (600-700) with proper hierarchy
- **Body Text**: Regular weight (400-500) with good readability

### Components
- **Cards**: 12px border radius, subtle shadows, hover effects
- **Buttons**: 8px border radius, smooth transitions, hover states
- **Forms**: Clean inputs with focus states and validation
- **Navigation**: Sticky navbar with smooth interactions

### Interactive Elements
- **Hover Effects**: `translateY(-2px)` with enhanced shadows
- **Focus States**: Blue outline with proper accessibility
- **Transitions**: Smooth 0.3s ease animations
- **Loading States**: Consistent spinners and skeleton states

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

### Demo Login (Development Only)
Click "Demo Admin Login" button to simulate admin access without backend validation.

## Security Features

- **JWT Token Storage**: Secure token management in localStorage
- **Automatic Token Refresh**: Handles token expiration gracefully
- **Role Validation**: Server-side role verification
- **Protected Routes**: Client-side route protection
- **CORS Handling**: Proper cross-origin request configuration

## Next Steps

The following features are implemented and ready to use:

### ✅ Add Question Form (COMPLETED)
- **Complete Form**: All required fields with validation
- **Dynamic Placeholders**: Context-aware examples based on question type
- **Real-time Preview**: Live preview of how the question will appear
- **Character Limits**: Visual feedback for text length limits
- **Form Validation**: Client-side validation with clear error messages
- **Success Handling**: Automatic redirect after successful submission

### ✅ Complete Question Management System (COMPLETED)
- **Full CRUD Operations**: Create, Read, Update, Delete questions
- **Dual Delete Options**: Choose between soft delete (recoverable) or permanent delete upfront
- **Soft Delete Support**: View and restore soft-deleted questions
- **Advanced Search**: Real-time search across question text, category, and topic
- **Multi-Filter System**: Filter by category, difficulty, type simultaneously
- **Deleted Questions Toggle**: Show/hide deleted questions with checkbox filter
- **Restore Functionality**: Restore soft-deleted questions back to active status
- **Delete Options Dropdown**: Choose soft delete or permanent delete for active questions
- **Visual Distinction**: Clear visual indicators for deleted vs active questions
- **Audit Trail**: Display creation, update, and deletion timestamps
- **Pagination**: Efficient pagination for large question sets
- **Edit Protection**: Prevent editing of deleted questions (restore first)
- **Responsive Design**: Mobile-friendly interface with adaptive layouts
- **Real-time Updates**: Immediate UI updates after operations

### 🔄 Next Development Phase
2. **User Management**: Admin interface for managing user accounts and roles
3. **Bulk Operations**: Import/export questions, bulk editing capabilities