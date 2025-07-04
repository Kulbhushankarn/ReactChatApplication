import React, { useState, useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';
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
  Divider,
  Badge,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import { io } from 'socket.io-client';
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import GroupManagement from './GroupManagement';

const ChatContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#f0f2f5',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column'
}));

const MessageContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  backgroundColor: '#f0f2f5',
  position: 'relative'
}));

const MessageBubble = styled(Box)(({ theme, isCurrentUser }) => ({
  maxWidth: '70%',
  padding: theme.spacing(1.5),
  borderRadius: '8px',
  backgroundColor: isCurrentUser ? '#dcf8c6' : '#ffffff',
  boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
  position: 'relative',
  '&:hover .message-actions': {
    display: 'block'
  }
}));

const MessageActions = styled(Box)({
  display: 'none',
  position: 'absolute',
  top: '-20px',
  right: '0',
  backgroundColor: '#fff',
  borderRadius: '4px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
});

// Online status badge styling
const OnlineBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const OfflineBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#bdbdbd',
    color: '#bdbdbd',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
  },
}));

const Chat = () => {
  const location = useLocation();
  const [selectedUser, setSelectedUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messagePagination, setMessagePagination] = useState({
    page: 0,
    limit: 50,
    total: 0,
    pages: 0,
    loading: false,
    hasMore: true
  });
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [attachMenu, setAttachMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUserDetailsOpen, setSelectedUserDetailsOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const messageEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const fileInputRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    newSocket.emit('join', currentUser.id);
    setSocket(newSocket);
    
    // Request online users list
    newSocket.emit('get_online_users');

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on('private message', ({ message, from, to }) => {
      // Only add message if it belongs to the current chat and it's not from the current user
      if (
        selectedUser &&
        (from === selectedUser._id || to === selectedUser._id) &&
        from !== currentUser.id // Don't add messages from the current user (already added)
      ) {
        // Make sure the message has the correct sender information
        const messageWithSender = {
          ...message,
          sender: {
            _id: from,
            profilePhoto: selectedUser.profilePhoto
          }
        };
        setMessages(prev => [...prev, messageWithSender]);
      }
    });

    // Listen for deleted messages
    socket.on('message deleted', ({ messageId, from, to }) => {
      if (
        selectedUser &&
        (from === selectedUser._id || to === selectedUser._id)
      ) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      }
    });
    
    // Listen for online users
    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });
    
    // Listen for user status changes
    socket.on('user_status_change', ({ userId, status }) => {
      if (status === 'online') {
        setOnlineUsers(prev => [...prev.filter(id => id !== userId), userId]);
      } else {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
      }
    });

    return () => {
      socket.off('private message');
      socket.off('message deleted');
      socket.off('online_users');
      socket.off('user_status_change');
    };
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
    // Save current scroll height before adding new messages
    if (messageContainerRef.current) {
      prevScrollHeightRef.current = messageContainerRef.current.scrollHeight;
    }
  }, [messagePagination.loading]);
  
  useEffect(() => {
    const messageContainer = messageContainerRef.current;
    if (!messageContainer) return;
    
    // If we're loading more messages (appending), maintain scroll position
    if (messagePagination.page > 0) {
      const newScrollHeight = messageContainer.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      messageContainer.scrollTop = scrollDiff;
    } else {
      // For initial load or new conversation, scroll to bottom
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Add scroll event listener for infinite scrolling
  useEffect(() => {
    const messageContainer = messageContainerRef.current;
    if (!messageContainer) return;
    
    const handleScroll = () => {
      // If user scrolls near the top (20px threshold), load more messages
      if (messageContainer.scrollTop < 20 && !messagePagination.loading && messagePagination.hasMore) {
        loadMoreMessages();
      }
    };
    
    messageContainer.addEventListener('scroll', handleScroll);
    return () => messageContainer.removeEventListener('scroll', handleScroll);
  }, [messagePagination.loading, messagePagination.hasMore]);

  const fetchMessages = async (page = 0, append = false) => {
    if (!selectedUser || (messagePagination.loading && !append)) return;
    
    try {
      setMessagePagination(prev => ({ ...prev, loading: true }));
      
      const response = await axios.get(
        `http://localhost:5000/api/messages/${selectedUser._id}?page=${page}&limit=${messagePagination.limit}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const { messages: newMessages, pagination } = response.data;
      
      setMessagePagination(prev => ({
        ...prev,
        page: pagination.page,
        total: pagination.total,
        pages: pagination.pages,
        loading: false,
        hasMore: pagination.page < pagination.pages - 1
      }));
      
      if (append) {
        setMessages(prev => [...prev, ...newMessages]);
      } else {
        setMessages(newMessages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setMessagePagination(prev => ({ ...prev, loading: false }));
    }
  };
  
  const loadMoreMessages = () => {
    if (messagePagination.hasMore && !messagePagination.loading) {
      fetchMessages(messagePagination.page + 1, true);
    }
  };

  const handleMessageMenuOpen = (event, messageId) => {
    event.stopPropagation();
    setMessageMenuAnchor(event.currentTarget);
    setSelectedMessageId(messageId);
  };

  const handleMessageMenuClose = () => {
    setMessageMenuAnchor(null);
    setSelectedMessageId(null);
  };

  const handleDeleteMessage = async (deleteForEveryone = false) => {
    try {
      await axios.delete(
        `http://localhost:5000/api/messages/${selectedMessageId}?deleteForEveryone=${deleteForEveryone}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessages(prev => prev.filter(msg => msg._id !== selectedMessageId));
      if (deleteForEveryone && socket) {
        // Notify the other user to remove the message
        socket.emit('message deleted', {
          messageId: selectedMessageId,
          to: selectedUser._id,
          from: currentUser.id
        });
      }
      handleMessageMenuClose();
      setSelectedMessage(null);
    } catch (err) {
      console.error('Error deleting message:', err);
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

      // Add the message to the local state immediately for better UX
      const messageWithSender = {
        ...response.data,
        sender: {
          _id: currentUser.id,
          profilePhoto: currentUser.profilePhoto || ''
        }
      };
      setMessages(prev => [...prev, messageWithSender]);
      
      // Emit to socket for the receiver
      socket.emit('private message', {
        to: selectedUser._id,
        message: response.data,
        from: currentUser.id
      });

      setNewMessage('');
      setAttachment(null);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleAttachmentClick = (event) => {
    setAttachMenu(event.currentTarget);
  };

  const handleAttachmentMenuClose = () => {
    setAttachMenu(null);
  };

  const handleAttachmentSelect = (type) => {
    fileInputRef.current.accept = type;
    fileInputRef.current.click();
    handleAttachmentMenuClose();
  };

  const handleAttachment = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
    }
  };

  const handleOpenUserDetails = () => {
    setUserDetailsOpen(true);
  };

  const handleCloseUserDetails = () => {
    setUserDetailsOpen(false);
  };
  
  const handleOpenSelectedUserDetails = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await axios.get(
        `http://localhost:5000/api/users/details/${selectedUser._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSelectedUserDetails(response.data);
      setSelectedUserDetailsOpen(true);
    } catch (err) {
      console.error('Error fetching user details:', err);
    }
  };

  const handleCloseSelectedUserDetails = () => {
    setSelectedUserDetailsOpen(false);
  };
  
  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };
  
  // Format message time to show relative time or exact time
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // For messages less than 1 minute old
    const secondsAgo = Math.floor((now - date) / 1000);
    if (secondsAgo < 60) {
      return 'Just now';
    }
    
    // For messages less than 1 hour old, show minutes ago
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) {
      return `${minutesAgo} ${minutesAgo === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    // For messages less than 5 hours old, show hours ago
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 5) {
      return `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // For today's messages older than 5 hours, show time
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      // For yesterday's messages
      return 'Yesterday ' + format(date, 'h:mm a');
    } else if (now.getFullYear() === date.getFullYear()) {
      // For messages from this year
      return format(date, 'MMM d, h:mm a');
    } else {
      // For older messages
      return format(date, 'MMM d, yyyy, h:mm a');
    }
  };
  
  // Get tooltip text with full date and time
  const getFullTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return format(date, 'MMMM d, yyyy, h:mm:ss a');
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <ChatContainer>
      {/* Current User Info Bar */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 1, 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: '#f5f5f5'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isUserOnline(currentUser.id) ? (
            <OnlineBadge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              variant="dot"
            >
              <Avatar src={`http://localhost:5000${currentUser.profilePhoto}`} />
            </OnlineBadge>
          ) : (
            <OfflineBadge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              variant="dot"
            >
              <Avatar src={`http://localhost:5000${currentUser.profilePhoto}`} />
            </OfflineBadge>
          )}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {currentUser.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isUserOnline(currentUser.id) ? 'Online' : 'Offline'}
            </Typography>
          </Box>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<PersonIcon />} 
          size="small"
          onClick={handleOpenUserDetails}
        >
          View Profile
        </Button>
      </Box>
      
      <Grid container sx={{ height: 'calc(100% - 64px)' }}>
        {/* Sidebar */}
        <Grid item xs={3} sx={{ borderRight: '1px solid #e0e0e0' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="chat tabs">
              <Tab icon={<PersonIcon />} label="Chats" />
              <Tab icon={<GroupIcon />} label="Groups" />
            </Tabs>
          </Box>
          
          {activeTab === 0 ? (
            <List sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 112px)' }}>
              {friends.map((friend) => {
                const isOnline = isUserOnline(friend._id);
                return (
                  <ListItem
                    button
                    key={friend._id}
                    selected={selectedUser && selectedUser._id === friend._id}
                    onClick={() => setSelectedUser(friend)}
                  >
                    <ListItemAvatar>
                      {isOnline ? (
                        <OnlineBadge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          variant="dot"
                        >
                          <Avatar src={`http://localhost:5000${friend.profilePhoto}`} />
                        </OnlineBadge>
                      ) : (
                        <OfflineBadge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          variant="dot"
                        >
                          <Avatar src={`http://localhost:5000${friend.profilePhoto}`} />
                        </OfflineBadge>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={friend.username}
                      secondary={isOnline ? 'Online' : 'Offline'}
                    />
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Box sx={{ height: 'calc(100vh - 112px)' }}>
              <GroupManagement socket={socket} />
            </Box>
          )}
        </Grid>
        <Grid item xs={9}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 0 && selectedUser ? (
              <>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box 
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                    onClick={handleOpenSelectedUserDetails}
                  >
                    {isUserOnline(selectedUser._id) ? (
                      <OnlineBadge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        variant="dot"
                      >
                        <Avatar src={`http://localhost:5000${selectedUser.profilePhoto}`} />
                      </OnlineBadge>
                    ) : (
                      <OfflineBadge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        variant="dot"
                      >
                        <Avatar src={`http://localhost:5000${selectedUser.profilePhoto}`} />
                      </OfflineBadge>
                    )}
                    <Box>
                      <Typography variant="h6">
                        {selectedUser.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {isUserOnline(selectedUser._id) ? 'Online' : 'Offline'}
                      </Typography>
                    </Box>
                  </Box>
                  <Button 
                    variant="outlined" 
                    startIcon={<PersonIcon />} 
                    size="small"
                    onClick={handleOpenSelectedUserDetails}
                  >
                    View User
                  </Button>
                </Box>
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }} ref={messageContainerRef}>
                  {messagePagination.loading && messagePagination.page > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                  {messages.map((message) => {
                     // Determine if the message is from the current user
                     const isCurrentUser = message.sender._id === currentUser.id;
                    return (
                      <Box
                        key={message._id}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                          mb: 2,
                          gap: 1,
                          px: 2
                        }}
                      >
                        {isCurrentUser && (
                          <Avatar
                            src={`http://localhost:5000${currentUser.profilePhoto}`}
                            sx={{ width: 32, height: 32 }}
                          />
                        )}
                        <MessageBubble
                          isCurrentUser={isCurrentUser}
                          onClick={(e) => handleMessageMenuOpen(e, message._id)}
                        >
                          {message.messageType === 'text' && (
                            <Box sx={{ position: 'relative' }}>
                              <Typography>{message.content}</Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Tooltip title={getFullTimestamp(message.createdAt)} placement="left" arrow>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5 }}>
                                    {formatMessageTime(message.createdAt)}
                                  </Typography>
                                </Tooltip>
                                <MessageActions className="message-actions">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleMessageMenuOpen(e, message._id)}
                                  >
                                    <MoreVertIcon fontSize="small" />
                                  </IconButton>
                                </MessageActions>
                              </Box>
                            </Box>
                          )}
                          {message.messageType === 'image' && (
                            <Box>
                              <img
                                src={`http://localhost:5000${message.attachmentUrl}`}
                                alt="attachment"
                                style={{ maxWidth: '100%', borderRadius: 4 }}
                                loading="lazy"
                              />
                              <Tooltip title={getFullTimestamp(message.createdAt)} placement="left" arrow>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
                                  {formatMessageTime(message.createdAt)}
                                </Typography>
                              </Tooltip>
                            </Box>
                          )}
                          {message.messageType !== 'text' && message.messageType !== 'image' && (
                            <Box>
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
                              <Tooltip title={getFullTimestamp(message.createdAt)} placement="left" arrow>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
                                  {formatMessageTime(message.createdAt)}
                                </Typography>
                              </Tooltip>
                            </Box>
                          )}
                        </MessageBubble>
                        {!isCurrentUser && (
                          <Avatar
                            src={`http://localhost:5000${message.sender.profilePhoto}`}
                            sx={{ width: 32, height: 32 }}
                          />
                        )}
                      </Box>
                    );
                  })}
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
                      onClick={handleAttachmentClick}
                    >
                      <AttachFileIcon />
                    </IconButton>
                    <Menu
                      anchorEl={attachMenu}
                      open={Boolean(attachMenu)}
                      onClose={handleAttachmentMenuClose}
                    >
                      <MenuItem onClick={() => handleAttachmentSelect('image/*')}>
                        <ListItemIcon>
                          <ImageIcon />
                        </ListItemIcon>
                        Photo
                      </MenuItem>
                      <MenuItem onClick={() => handleAttachmentSelect('video/*')}>
                        <ListItemIcon>
                          <VideocamIcon />
                        </ListItemIcon>
                        Video
                      </MenuItem>
                      <MenuItem onClick={() => handleAttachmentSelect('.doc,.docx,.pdf')}>
                        <ListItemIcon>
                          <InsertDriveFileIcon />
                        </ListItemIcon>
                        Document
                      </MenuItem>
                    </Menu>
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
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={handleMessageMenuClose}
      >
        <MenuItem onClick={() => handleDeleteMessage(false)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete for me
        </MenuItem>
        <MenuItem onClick={() => handleDeleteMessage(true)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete for everyone
        </MenuItem>
      </Menu>
      
      {/* Current User Details Dialog */}
      <Dialog open={userDetailsOpen} onClose={handleCloseUserDetails} maxWidth="sm" fullWidth>
        <DialogTitle>My Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar 
              src={`http://localhost:5000${currentUser.profilePhoto}`} 
              sx={{ width: 100, height: 100, mb: 2 }}
            />
            <Typography variant="h5">{currentUser.username}</Typography>
            <Typography variant="body1" color="text.secondary">{currentUser.email}</Typography>
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: isUserOnline(currentUser.id) ? '#44b700' : '#bdbdbd',
                  mr: 1
                }}
              />
              <Typography variant="body2">
                {isUserOnline(currentUser.id) ? 'Online' : 'Offline'}
              </Typography>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>Personal Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2">First Name</Typography>
              <Typography variant="body2">{currentUser.personalInfo?.firstName || 'Not provided'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Last Name</Typography>
              <Typography variant="body2">{currentUser.personalInfo?.lastName || 'Not provided'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Phone</Typography>
              <Typography variant="body2">{currentUser.personalInfo?.phoneNumber || 'Not provided'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Date of Birth</Typography>
              <Typography variant="body2">
                {currentUser.personalInfo?.dateOfBirth ? new Date(currentUser.personalInfo.dateOfBirth).toLocaleDateString() : 'Not provided'}
              </Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>Professional Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Designation</Typography>
              <Typography variant="body2">{currentUser.professionalInfo?.designation || 'Not provided'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2">Company</Typography>
              <Typography variant="body2">{currentUser.professionalInfo?.company || 'Not provided'}</Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUserDetails}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Selected User Details Dialog */}
      <Dialog open={selectedUserDetailsOpen} onClose={handleCloseSelectedUserDetails} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedUserDetails?.username}'s Profile</DialogTitle>
        <DialogContent>
          {selectedUserDetails && (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <Avatar 
                  src={`http://localhost:5000${selectedUserDetails.profilePhoto}`} 
                  sx={{ width: 100, height: 100, mb: 2 }}
                />
                <Typography variant="h5">{selectedUserDetails.username}</Typography>
                <Typography variant="body1" color="text.secondary">{selectedUserDetails.email}</Typography>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: isUserOnline(selectedUserDetails._id) ? '#44b700' : '#bdbdbd',
                      mr: 1
                    }}
                  />
                  <Typography variant="body2">
                    {isUserOnline(selectedUserDetails._id) ? 'Online' : 'Offline'}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>Personal Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">First Name</Typography>
                  <Typography variant="body2">{selectedUserDetails.personalInfo?.firstName || 'Not provided'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Last Name</Typography>
                  <Typography variant="body2">{selectedUserDetails.personalInfo?.lastName || 'Not provided'}</Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>Professional Information</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Designation</Typography>
                  <Typography variant="body2">{selectedUserDetails.professionalInfo?.designation || 'Not provided'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Company</Typography>
                  <Typography variant="body2">{selectedUserDetails.professionalInfo?.company || 'Not provided'}</Typography>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSelectedUserDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </ChatContainer>
  );
};

export default Chat;