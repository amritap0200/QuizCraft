QuizCraft - Quiz Application
A full-stack MERN application for creating and taking quizzes with real-time features.

Project Structure
text
QuizCraft/
├── backend/          # Node.js + Express API server
│   ├── models/       # MongoDB schemas (User, Quiz, QuizAttempt)
│   ├── routes/       # API endpoints (auth, quizzes, users)
│   ├── middleware/   # JWT authentication
│   ├── server.js     # Main server file
│   └── package.json  # Backend dependencies
├── frontend/         # React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Main application pages
│   │   ├── context/     # React Context (Auth, Theme)
│   │   └── App.js       # Main React component
│   └── package.json     # Frontend dependencies
└── README.md           # This file

Features
User registration and authentication (JWT)

Create quizzes with multiple questions and options

Take quizzes with timer and progress tracking

View quiz results and statistics

User profile with performance analytics

Dark/light theme support

Search and filter quizzes by category

Leaderboard system

Technologies Used
Frontend: React, Context API, Axios, React Router
Backend: Node.js, Express, MongoDB, Mongoose, JWT, Socket.io
Database: MongoDB
Authentication: JSON Web Tokens (JWT)

Setup Instructions
1. Backend Setup
bash
cd backend
npm install
Create a .env file in the backend folder:

text
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
CLIENT_URL=http://localhost:3000
Start the backend server:

bash
npm run dev
2. Frontend Setup
bash
cd frontend
npm install
Start the frontend development server:

bash
npm start
The application will be available at:

Frontend: http://localhost:3000

Backend API: http://localhost:5000

API Endpoints
Authentication
POST /api/auth/register - Register new user

POST /api/auth/login - Login user

GET /api/auth/me - Get current user

Quizzes
GET /api/quizzes - Get all quizzes

GET /api/quizzes/:id - Get single quiz

POST /api/quizzes - Create new quiz

DELETE /api/quizzes/:id - Delete quiz

POST /api/quizzes/:id/attempt - Start quiz attempt

POST /api/quizzes/:id/answer - Submit answer

POST /api/quizzes/:id/complete - Complete attempt

Users
GET /api/users/profile - Get user profile

GET /api/users/attempts - Get user attempts

GET /api/users/leaderboard - Get leaderboard

Database Models
User: Stores user information, credentials, and profile stats

Quiz: Stores quiz data including questions, options, and settings

QuizAttempt: Tracks user quiz attempts, answers, and scores

Key Features Implementation
Authentication Flow
JWT tokens stored in localStorage

Protected routes using authentication middleware

Password hashing with bcrypt

Quiz System
Dynamic quiz creation with unlimited questions

Real-time timer for quiz attempts

Score calculation and statistics tracking

Public/private quiz visibility

User Experience
Responsive design for mobile and desktop

Progress tracking during quiz taking

Performance analytics in user profile

Search and filter functionality

Development Notes
The backend uses Mongoose for MongoDB operations

Frontend uses React Context for state management

Real-time features implemented with Socket.io

CORS enabled for cross-origin requests

Environment variables for configuration

Troubleshooting
MongoDB Connection Error: Ensure MongoDB is running and connection string is correct

JWT Authentication Error: Check JWT secret in .env file

CORS Errors: Verify CLIENT_URL in backend .env file

Port Conflicts: Change PORT in .env if 5000 is already in use

License
MIT License

Contact
For questions or issues, please create an issue in the repository.
