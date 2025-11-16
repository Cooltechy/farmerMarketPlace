const express = require('express');
const router = express.Router();
const { 
    showRegisterPage, 
    showLoginPage, 
    registerUser, 
    loginUser,
    logoutUser
} = require('../controllers/userController');
const { requireGuest } = require('../middleware/auth');

// GET - Show registration page (only if not logged in)
router.get('/register', requireGuest, showRegisterPage);

// POST - Handle registration form submission
router.post('/register', requireGuest, registerUser);

// GET - Show login page (only if not logged in)
router.get('/login', requireGuest, showLoginPage);

// POST - Handle login form submission
router.post('/login', requireGuest, loginUser);

// POST - Handle logout
router.post('/logout', logoutUser);
router.get('/logout', logoutUser);

module.exports = router;