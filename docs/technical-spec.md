# Technical Specification

## Multi-Tenant SaaS Platform – Project & Task Management System

---

## 1. Overview

This document describes the technical implementation details, project structure, and development setup for the Multi-Tenant SaaS Platform. It provides clear guidance on how the backend, frontend, and database components are organized, configured, and run in both local and Dockerized environments.

---

## 2. Project Structure

The project follows a monorepo structure, with clearly separated backend, frontend, database, and documentation components.

### 2.1 Root Directory Structure

```
SAAS-Project-Task-Application/
 ├── backend/
 ├── frontend/
 ├── database/
 ├── docs/
 ├── docker-compose.yml
 ├── README.md
 ├── package-lock.json   
 └── submission.json
```

### 2.2 Backend Structure

```
backend/
├── src/
│   ├── config/             # Configuration files (e.g., Database connection)
│   ├── controllers/        # Business logic for API endpoints (Auth, User, Task, etc.)
│   ├── middleware/         # Request interceptors (e.g., AuthMiddleware)
│   ├── routes/             # Route definitions mapping URLs to Controllers
│   ├── utils/              # Helper functions (e.g., JWT Generator)
│   └── index.js            # Application entry point and server setup
│
├── .env                    # Environment variables
├── Dockerfile              # Docker image instructions for Backend
└── package.json            # Project dependencies and scripts
```

**Purpose**

- Ensures separation of concerns
- Improves maintainability
- Simplifies testing and scaling

### 2.3 Frontend Structure

```
frontend/
├── node_modules/           # Installed dependencies
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   ├── context/            # Global State (AuthContext)
│   ├── pages/              # Main application views (Dashboard, Login, Profile)
│   ├── utils/              # Utilities (Axios API instance)
│   ├── App.jsx             # Main Router component
│   ├── index.css           # Global styles (Tailwind directives)
│   └── main.jsx            # React entry point
│
├── .gitignore              # Git exclusion rules
├── Dockerfile              # Docker image instructions for Frontend
├── eslint.config.js        # Linter configuration
├── index.html              # HTML entry point
├── package-lock.json       # Project fixed dependencies 
├── package.json            # Project dependencies
├── postcss.config.js       # CSS processing config
├── tailwind.config.js      # Tailwind CSS theme config
└── vite.config.js          # Vite bundler configuration
```

**Purpose**

- Component-based UI design
- Centralized API handling
- Role-based UI rendering

### 2.4 Database Structure

```
database/
 ├── migrations/
 │   ├── 001_create_tenants.sql
 │   ├── 002_create_users.sql
 │   ├── 003_create_projects.sql
 │   ├── 004_create_tasks.sql
 │   └── 005_create_audit_logs.sql
 └── seeds/
     └── seed_data.sql
```

**Purpose**

- Controlled schema evolution
- Automatic database initialization
- Seed data for evaluation

---

## 3. Environment Configuration

### 3.1 Required Environment Variables

The backend reads configuration from environment variables.

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (These match the docker-compose settings below)
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=saas_db
DB_HOST=database
DB_PORT=5432

# JWT Secret (Used for passwords and tokens)
JWT_SECRET=super_secret_key_for_testing_only_12345
JWT_EXPIRES_IN=24h

# Frontend URL (For CORS permission)
FRONTEND_URL=http://frontend:3000
```

⚠️ **For evaluation, all environment variables must be present either in:**

- `.env` file (committed), or
- `docker-compose.yml`

---

## 4. Development Setup Guide

### 4.1 Prerequisites

- PostgreSQL
- Node.js v18+
- Docker & Docker Compose
- Git

### 4.2 Local Development (Without Docker)

1. Clone the repository
2. Navigate to backend folder
3. Install backend dependencies
4. Set environment variables
5. Run migrations
6. Seed database
7. Start backend server
8. Start frontend server

📌 **Note:** Local development is optional. Docker is the primary method.

### 4.3 # Installation & Running (Docker Method - Recommended)

This method sets up the Database, Backend, and Frontend automatically with seed data.

## Clone the repository:
```bash
git clone https://github.com/Ravindra-Reddy27/SAAS-Project-Task-Application.git
cd SAAS-Project-Task-Application
```

## Start the Application:

Run the following command in the root directory:
```bash
docker-compose up -d --build
```

* This builds the Backend and Frontend images.
* It starts the PostgreSQL database and runs `init.sh` to apply migrations and seeds.

## Access the Application:

* Frontend: Open http://localhost:3000 in your browser.
* Backend API: Running at http://localhost:5000.

## Verify Installation:

Check if the services are running and healthy:
```bash
docker-compose ps
```
---

## 5. Database Initialization Strategy

### Automatic Initialization (MANDATORY)

- Database migrations run automatically on backend startup
- Seed data loads automatically after migrations
- No manual commands are required

**Implementation options**

- Docker entrypoint script
- Backend startup script
- Init container (optional)

---

## 6. Health Check Implementation

The backend exposes a health check endpoint:

```
GET http://localhost:5000/api/health
```

**Response**

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-01-02T17:22:39.866Z"
}
```

This endpoint returns success only after:

- Database connection is established
- Migrations are completed
- Seed data is loaded

---

## 7. Inter-Service Communication

Services communicate using Docker service names:

- `frontend` → `backend` via `http://backend:5000`
- `backend` → `database` via `database:5432`
- `localhost` is never used inside containers

---

## 8. Security Best Practices

- Environment variables used for sensitive data
- No hardcoded secrets
- JWT token validation on all protected routes
- Password hashing with bcrypt
- Input validation on backend

---

## 9. Conclusion


This technical specification defines a clean, scalable, and Docker-ready implementation strategy for the Multi-Tenant SaaS Platform. The defined project structure and setup ensure maintainability, security, and smooth evaluation using automated scripts.
