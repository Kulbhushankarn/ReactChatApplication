import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  IconButton,
  Typography,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { io } from 'socket.io-client';
import axios from 'axios';

const Chat = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    newSocket.emit('join', currentUser.id);
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('private message', ({ message, from }) => {
        if (selectedUser && (from === selectedUser._id || from === currentUser.id)) {
          setMessages(prev => [...prev, message]);
        }
      });
    }
  }, [socket, selectedUser]);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/users/friends', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFriends(response.data);
      } catch (err) {
        console.error('Error fetching friends:', err);
      }
    };

    fetchFriends();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    }
  }, [selectedUser]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/messages/${selectedUser._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessages(response.data);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage && !attachment) || !selectedUser) return;

    try {
      const formData = new FormData();
      formData.append('content', newMessage);
      if (attachment) {
        formData.append('attachment', attachment);
        formData.append('messageType', attachment.type.startsWith('image/') ? 'image' :
          attachment.type.startsWith('video/') ? 'video' : 'document');
      } else {
        formData.append('messageType', 'text');
      }

      const response = await axios.post(
        `http://localhost:5000/api/messages/${selectedUser._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      socket.emit('private message', {
        to: selectedUser._id,
        message: response.data,
        from: currentUser.id
      });

      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      setAttachment(null);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleAttachment = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', p: 2 }}>
      <Grid container spacing={2} sx={{ height: 'calc(100% - 16px)' }}>
        <Grid item xs={3}>
          <Paper sx={{ height: '100%', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ p: 2 }}>
              Friends
            </Typography>
            <Divider />
            <List>
              {friends.map((friend) => (
                <ListItem
                  button
                  key={friend._id}
                  selected={selectedUser?._id === friend._id}
                  onClick={() => setSelectedUser(friend)}
                >
                  <ListItemAvatar>
                    <Avatar src={`http://localhost:5000${friend.profilePhoto}`} />
                  </ListItemAvatar>
                  <ListItemText primary={friend.username} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={9}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {selectedUser ? (
              <>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="h6">
                    {selectedUser.username}
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                  {messages.map((message) => (
                    <Box
                      key={message._id}
                      sx={{
                        display: 'flex',
                        justifyContent: message.sender === currentUser.id ? 'flex-end' : 'flex-start',
                        mb: 2
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '70%',
                          p: 2,
                          bgcolor: message.sender === currentUser.id ? 'primary.main' : 'grey.200',
                          color: message.sender === currentUser.id ? 'white' : 'black',
                          borderRadius: 2
                        }}
                      >
                        {message.messageType === 'text' ? (
                          <Typography>{message.content}</Typography>
                        ) : message.messageType === 'image' ? (
                          <img
                            src={`http://localhost:5000${message.attachmentUrl}`}
                            alt="attachment"
                            style={{ maxWidth: '100%', borderRadius: 4 }}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AttachFileIcon />
                            <a
                              href={`http://localhost:5000${message.attachmentUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'inherit' }}
                            >
                              {message.content}
                            </a>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))}
                  <div ref={messageEndRef} />
                </Box>
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleAttachment}
                    />
                    <IconButton
                      color="primary"
                      onClick={() => fileInputRef.current.click()}
                    >
                      <AttachFileIcon />
                    </IconButton>
                    <TextField
                      fullWidth
                      placeholder="Type a message"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <IconButton color="primary" onClick={handleSendMessage}>
                      <SendIcon />
                    </IconButton>
                  </Box>
                  {attachment && (
                    <Typography variant="caption" sx={{ mt: 1 }}>
                      Attached: {attachment.name}
                    </Typography>
                  )}
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="h6" color="textSecondary">
                  Select a friend to start chatting
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Chat;