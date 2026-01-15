# Frontend Setup Guide

## Prerequisites

- Node.js installed
- Backend server running on port 5000

## Installation

1. Install dependencies:
```bash
npm install
```

## Environment Variables

Create a `.env` file in the Frontend directory with the following variables:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api

# Google OAuth Configuration
# Get your Client ID from: https://console.cloud.google.com/apis/credentials
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized JavaScript origins:
   - `http://localhost:5173` (Vite default)
   - `http://localhost:3000` (if using different port)
7. Add authorized redirect URIs:
   - `http://localhost:5173` (Vite default)
   - `http://localhost:3000` (if using different port)
8. Copy the Client ID and add it to your `.env` file

## Running the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in the terminal).

## Features Implemented

- ✅ Home page with modern UI
- ✅ Login/Authentication page
- ✅ Google OAuth integration
- ✅ Email/Password authentication
- ✅ Protected routes
- ✅ Auth context for state management
- ✅ API service with interceptors

## Next Steps

- Create interview request page
- Browse interviews page
- Profile page
- Interview session page

