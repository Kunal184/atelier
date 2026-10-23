const crypto = require('crypto');
const db = require('../db');
const { generateSlug } = require('../utils/slugGenerator');

// Controller: Create a new room
async function createRoom(req, res) {
  try {
    const { name, language } = req.body;
    const roomId = crypto.randomUUID();
    const roomName = name && name.trim() ? name.trim() : generateSlug();
    const roomLanguage = language && ['python', 'javascript'].includes(language.toLowerCase()) 
      ? language.toLowerCase() 
      : 'python';
    
    // Assign owner_id if request is made by an authenticated user, else NULL for guest
    const ownerId = req.user ? req.user.id : null;
    
    const result = await db.query(
      'INSERT INTO rooms (room_id, name, language, owner_id, code_content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [roomId, roomName, roomLanguage, ownerId, '']
    );
    
    res.status(201).json({
      message: 'Room created successfully',
      room: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A room with this name already exists.' });
    }
    console.error('Error creating room:', err);
    res.status(500).json({ error: 'Failed to create room.' });
  }
}

// Controller: Fetch all rooms owned by the logged-in user
async function getMyRooms(req, res) {
  try {
    const result = await db.query(
      'SELECT id, room_id, name, language, created_at FROM rooms WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.status(200).json({ rooms: result.rows });
  } catch (err) {
    console.error('Error fetching user rooms:', err);
    res.status(500).json({ error: 'Failed to fetch user rooms.' });
  }
}

// Controller: Fetch room details by UUID room_id or display name
async function getRoomByIdentifier(req, res) {
  try {
    const { identifier } = req.params;
    const result = await db.query(
      'SELECT * FROM rooms WHERE room_id = $1 OR name = $1',
      [identifier]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found.' });
    }
    
    res.status(200).json({ room: result.rows[0] });
  } catch (err) {
    console.error('Error fetching room:', err);
    res.status(500).json({ error: 'Failed to fetch room details.' });
  }
}

// Controller: Update room language
async function updateRoomLanguage(req, res) {
  try {
    const { identifier } = req.params;
    const { language } = req.body;

    if (!language || !['python', 'javascript'].includes(language.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid or unsupported language.' });
    }

    const result = await db.query(
      'UPDATE rooms SET language = $1 WHERE room_id = $2 OR name = $2 RETURNING *',
      [language.toLowerCase(), identifier]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    res.status(200).json({
      message: 'Room language updated successfully',
      room: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating room language:', err);
    res.status(500).json({ error: 'Failed to update room language.' });
  }
}

module.exports = {
  createRoom,
  getMyRooms,
  getRoomByIdentifier,
  updateRoomLanguage,
};
