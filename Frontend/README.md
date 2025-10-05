# AISecure Frontend - AI Code Security Scanner

A modern React/Next.js frontend application with user authentication and AI-powered code security scanning.

## Features

- 🔐 **User Authentication** - Register, login, and logout with JWT tokens
- 🎨 **Modern UI** - Built with shadcn/ui components and Tailwind CSS
- 🔒 **Protected Routes** - Secure access to authenticated features
- 🤖 **AI Code Scanning** - Integrate with Gemini AI for security analysis
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern component library
- **React Context** - State management for authentication
- **Axios** - HTTP client for API calls

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the frontend directory:
```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
src/
├── app/
│   ├── api/scan/          # API route for code scanning
│   ├── auth/              # Authentication pages
│   ├── components/        # App-specific components
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout with AuthProvider
│   ├── page.tsx           # Main scanner page
│   └── App.tsx            # Main app component
├── components/
│   ├── auth/              # Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ProtectedRoute.tsx
│   └── ui/                # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── contexts/
│   └── AuthContext.tsx    # Authentication context
└── lib/
    ├── ai.ts              # Gemini AI integration
    ├── api.ts             # API service layer
    └── utils.ts           # Utility functions
```

## Authentication Flow

1. **Unauthenticated users** see the login/register form
2. **Registration** creates a new user account
3. **Login** authenticates users and stores JWT token
4. **Protected routes** require authentication
5. **Logout** clears the token and redirects to login

## API Integration

The frontend connects to the backend API at `http://localhost:4000`:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - User logout
- `POST /scan` - Code security scanning

## Components

### Authentication Components
- **LoginForm** - User login with email/password
- **RegisterForm** - User registration with validation
- **ProtectedRoute** - Wrapper for authenticated pages

### UI Components
- **Button** - Styled button component
- **Card** - Container component with header/content/footer
- **Input** - Form input component

## Styling

The application uses:
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for consistent component design
- **CSS Variables** for theming support
- **Responsive design** for mobile compatibility

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Structure
- **TypeScript** for type safety
- **React Hooks** for state management
- **Context API** for global state
- **Custom hooks** for reusable logic

## Backend Integration

Make sure the backend server is running on `http://localhost:4000` with:
- PostgreSQL database configured
- Authentication endpoints available
- CORS enabled for frontend requests

## Security Features

- **JWT Token Authentication** - Secure user sessions
- **Protected Routes** - Access control for authenticated pages
- **Input Validation** - Client-side form validation
- **Error Handling** - Graceful error management
- **Token Storage** - Secure localStorage token management

## Deployment

The application can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- **Any Node.js hosting platform**

Make sure to set the environment variables in your deployment platform.
