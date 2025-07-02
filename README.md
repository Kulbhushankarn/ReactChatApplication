# React Chat Application

A real-time chat application built with React.js and MongoDB, featuring user authentication, real-time messaging, file sharing, and friend management.

## Features

- User authentication (Login/Register)
- Real-time messaging using Socket.IO
- File attachments (images, videos, documents)
- Friend requests and management
- User profiles with avatars
- Responsive Material-UI design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4 or higher)
- npm or yarn package manager

## Setup Instructions

1. Clone the repository:
```bash
git clone <repository-url>
cd ReactChatApplication
```

2. Install dependencies for the main project:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
```

4. Install backend dependencies:
```bash
cd ../backend
npm install
```

5. Create necessary directories for file uploads:
```bash
mkdir -p backend/uploads/profiles
mkdir -p backend/uploads/images
mkdir -p backend/uploads/videos
mkdir -p backend/uploads/documents
```

6. Start the development servers:

In the root directory:
```bash
npm run dev
```

This will start both the frontend and backend servers concurrently.

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_jwt_secret_key
```

## Project Structure

```
ReactChatApplication/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   ├── profile/
│   │   │   └── common/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── backend/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── server.js
│   └── package.json
└── package.json
```

## Technologies Used

### Frontend
- React.js
- Material-UI
- Socket.IO Client
- Axios
- React Router

### Backend
- Node.js
- Express.js
- MongoDB
- Socket.IO
- JWT Authentication
- Multer (File uploads)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.