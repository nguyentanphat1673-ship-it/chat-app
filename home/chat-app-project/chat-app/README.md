# Chat App - Modern Internal Chat Platform

A full-featured internal chat application built with Node.js, Express, Socket.IO, and MongoDB. Features real-time messaging, friend management, group chats, and more.

## Features

### Core Features
- **User Authentication**: Register, login with email/phone/user_id, JWT-based authentication
- **Real-time Messaging**: Socket.IO powered instant messaging
- **Friend System**: Send/accept friend requests, manage friends list
- **Group Chats**: Create groups, manage members, admin controls
- **File Sharing**: Upload and share images, videos, documents
- **Notifications**: Real-time notifications for messages, friend requests, mentions
- **Message Features**: Emoji, reactions, reply, forward, edit, delete, search
- **User Status**: Online/offline status, typing indicators, read receipts
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Dark/Light Mode**: Theme switching support

### Security Features
- Password hashing with bcrypt
- JWT token authentication
- Rate limiting
- CORS protection
- Helmet for HTTP headers
- XSS protection
- SQL/NoSQL injection prevention

## Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript (Vanilla)
- Socket.IO Client

### Backend
- Node.js
- Express.js
- Socket.IO
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Multer (file upload)

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Step 1: Install Node.js and MongoDB

**macOS:**
```bash
# Install Node.js
brew install node

# Install MongoDB
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
- Download and install Node.js from https://nodejs.org/
- Download and install MongoDB from https://www.mongodb.com/try/download/community

**Linux (Ubuntu):**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

### Step 2: Setup Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` file:
```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production
JWT_REFRESH_EXPIRE=30d
BCRYPT_ROUNDS=10
CORS_ORIGIN=http://localhost:3000
MAX_FILE_SIZE=52428800
MAX_VIDEO_DURATION=35
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start at `http://localhost:3000`

## Usage

### Access the Application

1. Open your browser and navigate to `http://localhost:3000`
2. Create a new account or login with existing credentials
3. Start chatting!

### Creating a Group Chat

1. Click the "New Chat" button in the sidebar
2. Select multiple friends to add to the group
3. Enter a group name
4. Create the group

### Sending Files

1. Click the attachment icon in the message input area
2. Select a file from your computer
3. The file will be uploaded and shared with the recipient

### Managing Friends

1. Use the search bar to find users
2. Send a friend request
3. Accept or reject incoming requests
4. View your friends list

## Project Structure

```
chat-app/
├── client/                 # Frontend files
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   ├── assets/            # Images, icons, fonts
│   └── index.html         # Main HTML file
├── server/                # Backend files
│   ├── config/            # Configuration files
│   ├── controllers/       # Route controllers
│   ├── middlewares/       # Express middlewares
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── socket/            # Socket.IO handlers
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   └── app.js             # Express app setup
├── uploads/               # Uploaded files
│   ├── avatars/          # User avatars
│   ├── images/           # Chat images
│   ├── videos/           # Chat videos
│   ├── documents/        # Chat documents
│   └── files/            # Other files
├── logs/                  # Application logs
├── .env.example           # Environment variables template
├── .env                   # Environment variables (create from .env.example)
├── package.json           # Dependencies
├── README.md              # This file
└── server.js              # Entry point
```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `POST /api/users/refresh-token` - Refresh access token
- `POST /api/users/logout` - Logout user

