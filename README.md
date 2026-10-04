# HabitStreak

A modern, lightweight Habit Tracker SaaS designed to help users build consistency, log daily check-ins, and visualize their progress. Built with a Node.js/Express backend, a secure JWT-based authentication system, and a responsive Vanilla JavaScript Single Page Application (SPA) frontend.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-blue.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Database: MongoDB](https://img.shields.io/badge/Database-MongoDB-green.svg)](https://www.mongodb.com)
[![Deployment: Vercel](https://img.shields.io/badge/Deployment-Vercel-black.svg)](https://vercel.com)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Frontend Architecture](#frontend-architecture)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Secure JWT Authentication**: Implements double-token rotation (short-lived access tokens in memory, long-lived refresh tokens) with password hashing via `bcryptjs`.
- **Streak Engine**: Real-time calculation of current and historical completion streaks.
- **Zero-Config Local Setup**: Automatically boots up an in-memory MongoDB instance (`mongodb-memory-server`) if no external database connection string is provided.
- **Responsive SPA Frontend**: Desktop- and mobile-friendly UI featuring client-side routing, custom toast notifications, and dynamic icon rendering via Lucide Icons.
- **Serverless Ready**: Fully optimized for deployment on Vercel with automated connection pooling and serverless function wrappers.

---

## Tech Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database ORM**: Mongoose (MongoDB)
- **Security**: JSON Web Tokens (`jsonwebtoken`), Password Hashing (`bcryptjs`), CORS, Cookie Parser
- **Development**: `mongodb-memory-server` (for zero-config local testing)

### Frontend
- **Architecture**: Vanilla JavaScript Single Page Application (SPA)
- **Styling**: Custom Responsive CSS3 (Flexbox, Grid, CSS Variables)
- **Icons**: Lucide Icons

---

## Project Architecture

### Directory Structure

```
├── .gitignore
├── README.md
├── api/
│   └── index.js              # Vercel serverless entry point
├── package.json
├── public/                   # Static Frontend Assets
│   ├── css/
│   │   └── style.css         # Global styles & responsive design
│   ├── favicon.svg
│   ├── index.html            # Single Page Application Shell
│   └── js/
│       ├── api.js            # Central API client & fetch wrapper
│       ├── app.js            # SPA Router, toast notifications, & init
│       ├── auth.js           # Auth forms & token management
│       ├── dashboard.js      # Habit list & creation controller
│       └── habitDetail.js    # Detailed habit view & check-in logs
├── server/                   # Express Backend
│   ├── controllers/          # Request handlers
│   │   ├── authController.js
│   │   ├── checkinController.js
│   │   └── habitController.js
│   ├── middleware/           # Route guards
│   │   └── auth.js           # JWT verification middleware
│   ├── models/               # Mongoose Schemas
│   │   ├── CheckIn.js
│   │   ├── Habit.js
│   │   └── User.js
│   ├── routes/               # Express Router definitions
│   │   ├── auth.js
│   │   └── habits.js
│   └── server.js             # Main server setup & DB connection logic
└── vercel.json               # Vercel deployment configuration
```

### Data Flow Overview

```
[ Client Browser ] 
       │
       ▼ (Fetch API Requests with JWT Bearer Token)
[ Express Router ] ──(Auth Middleware)──► [ Controllers ]
                                               │
                                               ▼ (Mongoose Queries)
                                        [ MongoDB / Atlas ]
```

---

## Prerequisites

- **Node.js**: `v18.x` or higher
- **MongoDB** (Optional): A local MongoDB instance or a MongoDB Atlas connection URI. If omitted, the application automatically runs using an in-memory database (`mongodb-memory-server`).

---

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/imaakarsh/HabitStreak.git
   cd HabitStreak
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

## Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000

# Security (Generate strong random strings for production)
JWT_SECRET=your_super_secret_access_token_key_123!
JWT_REFRESH_SECRET=your_super_secret_refresh_token_key_456!

# Database Configuration
# Leave empty to automatically use the in-memory MongoDB server (great for testing!)
MONGODB_URI=mongodb://localhost:27017/habitstreak
```

---

## Usage

### Development Mode

Start the server with hot-reloading:

```bash
npm run dev
```

### Production Mode

Start the production server:

```bash
npm start
```

Once started, open your browser and navigate to `http://localhost:3000`.

---

## API Documentation

All API endpoints are prefixed with `/api`.

### Authentication Endpoints

#### 1. Register a New User
- **Endpoint**: `POST /api/auth/signup`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "message": "Account created successfully.",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5...",
    "user": {
      "id": "64b9f2...",
      "email": "user@example.com"
    }
  }
  ```

#### 2. User Login
- **Endpoint**: `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "message": "Logged in successfully.",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5...",
    "user": {
      "id": "64b9f2...",
      "email": "user@example.com"
    }
  }
  ```

#### 3. Refresh Access Token
- **Endpoint**: `POST /api/auth/refresh`
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
  ```

---

### Habits & Check-Ins Endpoints

*All requests below require an `Authorization: Bearer <accessToken>` header.*

#### 1. Create a Habit
- **Endpoint**: `POST /api/habits`
- **Request Body**:
  ```json
  {
    "title": "Read 10 Pages",
    "description": "Read a non-fiction book every morning",
    "frequency": "daily"
  }
  ```

#### 2. Get All Habits
- **Endpoint**: `GET /api/habits`
- **Success Response (200 OK)**:
  ```json
  [
    {
      "_id": "64b9f5...",
      "title": "Read 10 Pages",
      "description": "Read a non-fiction book every morning",
      "frequency": "daily",
      "streak": 3,
      "createdAt": "2023-07-21T08:00:00.000Z"
    }
  ]
  ```

#### 3. Log a Check-In
- **Endpoint**: `POST /api/habits/:id/checkin`
- **Request Body**:
  ```json
  {
    "date": "2023-10-24"
  }
  ```

---

## Frontend Architecture

The frontend is structured as a Single Page Application (SPA) inside the `public/` directory:

- **`app.js` (Router & Orchestrator)**: Manages active views (`home`, `auth`, `dashboard`, `detail`) by toggling CSS classes (`page--active`). Handles session restoration and global UI states.
- **`api.js` (HTTP Client)**: Wraps the native `fetch` API. Automatically appends JWT tokens to outgoing requests and handles token expiration by requesting a new access token via `/api/auth/refresh` before retrying the original request.
- **`auth.js`**: Handles login, registration, and token storage in `localStorage`.
- **`dashboard.js` & `habitDetail.js`**: Render dynamic HTML elements, process user actions, and trigger API calls to update habits and check-ins.

---

## Deployment

### Local Production Build

To run the application in a production-like environment locally:

1. Ensure your `.env` file contains production-grade secrets.
2. Run the production start script:
   ```bash
   npm start
   ```

### Vercel Serverless Deployment

This project is configured for deployment on Vercel using Serverless Functions.

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Deploy to Vercel:
   ```bash
   vercel
   ```
3. Add your environment variables (`MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`) in your Vercel Project Dashboard.

#### How Vercel Deployment Works
- `vercel.json` routes all `/api/*` traffic to `api/index.js`.
- `api/index.js` exports the Express `app` instance from `server/server.js`.
- Database connection logic in `server/server.js` detects the Vercel environment (`process.env.VERCEL`) and uses connection-pooling middleware to prevent connection exhaustion across serverless invocations.

---

## Troubleshooting

### "Could not connect to MongoDB — Starting in-memory MongoDB..."
If no `MONGODB_URI` is provided in `.env`, the server automatically initializes an in-memory database. Data stored in the in-memory database resets whenever the server restarts. To persist data across restarts, connect to a real MongoDB instance.

### "JWT secrets are not configured on the server"
Ensure a `.env` file exists in the root directory and contains defined values for both `JWT_SECRET` and `JWT_REFRESH_SECRET`.

### CORS Errors in Development
The Express backend enables CORS via the `cors` package. If running the frontend on a different port than the backend, verify that frontend API requests point to the backend port (default: `3000`).

---

## Contributing

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.