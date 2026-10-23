const express = require('express');
const router = express.Router();
const {
  createRoom,
  getMyRooms,
  getRoomByIdentifier,
  updateRoomLanguage,
} = require('../controllers/roomController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

// POST /api/rooms - Create a new room (supports both guest and authenticated users)
router.post('/', optionalAuth, createRoom);

// GET /api/rooms/user/my-rooms - Fetch rooms created by logged-in user
router.get('/user/my-rooms', requireAuth, getMyRooms);

// GET /api/rooms/:identifier - Fetch room by room_id or display name
router.get('/:identifier', getRoomByIdentifier);

// PATCH /api/rooms/:identifier/language - Update room language
router.patch('/:identifier/language', updateRoomLanguage);

module.exports = router;

