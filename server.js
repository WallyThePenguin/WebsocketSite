/**
 * Real-time Chat Application Server (HTTPS)
 * CSC 436 - Project 5: Socket.io Implementation
 *
 * This server handles:
 * - HTTPS requests for serving static files
 * - Secure WebSocket connections via Socket.io
 * - Real-time message broadcasting between clients
 * - User session management (join, leave, messaging)
 * - Auto-generated SSL certificates for convenience
 */

const express = require("express");
const https = require("https");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const forge = require("node-forge");

// Initialize Express app
const app = express();

// Define the port
const PORT = process.env.PORT || 25567;

// Certificate directory
const CERT_DIR = path.join(__dirname, "certs");
const CERT_PATH = path.join(CERT_DIR, "cert.pem");
const KEY_PATH = path.join(CERT_DIR, "key.pem");

/**
 * Generate self-signed SSL certificates using node-forge
 */
function generateCertificate() {
  console.log("🔐 Generating new self-signed SSL certificates...");

  // Generate a key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // Create a certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01" + Date.now().toString(16);
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  // Set certificate attributes
  const attrs = [
    { name: "commonName", value: "validtesting.tplinkdns.com" },
    { name: "organizationName", value: "ChatWave Development" },
    { name: "countryName", value: "US" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Add extensions for browser compatibility
  cert.setExtensions([
    { name: "basicConstraints", cA: false },
    {
      name: "keyUsage",
      keyCertSign: false,
      digitalSignature: true,
      keyEncipherment: true,
    },
    {
      name: "extKeyUsage",
      serverAuth: true,
    },
    {
      name: "subjectAltName",
      altNames: [
        { type: 2, value: "localhost" },
        { type: 2, value: "validtesting.tplinkdns.com" },
        { type: 7, ip: "127.0.0.1" },
      ],
    },
  ]);

  // Self-sign the certificate
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // Convert to PEM format
  const certPem = forge.pki.certificateToPem(cert);
  const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

  return { cert: certPem, key: keyPem };
}

/**
 * Get or generate SSL credentials
 */
function getSSLCredentials() {
  // Create certs directory if it doesn't exist
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }

  // Check if certificates already exist
  if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
    console.log("📜 Loading existing SSL certificates...");
    return {
      cert: fs.readFileSync(CERT_PATH, "utf8"),
      key: fs.readFileSync(KEY_PATH, "utf8"),
    };
  }

  // Generate new certificates
  const { cert, key } = generateCertificate();

  // Save certificates for reuse
  fs.writeFileSync(CERT_PATH, cert);
  fs.writeFileSync(KEY_PATH, key);
  console.log("✅ SSL certificates generated and saved to ./certs/");

  return { cert, key };
}

// Get SSL credentials
const credentials = getSSLCredentials();

// Create HTTPS server
const server = https.createServer(credentials, app);

// Attach Socket.io with CORS enabled
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

// Start the HTTPS server
server.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`🔒 Real-time Chat Server is running with HTTPS!`);
  console.log(`📡 Local: https://localhost:${PORT}`);
  console.log(`🌐 External: https://validtesting.tplinkdns.com:${PORT}`);
  console.log(`🔌 Socket.io ready for secure connections`);
  console.log("=".repeat(50));
  console.log("");
  console.log("⚠️  FIRST TIME? You'll need to accept the self-signed cert:");
  console.log(`   1. Open https://localhost:${PORT} in your browser`);
  console.log("   2. Click 'Advanced' → 'Proceed anyway'");
  console.log("   3. The chat will then work from GitHub Pages!");
});
