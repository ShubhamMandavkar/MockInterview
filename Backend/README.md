# Mock Interview Platform – Backend

A peer-to-peer mock interview platform backend built using the MERN stack.  
This backend manages authentication, interview scheduling, session lifecycle, question management, and feedback.  
Video/audio communication is intentionally handled on the frontend using WebRTC.

---

## 🚀 Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (ADMIN, INTERVIEWER, INTERVIEWEE)
- Secure middleware-enforced permissions

### Interview Requests
- Interviewees create interview requests
- Interviewers view and accept open requests
- Requests expire automatically using TTL indexes
- Self-accept prevention and expiry safety checks

### Interview Sessions
- Controlled lifecycle: `SCHEDULED → LIVE → COMPLETED`
- Only interviewer can start and end sessions
- Interviewee can join live sessions
- Network disconnects do not affect session state
- Auto-end safety using cron + hard timeout buffer
- Interview extension supported by interviewer

### Question Bank
- Admin-only question management
- Filterable by category, difficulty, and type
- Soft delete support for audit safety
- Hard delete restricted and guarded

### Feedback System
- Feedback allowed only after session completion
- One-time feedback per user per session
- Both interviewer and interviewee can submit feedback
- Secure access to session feedback

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- Socket.io (signaling – optional)
- node-cron (auto-end safety)

---

## 📁 Project Structure

src/
├── controllers/
│ ├── auth.controller.js
│ ├── user.controller.js
│ ├── interviewRequest.controller.js
│ ├── interviewSession.controller.js
│ ├── question.controller.js
│ └── feedback.controller.js
│
├── models/
│ ├── user.model.js
│ ├── interviewRequest.model.js
│ ├── interviewSession.model.js
│ ├── question.model.js
│ ├── sessionQuestion.model.js
│ └── feedback.model.js
│
├── routes/
│ ├── auth.routes.js
│ ├── user.routes.js
│ ├── interviewRequest.routes.js
│ ├── interviewSession.routes.js
│ ├── question.routes.js
│ └── feedback.routes.js
│
├── middlewares/
│ ├── auth.middleware.js
│ └── admin.middleware.js
│
├── cron/
│ └── endAbandonedSessions.js
│
├── utils/
│ └── generateToken.js
│
├── config/
│ └── db.js
│
└── server.js


---

## 🔐 Environment Variables

Create a `.env` file:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

REQUEST_EXPIRY_BUFFER_HOURS=5
SESSION_HARD_BUFFER_MINUTES=30
CRON_INTERVAL_MINUTES=5


---

## ▶️ Getting Started

### Install Dependencies
npm install


### Start Development Server
npm run server


Server runs at:
http://localhost:5000


---

## 📡 API Overview

### Authentication
| Method | Endpoint | Description |
|------|--------|------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get logged-in user |

---

### Interview Requests
| Method | Endpoint | Description |
|------|--------|------------|
| POST | /api/interview-requests | Create request |
| GET | /api/interview-requests/open | View open requests |
| GET | /api/interview-requests/mine | My requests |
| POST | /api/interview-requests/:id/accept | Accept request |

---

### Interview Sessions
| Method | Endpoint | Description |
|------|--------|------------|
| GET | /api/interview-sessions/:id | Join/view session |
| POST | /api/interview-sessions/:id/start | Start session (Interviewer) |
| POST | /api/interview-sessions/:id/extend | Extend session |
| POST | /api/interview-sessions/:id/end | End session (Interviewer) |

---

### Questions
| Method | Endpoint | Access |
|------|--------|-------|
| GET | /api/questions | All users |
| POST | /api/questions | Admin |
| PUT | /api/questions/:id | Admin |
| DELETE | /api/questions/:id | Admin (soft delete) |

---

### Feedback
| Method | Endpoint | Description |
|------|--------|------------|
| POST | /api/feedback | Submit feedback |
| GET | /api/feedback/session/:sessionId | View feedback |

---

## 🎥 Video & Audio Handling

- Video/audio is not handled by this backend
- WebRTC is implemented on the frontend
- Backend manages session authorization and signaling only

---

## 🧠 Design Decisions

- Soft delete instead of hard delete for audit safety
- Time-based auto-end instead of network-based termination
- No role stored in JWT (database is source of truth)
- Media-agnostic backend for scalability

---

## 🧪 Testing

- All endpoints tested using Postman
- Includes positive and negative test cases

---

## 📌 Future Enhancements

- WebRTC signaling via Socket.io
- AI-based mock interviewer
- Analytics dashboard
- Notifications and reminders

---

## 📝 Resume-Ready Summary

Built a scalable peer-to-peer mock interview platform backend with controlled session lifecycle, secure role-based access, time-safe scheduling, soft-delete audit integrity, and extensible real-time communication support.

---

## 📄 License

This project is licensed for educational and portfolio use.
