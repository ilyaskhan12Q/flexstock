const http = require('http');
const app = require('./app');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // We can restrict this to client URL in production
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT']
  }
});

// Store io reference in app for controllers usage
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join the shared inventory room
  socket.join('inventory');

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`FlexStock server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