### User Profile
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/avatar` - Update user avatar
- `PUT /api/users/change-password` - Change password
- `GET /api/users/search?query=...` - Search users
- `GET /api/users/:userId` - Get user by ID

### Friends
- `POST /api/friends/request/send` - Send friend request
- `POST /api/friends/request/accept` - Accept friend request
- `POST /api/friends/request/reject` - Reject friend request
- `POST /api/friends/request/cancel` - Cancel friend request
- `POST /api/friends/remove` - Remove friend
- `GET /api/friends/list` - Get friends list
- `GET /api/friends/requests` - Get friend requests
- `GET /api/friends/online` - Get online friends

### Messages
- `POST /api/messages/send` - Send message
- `GET /api/messages/get` - Get messages
- `PUT /api/messages/:messageId/edit` - Edit message
- `DELETE /api/messages/:messageId/delete` - Delete message
- `POST /api/messages/:messageId/reaction/add` - Add reaction
- `POST /api/messages/:messageId/reaction/remove` - Remove reaction
- `POST /api/messages/mark-as-seen` - Mark message as seen
- `GET /api/messages/search` - Search messages

### Groups
- `POST /api/groups/create` - Create group
- `GET /api/groups/:groupId` - Get group details
- `PUT /api/groups/:groupId/update` - Update group
- `PUT /api/groups/:groupId/avatar` - Update group avatar
- `POST /api/groups/:groupId/member/add` - Add member
- `POST /api/groups/:groupId/member/remove` - Remove member
- `POST /api/groups/:groupId/leave` - Leave group
- `DELETE /api/groups/:groupId/delete` - Delete group
- `POST /api/groups/:groupId/admin/add` - Add admin
- `POST /api/groups/:groupId/admin/remove` - Remove admin
- `POST /api/groups/:groupId/transfer-ownership` - Transfer ownership
- `GET /api/groups/user/groups` - Get user groups

### Notifications
- `GET /api/notifications` - Get notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:notificationId/read` - Mark as read
- `PUT /api/notifications/mark-all-as-read` - Mark all as read
- `DELETE /api/notifications/:notificationId` - Delete notification
- `DELETE /api/notifications` - Delete all notifications

## Socket.IO Events

### Client to Server
- `user_online` - User comes online
- `typing` - User is typing
- `stop_typing` - User stopped typing
- `new_message` - Send new message
- `message_seen` - Mark message as seen
- `message_deleted` - Delete message
- `message_edited` - Edit message
- `reaction_added` - Add reaction
- `join_group` - Join group
- `leave_group` - Leave group
- `friend_request_sent` - Send friend request
- `friend_request_accepted` - Accept friend request
- `notification_received` - Send notification

### Server to Client
- `user_status_changed` - User status changed
- `message_received` - New message received
- `user_typing` - User is typing
- `user_stopped_typing` - User stopped typing
- `message_seen` - Message marked as seen
- `message_deleted` - Message deleted
- `message_edited` - Message edited
- `reaction_added` - Reaction added
- `user_joined_group` - User joined group
- `user_left_group` - User left group
- `friend_request_received` - Friend request received
- `friend_request_accepted` - Friend request accepted
- `new_notification` - New notification

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod` or `brew services start mongodb-community`
- Check MONGODB_URI in `.env` file
- Verify MongoDB is accessible at the specified URI

### Port Already in Use
- Change PORT in `.env` file
- Or kill the process using port 3000: `lsof -ti:3000 | xargs kill -9`

### CORS Errors
- Ensure CORS_ORIGIN in `.env` matches your frontend URL
- Check that frontend is running on the correct port

### File Upload Issues
- Ensure `uploads` directory exists and is writable
- Check MAX_FILE_SIZE in `.env` file
- Verify file permissions

## Performance Optimization

- Database indexes on frequently queried fields
- Message pagination for large conversations
- Socket.IO connection pooling
- File compression for uploads
- Caching strategies for user data

## Security Considerations

- Always use HTTPS in production
- Change JWT_SECRET and JWT_REFRESH_SECRET in production
- Enable rate limiting
- Use environment variables for sensitive data
- Regularly update dependencies
- Implement CORS properly
- Validate all user inputs
- Use HTTPS for Socket.IO connections

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions, please create an issue on GitHub or contact the development team.

## Changelog

### Version 1.0.0
- Initial release
- Core chat functionality
- Friend system
- Group chats
- File sharing
- Real-time notifications
- User authentication
- Message features (edit, delete, react, reply)
- Responsive design

---

**Last Updated**: 2024
**Version**: 1.0.0
