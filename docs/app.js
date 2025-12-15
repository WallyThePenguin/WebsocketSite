/**
 * ChatWave - Real-time Chat Application Client
 * CSC 436 - Project 5: Socket.io Implementation
 *
 * This client handles:
 * - Socket.io connection management
 * - User authentication (username selection)
 * - Real-time message sending and receiving
 * - UI state management and updates
 * - Typing indicators
 */

// ===== Socket.io Connection =====
// Connect to the Socket.io server at the specified address
const socket = io("http://validtesting.tplinkdns.com:25567");

// ===== DOM Element References =====
const elements = {
  // Screens
  loginScreen: document.getElementById("login-screen"),
  chatScreen: document.getElementById("chat-screen"),

  // Login Form
  loginForm: document.getElementById("login-form"),
  usernameInput: document.getElementById("username-input"),
  charCount: document.getElementById("char-count"),
  loginError: document.getElementById("login-error"),
  joinBtn: document.getElementById("join-btn"),
  loginUserCount: document.getElementById("login-user-count"),

  // Chat Interface
  messagesContainer: document.getElementById("messages-container"),
  messageForm: document.getElementById("message-form"),
  messageInput: document.getElementById("message-input"),
  sendBtn: document.getElementById("send-btn"),
  typingIndicator: document.getElementById("typing-indicator"),

  // Sidebar
  sidebar: document.querySelector(".sidebar"),
  usersList: document.getElementById("users-list"),
  userCount: document.getElementById("user-count"),
  currentUsername: document.getElementById("current-username"),
  userAvatar: document.getElementById("user-avatar"),
  leaveBtn: document.getElementById("leave-btn"),
  mobileMenuBtn: document.getElementById("mobile-menu-btn"),

  // Connection Status
  connectionStatus: document.getElementById("connection-status"),
};

// ===== Application State =====
const state = {
  currentUser: null, // Current user's username
  users: [], // List of online users
  messages: [], // Array of chat messages
  isConnected: false, // Socket connection status
  typingTimeout: null, // Timeout for typing indicator
  isTyping: false, // Whether current user is typing
};

// ===== Utility Functions =====

/**
 * Generates a consistent color for a username
 * Uses a simple hash to assign colors consistently
 * @param {string} username - The username to generate color for
 * @returns {string} - HSL color string
 */
function getUserColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Gets the initials from a username (first 1-2 characters)
 * @param {string} username - The username
 * @returns {string} - Initials (uppercase)
 */
function getInitials(username) {
  return username.substring(0, 2).toUpperCase();
}

/**
 * Formats a timestamp for display
 * @param {string} isoString - ISO timestamp string
 * @returns {string} - Formatted time (HH:MM)
 */
function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Scrolls the messages container to the bottom
 * Uses smooth scrolling for better UX
 */
function scrollToBottom() {
  elements.messagesContainer.scrollTo({
    top: elements.messagesContainer.scrollHeight,
    behavior: "smooth",
  });
}

/**
 * Switches between login and chat screens
 * @param {string} screen - 'login' or 'chat'
 */
function switchScreen(screen) {
  if (screen === "chat") {
    elements.loginScreen.classList.remove("active");
    elements.chatScreen.classList.add("active");
    elements.messageInput.focus();
  } else {
    elements.chatScreen.classList.remove("active");
    elements.loginScreen.classList.add("active");
    elements.usernameInput.focus();
  }
}

/**
 * Updates the connection status indicator
 * @param {boolean} connected - Whether socket is connected
 */
function updateConnectionStatus(connected) {
  const statusDot = elements.connectionStatus.querySelector(".status-dot");
  const statusText = elements.connectionStatus.querySelector("span:last-child");

  if (connected) {
    statusDot.classList.add("connected");
    statusDot.classList.remove("disconnected");
    statusText.textContent = "Connected";
  } else {
    statusDot.classList.remove("connected");
    statusDot.classList.add("disconnected");
    statusText.textContent = "Disconnected";
  }
}

// ===== UI Update Functions =====

/**
 * Updates the online users list in the sidebar
 * @param {string[]} users - Array of usernames
 */
function updateUsersList(users) {
  state.users = users;
  elements.userCount.textContent = users.length;
  elements.loginUserCount.textContent = users.length;

  // Clear and rebuild users list
  elements.usersList.innerHTML = "";

  users.forEach((username) => {
    const li = document.createElement("li");
    const isCurrentUser = username === state.currentUser;

    if (isCurrentUser) {
      li.classList.add("current-user");
    }

    li.innerHTML = `
            <div class="user-avatar" style="color: ${getUserColor(username)}; border-color: ${getUserColor(
      username
    )}33">
                ${getInitials(username)}
            </div>
            <span class="user-name">${escapeHtml(username)}</span>
        `;

    elements.usersList.appendChild(li);
  });
}

