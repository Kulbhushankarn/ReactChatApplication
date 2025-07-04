import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Box
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import { io } from 'socket.io-client';
import NotificationCenter from '../notifications/NotificationCenter';

const Navigation = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || !user) return;
    
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    newSocket.emit('join', user.id);
    setSocket(newSocket);

    return () => newSocket.close();
  }, [token, user]);

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };
  
  const handleNavigateToChat = (userId) => {
    navigate('/chat', { state: { selectedUserId: userId } });
  };
  
  const handleNavigateToGroup = (groupId) => {
    navigate('/chat', { state: { selectedGroupId: groupId } });
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <ChatIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Chat App
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button color="inherit" onClick={() => navigate('/chat')}>
            Chat
          </Button>
          {socket && (
            <NotificationCenter 
              socket={socket} 
              onNavigateToChat={handleNavigateToChat}
              onNavigateToGroup={handleNavigateToGroup}
            />
          )}
          <Button
            color="inherit"
            onClick={() => navigate('/profile')}
            startIcon={
              <Avatar
                src={`http://localhost:5000${user?.profilePhoto}`}
                sx={{ width: 24, height: 24 }}
              />
            }
          >
            Profile
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;