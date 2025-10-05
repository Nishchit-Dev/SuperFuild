const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if token exists in database and is not expired
        const sessionQuery = `
            SELECT us.*, u.email, u.first_name, u.last_name 
            FROM user_sessions us 
            JOIN users u ON us.user_id = u.id 
            WHERE us.token_hash = $1 AND us.expires_at > NOW()
        `;
        
        const sessionResult = await pool.query(sessionQuery, [token]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = {
            id: decoded.userId,
            email: sessionResult.rows[0].email,
            firstName: sessionResult.rows[0].first_name,
            lastName: sessionResult.rows[0].last_name
        };
        
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

module.exports = { authenticateToken };


