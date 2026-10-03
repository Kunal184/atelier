const crypto = require('crypto');
const db = require('../db');
const { generateSlug } = require('../utils/slugGenerator');

// Controller: Create a new room
async function createRoom(req, res) {
  try {
    const { name } = req.body;
    const roomId = crypto.randomUUID();
    const roomName = name && name.trim() ? name.trim() : generateSlug();
    
    const result = await db.query(
      'INSERT INTO rooms (room_id, name, code_content) VALUES (\, \, \) RETURNING *',
      [roomId, roomName, '']
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

// Controller: Fetch room details by UUID room_id or display name
async function getRoomByIdentifier(req, res) {
  try {
    const { identifier } = req.params;
    const result = await db.query(
      'SELECT * FROM rooms WHERE room_id = \ OR name = \',
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

module.exports = {
  createRoom,
  getRoomByIdentifier,
};
