const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
// const { initRedis } = require('./utils/cache');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Use optimized compression middleware
const configureCompression = require('./middleware/compression');
app.use(configureCompression());

// Serve static files with cache control
app.use('/uploads', express.static('uploads', {
  maxAge: '1d', // Cache for 1 day
  etag: true, // Use ETags for cache validation
  lastModified: true // Use Last-Modified headers
}));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Connection Error:', err));

// Initialize Redis for caching
// initRedis().catch(err => console.log('Redis initialization skipped:', err));

// Make io available in routes
app.set('io', io);

// Track online users
const onlineUsers = new Map();

// Create uploads directories if they don't exist
const createUploadDirs = () => {
  const dirs = [
    'uploads/profiles',
    'uploads/groups',
    'uploads/images',
    'uploads/videos',
    'uploads/documents'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', (userId) => {
    socket.join(userId);
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} joined`);
    
    // Broadcast to all users that this user is online
    io.emit('user_status_change', { userId, status: 'online' });
  });

  // Join a group chat room
  socket.on('join group', (groupId) => {
    socket.join(`group:${groupId}`);
    console.log(`User ${socket.userId} joined group ${groupId}`);
  });

  // Leave a group chat room
  socket.on('leave group', (groupId) => {
    socket.leave(`group:${groupId}`);
    console.log(`User ${socket.userId} left group ${groupId}`);
  });

  socket.on('private message', ({ to, message, from }) => {
    io.to(to).emit('private message', { message, from, to });
    io.to(from).emit('private message', { message, from, to });
  });

  socket.on('group message', ({ groupId, message }) => {
    io.to(`group:${groupId}`).emit('group message', { message, group: groupId });
  });

  socket.on('message deleted', ({ messageId, to, from }) => {
    io.to(to).emit('message deleted', { messageId, from, to });
    io.to(from).emit('message deleted', { messageId, from, to });
  });

  socket.on('group message deleted', ({ messageId, groupId }) => {
    io.to(`group:${groupId}`).emit('group message deleted', { messageId, group: groupId });
  });

  socket.on('get_online_users', () => {
    socket.emit('online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      // Broadcast to all users that this user is offline
      io.emit('user_status_change', { userId: socket.userId, status: 'offline' });
    }
    console.log('Client disconnected');
  });
});

// Endpoint to get online users
app.get('/api/users/online', (req, res) => {
  res.json(Array.from(onlineUsers.keys()));
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/notifications', require('./routes/notifications'));
app.use(configureCompression());

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});