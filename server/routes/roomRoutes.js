const express = require('express');
const router = express.Router();
const { createRoom, getRoomByIdentifier } = require('../controllers/roomController');

// POST /api/rooms - Create a new room
router.post('/', createRoom);

// GET /api/rooms/:identifier - Fetch room by room_id or display name
router.get('/:identifier', getRoomByIdentifier);

module.exports = router;
