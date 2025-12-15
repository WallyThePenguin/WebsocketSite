/**
 * Real-time Chat Application Server
 * CSC 436 - Project 5: Socket.io Implementation
 *
 * This server handles:
 * - HTTP requests for serving static files
 * - WebSocket connections via Socket.io
 * - Real-time message broadcasting between clients
 * - User session management (join, leave, messaging)
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// Initialize Express app
const app = express();

// Create HTTP server and attach Socket.io with CORS enabled
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Store connected users with their socket IDs and usernames
// Key: socket.id, Value: username
const connectedUsers = new Map();

// Store taken usernames for uniqueness validation
const takenUsernames = new Set();

/**
 * Socket.io Connection Handler
 * Manages all real-time communication events
 */
io.on("connection", (socket) => {
  console.log(`[CONNECTION] New client connected: ${socket.id}`);

  /**
   * Handle user joining the chat
   * Validates username uniqueness before allowing join
   */
  socket.on("user-join", (username) => {
    // Trim and validate username
    const trimmedUsername = username.trim();

    // Check if username is empty
    if (!trimmedUsername) {
      socket.emit("join-error", "Username cannot be empty");
      return;
    }

    // Check if username is already taken (case-insensitive)
    const lowerUsername = trimmedUsername.toLowerCase();
    const isTaken = Array.from(takenUsernames).some((name) => name.toLowerCase() === lowerUsername);

    if (isTaken) {
      socket.emit("join-error", "Username is already taken. Please choose another.");
      return;
    }

    // Register the user
    connectedUsers.set(socket.id, trimmedUsername);
    takenUsernames.add(trimmedUsername);

    // Confirm successful join to the user
    socket.emit("join-success", trimmedUsername);

    // Broadcast to all clients that a new user has joined
    io.emit("user-joined", {
      username: trimmedUsername,
      userCount: connectedUsers.size,
      users: Array.from(connectedUsers.values()),
    });

    // Log the join event
    console.log(`[JOIN] ${trimmedUsername} joined the chat. Total users: ${connectedUsers.size}`);
  });

  /**
   * Handle incoming chat messages
   * Broadcasts the message to all connected clients
   */
  socket.on("chat-message", (message) => {
    const username = connectedUsers.get(socket.id);

    // Only process messages from registered users
    if (!username) {
      socket.emit("error", "You must join the chat first");
      return;
    }

    // Validate message content
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return; // Ignore empty messages
    }

    // Create message object with timestamp
    const messageData = {
      id: Date.now() + "-" + socket.id,
      username: username,
      message: trimmedMessage,
      timestamp: new Date().toISOString(),
    };

    // Broadcast message to all connected clients
    io.emit("new-message", messageData);

    // Log the message (truncated for privacy)
    const truncatedMsg = trimmedMessage.length > 50 ? trimmedMessage.substring(0, 50) + "..." : trimmedMessage;
    console.log(`[MESSAGE] ${username}: ${truncatedMsg}`);
  });

  /**
   * Handle typing indicator
   * Notifies other clients when a user is typing
   */
  socket.on("typing", () => {
    const username = connectedUsers.get(socket.id);
    if (username) {
      // Broadcast to all clients except the sender
      socket.broadcast.emit("user-typing", username);
    }
  });

  /**
   * Handle stop typing indicator
   * Notifies other clients when a user stops typing
   */
  socket.on("stop-typing", () => {
    const username = connectedUsers.get(socket.id);
    if (username) {
      socket.broadcast.emit("user-stop-typing", username);
    }
  });

  /**
   * Handle client disconnection
   * Cleans up user data and notifies other clients
   */
  socket.on("disconnect", () => {
    const username = connectedUsers.get(socket.id);

    if (username) {
      // Remove user from tracking
      connectedUsers.delete(socket.id);
      takenUsernames.delete(username);

      // Notify all clients about the departure
      io.emit("user-left", {
        username: username,
        userCount: connectedUsers.size,
        users: Array.from(connectedUsers.values()),
      });

      console.log(`[DISCONNECT] ${username} left the chat. Total users: ${connectedUsers.size}`);
    } else {
      console.log(`[DISCONNECT] Unregistered client disconnected: ${socket.id}`);
    }
  });
});

// Define the port (use environment variable or default to 25567)
const PORT = process.env.PORT || 25567;

// Start the server
server.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`🚀 Real-time Chat Server is running!`);
  console.log(`📡 Server listening on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io ready for connections`);
  console.log("=".repeat(50));
});