/**
 * Adds a chat message to the messages container
 * @param {Object} messageData - Message object with username, message, timestamp
 * @param {boolean} isOwn - Whether this is the current user's message
 */
function addMessage(messageData, isOwn = false) {
  // Remove welcome message if it exists
  const welcomeMsg = elements.messagesContainer.querySelector(".welcome-message");
  if (welcomeMsg) {
    welcomeMsg.remove();
  }

  // Create message element
  const messageEl = document.createElement("div");
  messageEl.classList.add("message");
  if (isOwn) {
    messageEl.classList.add("own-message");
  }

  const avatarColor = getUserColor(messageData.username);

  messageEl.innerHTML = `
        <div class="msg-avatar" style="${isOwn ? "" : `background: ${avatarColor}22; color: ${avatarColor}`}">
            ${getInitials(messageData.username)}
        </div>
        <div class="msg-content">
            <div class="msg-header">
                <span class="msg-username">${escapeHtml(messageData.username)}</span>
                <span class="msg-time">${formatTime(messageData.timestamp)}</span>
            </div>
            <div class="msg-text">${escapeHtml(messageData.message)}</div>
        </div>
    `;

  elements.messagesContainer.appendChild(messageEl);
  state.messages.push(messageData);

  // Scroll to show new message
  scrollToBottom();
}

/**
 * Adds a system message (user joined/left)
 * @param {string} text - The system message text
 * @param {string} type - 'joined' or 'left'
 */
function addSystemMessage(text, type = "") {
  const messageEl = document.createElement("div");
  messageEl.classList.add("system-message");
  if (type === "joined") {
    messageEl.classList.add("user-joined");
  } else if (type === "left") {
    messageEl.classList.add("user-left");
  }

  messageEl.textContent = text;
  elements.messagesContainer.appendChild(messageEl);
  scrollToBottom();
}

/**
 * Shows the typing indicator
 * @param {string} username - Username of the person typing
 */
function showTypingIndicator(username) {
  const typingUser = elements.typingIndicator.querySelector(".typing-user");
  typingUser.textContent = username;
  elements.typingIndicator.classList.remove("hidden");
}

/**
 * Hides the typing indicator
 */
