# ChatWave - Real-time Chat Application

A real-time chat application built with Socket.io for CSC 436 Project 5. This application demonstrates bidirectional WebSocket communication between multiple clients and a Node.js server.

![ChatWave](https://img.shields.io/badge/Socket.io-Real--time-orange)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Real-time Messaging**: Instant message delivery to all connected clients
- **Unique Usernames**: Username validation ensures no duplicate names
- **User Presence**: See who's online and get notifications when users join/leave
- **Typing Indicators**: See when someone is typing a message
- **Responsive Design**: Works on desktop and mobile devices
- **Connection Status**: Visual indicator showing connection state

## Project Structure

```
WebsocketSite/
├── server.js           # Node.js server with Socket.io
├── package.json        # Dependencies and scripts
├── .gitignore          # Git ignore file
├── README.md           # This file
└── public/             # Static client files
    ├── index.html      # Main HTML structure
    ├── style.css       # Styles and animations
    └── app.js          # Client-side Socket.io logic
```

## Technologies Used

- **Backend**: Node.js, Express.js, Socket.io
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Real-time Communication**: WebSockets via Socket.io

## Local Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or higher recommended)
- npm (comes with Node.js)

### Step-by-Step Setup

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd WebsocketSite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open the application**
   - Open your browser and navigate to: `http://localhost:3000`
   - To test multi-user functionality, open multiple browser tabs or windows

### Environment Variables (Optional)

- `PORT`: The port number for the server (default: 3000)
  ```bash
  # Windows
  set PORT=8080 && npm start
  
  # Linux/Mac
  PORT=8080 npm start
  ```

## How to Use

1. **Enter a Username**: Choose a unique username (2-20 characters)
2. **Join the Chat**: Click "Join Chat" to enter the chat room
3. **Send Messages**: Type your message and press Enter or click the send button
4. **See Online Users**: The sidebar shows all currently connected users
5. **Leave Chat**: Click "Leave Chat" to disconnect and return to the login screen

## Socket.io Events

### Server Events (Emitted by Server)

| Event | Description | Data |
|-------|-------------|------|
| `join-success` | User successfully joined | `username` |
| `join-error` | Username validation failed | `errorMessage` |
| `user-joined` | A user joined the chat | `{ username, userCount, users }` |
| `user-left` | A user left the chat | `{ username, userCount, users }` |
| `new-message` | New chat message | `{ id, username, message, timestamp }` |
| `user-typing` | A user is typing | `username` |
| `user-stop-typing` | A user stopped typing | - |

### Client Events (Emitted by Client)

| Event | Description | Data |
|-------|-------------|------|
| `user-join` | Request to join chat | `username` |
| `chat-message` | Send a message | `message` |
| `typing` | User started typing | - |
| `stop-typing` | User stopped typing | - |

## Code Quality Features

- **Well-commented code**: Both server and client code are thoroughly documented
- **Error handling**: Graceful handling of connection issues and validation errors
- **Security**: HTML escaping prevents XSS attacks
- **State management**: Client-side state tracks users, messages, and connection status
- **Responsive design**: Mobile-friendly interface with sidebar toggle

## Testing Multi-User Functionality

To test real-time features between multiple users:

1. Start the server with `npm start`
2. Open `http://localhost:3000` in multiple browser windows/tabs
3. Join with different usernames in each window
4. Send messages and observe real-time updates across all windows
5. Test the typing indicator by typing in one window
6. Observe user join/leave notifications

## Project Requirements Fulfilled

✅ Socket.io Server Setup with Express  
✅ Client connection/disconnection handling  
✅ Real-time message broadcasting  
✅ Client-side Socket.io integration  
✅ Event emission and listening  
✅ Real-time feature (chat messaging)  
✅ Clean and intuitive UI  
✅ Client-side state management  
✅ Well-commented, clean code  
✅ Git repository with meaningful commits  
✅ Clear README with setup instructions  

## Author

CSC 436 - Project 5

## License

MIT License

