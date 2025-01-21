const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }

        // Create user
        const user = new User({ username, password });
        await user.save();

        res.status(201).json({ message: "User created successfully" });
    } catch (e) {
        res.status(500).json({ error: "Failed to register user" });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check password
        const validPassword = await user.comparePassword(password);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (e) {
        res.status(500).json({ error: "Login failed" });
    }
});

module.exports = router; 