function hideTypingIndicator() {
  elements.typingIndicator.classList.add("hidden");
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Displays an error message on the login form
 * @param {string} message - Error message to display
 */
function showLoginError(message) {
  elements.loginError.textContent = message;
  elements.usernameInput.focus();
}

/**
 * Clears the login error message
 */
function clearLoginError() {
  elements.loginError.textContent = "";
}

// ===== Event Handlers =====

/**
 * Handles the login form submission
 * Attempts to join the chat with the provided username
 */
function handleLogin(e) {
  e.preventDefault();

  const username = elements.usernameInput.value.trim();

  // Validate username
  if (!username) {
    showLoginError("Please enter a username");
    return;
  }

  if (username.length < 2) {
    showLoginError("Username must be at least 2 characters");
    return;
  }

  if (username.length > 20) {
    showLoginError("Username must be 20 characters or less");
    return;
  }

  // Disable button while processing
  elements.joinBtn.disabled = true;
  elements.joinBtn.querySelector("span").textContent = "Joining...";

  // Emit join event to server
  socket.emit("user-join", username);
}

/**
 * Handles sending a chat message
 */
function handleSendMessage(e) {
  e.preventDefault();

  const message = elements.messageInput.value.trim();

  if (!message) {
    return;
  }

  // Emit message to server
  socket.emit("chat-message", message);

  // Clear input
  elements.messageInput.value = "";
  elements.messageInput.focus();

  // Stop typing indicator
  if (state.isTyping) {
    socket.emit("stop-typing");
    state.isTyping = false;
  }
}

/**
 * Handles typing events for the typing indicator
 */
function handleTyping() {
  if (!state.isTyping) {
    state.isTyping = true;
    socket.emit("typing");
  }

  // Clear previous timeout
  if (state.typingTimeout) {
    clearTimeout(state.typingTimeout);
  }

  // Set timeout to stop typing after 2 seconds of inactivity
  state.typingTimeout = setTimeout(() => {
    state.isTyping = false;
    socket.emit("stop-typing");
  }, 2000);
}

/**
 * Handles leaving the chat
 */
function handleLeaveChat() {
  // Reset state
  state.currentUser = null;
  state.messages = [];

  // Clear UI
  elements.messagesContainer.innerHTML = `
        <div class="welcome-message">
            <h3>Welcome to the chat!</h3>
            <p>Start a conversation with other users.</p>
        </div>
    `;
  elements.usernameInput.value = "";
  elements.messageInput.value = "";

  // Reset login button
  elements.joinBtn.disabled = false;
  elements.joinBtn.querySelector("span").textContent = "Join Chat";

  // Switch to login screen
  switchScreen("login");

  // Disconnect and reconnect socket to properly leave
  socket.disconnect();
  socket.connect();
}

/**
 * Toggles the mobile sidebar
 */
function toggleMobileSidebar() {
  elements.sidebar.classList.toggle("open");

  // Handle overlay
  let overlay = document.querySelector(".sidebar-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.classList.add("sidebar-overlay");
    overlay.addEventListener("click", toggleMobileSidebar);
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle("active");
}

// ===== Socket.io Event Listeners =====

// Connection established
socket.on("connect", () => {
  console.log("[SOCKET] Connected to server");
  state.isConnected = true;
  updateConnectionStatus(true);
});

// Connection lost
socket.on("disconnect", () => {
  console.log("[SOCKET] Disconnected from server");
  state.isConnected = false;
  updateConnectionStatus(false);
});

// Successful join
socket.on("join-success", (username) => {
  console.log(`[SOCKET] Successfully joined as ${username}`);

  state.currentUser = username;

  // Update UI with username
  elements.currentUsername.textContent = username;
  elements.userAvatar.textContent = getInitials(username);

  // Reset button
  elements.joinBtn.disabled = false;
  elements.joinBtn.querySelector("span").textContent = "Join Chat";

  // Switch to chat screen
  switchScreen("chat");

  // Clear any errors
  clearLoginError();
});

// Join error (username taken, etc.)
socket.on("join-error", (errorMessage) => {
  console.log(`[SOCKET] Join error: ${errorMessage}`);

  // Reset button
  elements.joinBtn.disabled = false;
  elements.joinBtn.querySelector("span").textContent = "Join Chat";

  // Show error
  showLoginError(errorMessage);
});

// User joined the chat
socket.on("user-joined", (data) => {
  console.log(`[SOCKET] User joined: ${data.username}`);

  updateUsersList(data.users);

  // Only show system message if not our own join
  if (data.username !== state.currentUser) {
    addSystemMessage(`${data.username} joined the chat`, "joined");
  }
});

// User left the chat
socket.on("user-left", (data) => {
  console.log(`[SOCKET] User left: ${data.username}`);

  updateUsersList(data.users);
  addSystemMessage(`${data.username} left the chat`, "left");

  // Hide typing indicator if the leaving user was typing
  hideTypingIndicator();
});

// New message received
socket.on("new-message", (messageData) => {
  console.log(`[SOCKET] New message from ${messageData.username}`);

  const isOwn = messageData.username === state.currentUser;
  addMessage(messageData, isOwn);

  // Hide typing indicator when message is received
  hideTypingIndicator();
});

// User is typing
socket.on("user-typing", (username) => {
  showTypingIndicator(username);
});

// User stopped typing
socket.on("user-stop-typing", () => {
  hideTypingIndicator();
});

// ===== Initialize Event Listeners =====

// Login form submission
elements.loginForm.addEventListener("submit", handleLogin);

// Character count for username input
elements.usernameInput.addEventListener("input", (e) => {
  elements.charCount.textContent = e.target.value.length;
  clearLoginError();
});

// Message form submission
elements.messageForm.addEventListener("submit", handleSendMessage);

// Typing indicator
elements.messageInput.addEventListener("input", handleTyping);

// Leave chat button
elements.leaveBtn.addEventListener("click", handleLeaveChat);

// Mobile menu toggle
elements.mobileMenuBtn.addEventListener("click", toggleMobileSidebar);

// Focus username input on load
window.addEventListener("load", () => {
  elements.usernameInput.focus();
});

// ===== Console Welcome Message =====
console.log("%c ChatWave ", "background: #f59e0b; color: #0a0a0f; font-size: 20px; font-weight: bold; padding: 10px;");
console.log("%c Real-time Chat Application ", "color: #fbbf24; font-size: 14px;");
console.log("%c CSC 436 - Project 5 ", "color: #a1a1aa; font-size: 12px;");
