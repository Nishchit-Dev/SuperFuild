# AISecure Backend - User Authentication

A Node.js backend with PostgreSQL database for user authentication and code scanning.

## Features

- User registration and login
- JWT token-based authentication
- Password hashing with bcrypt
- PostgreSQL database integration
- Protected routes middleware
- Code security scanning with AI

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup

#### Install PostgreSQL
- Download and install PostgreSQL from https://www.postgresql.org/download/
- Create a database named `AISecure_auth`
- Note your database credentials

#### Environment Variables
Create a `.env` file in the backend directory:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=AISecure_auth
DB_USER=postgres
DB_PASSWORD=your_password_here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=4000
```

#### Initialize Database
```bash
npm run init-db
```

### 3. Start the Server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/register`
Register a new user
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### POST `/api/auth/login`
Login user
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### GET `/api/auth/profile`
Get user profile (requires authentication)
Headers: `Authorization: Bearer <token>`

#### POST `/api/auth/logout`
Logout user (requires authentication)
Headers: `Authorization: Bearer <token>`

### Code Scanning Routes

#### POST `/scan`
Scan code for vulnerabilities
```json
{
  "code": "your code here",
  "filename": "example.js"
}
```

## Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `password_hash` - Hashed password
- `first_name` - User's first name
- `last_name` - User's last name
- `created_at` - Account creation timestamp
- `updated_at` - Last update timestamp

### User Sessions Table
- `id` - Primary key
- `user_id` - Foreign key to users table
- `token_hash` - JWT token hash
- `expires_at` - Token expiration timestamp
- `created_at` - Session creation timestamp

## Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT token authentication
- Token expiration management
- Input validation
- SQL injection prevention with parameterized queries
- CORS enabled for frontend integration

## Testing the API

You can test the API using tools like Postman or curl:

```bash
# Register a new user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get profile (replace TOKEN with actual token)
curl -X GET http://localhost:4000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"
```


