// 1. SETUP EXPRESS
const express = require('express');
const cors = require("cors");
require('dotenv').config();
const mongoose = require('mongoose');
const authRoutes = require('./auth');
const authMiddleware = require('./middleware/auth');

// Import models
const Item = require('./models/Item');
const User = require('./models/User');

// 1a. create the app
const app = express();
app.use(express.json());
app.use(cors());

// Database connection with retry logic
const connectWithRetry = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // Add these options for better error handling
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('Connected to MongoDB Atlas');
    } catch (err) {
        console.error('Failed to connect to MongoDB Atlas:', err.message);
        console.log('Retrying in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};

// Initial connection attempt
connectWithRetry();

// Handle connection errors
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    connectWithRetry();
});

// Auth routes
app.use('/auth', authRoutes);

// Protected routes - require authentication
app.use('/items', authMiddleware);

// 2. CREATE ROUTES

// Search items (This must come before the :level route)
app.get('/items/search', async function(req, res) {
    try {
        const { q, type, sort, level } = req.query;
        
        // Build search query
        let query = { user: req.userId };
        
        // Add level filter if specified
        if (level) {
            query.primaryLevel = parseInt(level);
        }
        
        // Add text search if query exists
        if (q) {
            query.$or = [
                { name: { $regex: q, $options: 'i' } },
                { type: { $regex: q, $options: 'i' } },
                { comment: { $regex: q, $options: 'i' } }
            ];
        }
        
        // Add type filter if specified
        if (type) {
            query.type = type;
        }

        // Build sort object
        let sortObj = {};
        if (sort) {
            switch (sort) {
                case 'name':
                    sortObj.name = 1;
                    break;
                case 'type':
                    sortObj.type = 1;
                    break;
                case 'createdAt':
                    sortObj.createdAt = -1;
                    break;
                default:
                    sortObj.name = 1;
            }
        }

        const items = await Item.find(query).sort(sortObj);
        res.json(items);
    } catch (e) {
        console.error('Search error:', e);
        res.status(500).json({
            error: "Failed to search items"
        });
    }
});

// Get all items for a specific primary level
app.get('/items/:level', async function(req, res) {
    try {
        const level = parseInt(req.params.level);
        const items = await Item.find({
            primaryLevel: level,
            user: req.userId
        });
        res.json(items);
    } catch (e) {
        res.status(500).json({
            error: "Failed to retrieve items"
        });
    }
});

// Create new item
app.post('/items', async function(req, res) {
    try {
        const newItem = new Item({
            name: req.body.name,
            type: req.body.type,
            primaryLevel: req.body.primaryLevel,
            comment: req.body.comment || '',
            user: req.userId
        });
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (e) {
        res.status(500).json({
            error: "Failed to create item"
        });
    }
});

// Update item
app.put('/items/:id', async function(req, res) {
    try {
        const item = await Item.findOneAndUpdate(
            { _id: req.params.id, user: req.userId },
            {
                $set: {
                    name: req.body.name,
                    type: req.body.type,
                    comment: req.body.comment,
                    acquired: req.body.acquired
                }
            },
            { new: true }
        );
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json(item);
    } catch (e) {
        res.status(500).json({
            error: "Failed to update item"
        });
    }
});

// Delete item
app.delete('/items/:id', async function(req, res) {
    try {
        const item = await Item.findOneAndDelete({
            _id: req.params.id,
            user: req.userId
        });
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json({ message: "Item deleted successfully" });
    } catch (e) {
        res.status(500).json({
            error: "Failed to delete item"
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server only after successful database connection
mongoose.connection.once('open', () => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});