const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Register new user
const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required',
                code: 'MISSING_FIELDS'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Please provide a valid email address',
                code: 'INVALID_EMAIL'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters long',
                code: 'PASSWORD_TOO_SHORT'
            });
        }

        if (password.length > 128) {
            return res.status(400).json({ 
                error: 'Password must be less than 128 characters',
                code: 'PASSWORD_TOO_LONG'
            });
        }

        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ 
                error: 'User with this email already exists',
                code: 'USER_EXISTS'
            });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name, created_at',
            [email, passwordHash, firstName || null, lastName || null]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Store token in database
        await pool.query(
            'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'24 hours\')',
            [user.id, token]
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                createdAt: user.created_at
            },
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle specific database errors
        if (error.code === '23505') { // Unique constraint violation
            return res.status(409).json({ 
                error: 'User with this email already exists',
                code: 'USER_EXISTS'
            });
        } else if (error.code === '23514') { // Check constraint violation
            return res.status(400).json({ 
                error: 'Invalid data provided',
                code: 'INVALID_DATA'
            });
        } else if (error.code === '28P01') { // Authentication failed
            return res.status(500).json({ 
                error: 'Database connection error. Please try again later.',
                code: 'DATABASE_ERROR'
            });
        } else if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({ 
                error: 'Database connection failed. Please try again later.',
                code: 'DATABASE_ERROR'
            });
        }
        
        res.status(500).json({ 
            error: 'Internal server error. Please try again later.',
            code: 'INTERNAL_ERROR'
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required',
                code: 'MISSING_FIELDS'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Please provide a valid email address',
                code: 'INVALID_EMAIL'
            });
        }

        // Find user by email
        const result = await pool.query(
            'SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const user = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Invalid email or password',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Store token in database
        await pool.query(
            'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'24 hours\')',
            [user.id, token]
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        
        // Handle specific database errors
        if (error.code === '28P01') { // Authentication failed
            return res.status(500).json({ 
                error: 'Database connection error. Please try again later.',
                code: 'DATABASE_ERROR'
            });
        } else if (error.code === 'ECONNREFUSED') {
            return res.status(500).json({ 
                error: 'Database connection failed. Please try again later.',
                code: 'DATABASE_ERROR'
            });
        }
        
        res.status(500).json({ 
            error: 'Internal server error. Please try again later.',
            code: 'INTERNAL_ERROR'
        });
    }
};

// Get user profile
const getProfile = async (req, res) => {
    try {
        res.json({
            user: req.user
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Logout user
const logout = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            // Remove token from database
            await pool.query('DELETE FROM user_sessions WHERE token_hash = $1', [token]);
        }

        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    logout
};
