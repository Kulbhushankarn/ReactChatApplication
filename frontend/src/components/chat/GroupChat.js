import React, { useState, useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
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
  Menu,
  MenuItem,
  ListItemIcon,
  CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import EditIcon from '@mui/icons-material/Edit';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import axios from 'axios';

const ChatContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#f0f2f5',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column'
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

const GroupChat = ({ selectedGroup, socket, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachMenu, setAttachMenu] = useState(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [groupDetailsOpen, setGroupDetailsOpen] = useState(false);
  const [groupMenuAnchor, setGroupMenuAnchor] = useState(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (selectedGroup && socket) {
      // Join the group chat room
      socket.emit('join group', selectedGroup._id);
      
      // Fetch messages
      fetchMessages();
      
      return () => {
        // Leave the group chat room when component unmounts
        socket.emit('leave group', selectedGroup._id);
      };
    }
  }, [selectedGroup, socket]);

  useEffect(() => {
    if (!socket) return;

    // Listen for new group messages
    socket.on('group message', ({ message, group }) => {
      if (selectedGroup && group === selectedGroup._id) {
        setMessages(prev => [...prev, message]);
      }
    });

    // Listen for deleted group messages
    socket.on('group message deleted', ({ messageId, group }) => {
      if (selectedGroup && group === selectedGroup._id) {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      }
    });

    return () => {
      socket.off('group message');
      socket.off('group message deleted');
    };
  }, [socket, selectedGroup]);

  useEffect(() => {
    // Only auto-scroll to bottom for new messages (not when loading older messages)
    if (!messagePagination.loading || messagePagination.page === 0) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (messageContainerRef.current) {
      // Maintain scroll position when loading older messages
      const newScrollHeight = messageContainerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      messageContainerRef.current.scrollTop = scrollDiff;
    }
  }, [messages, messagePagination.loading]);
  
  // Save previous scroll height before updating messages
  useEffect(() => {
    if (messagePagination.loading && messagePagination.page > 0 && messageContainerRef.current) {
      prevScrollHeightRef.current = messageContainerRef.current.scrollHeight;
    }
  }, [messagePagination.loading, messagePagination.page]);
  
  // Add scroll event listener for infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!messageContainerRef.current) return;
      
      const { scrollTop } = messageContainerRef.current;
      
      // Load more messages when scrolled near the top (20px threshold)
      if (scrollTop < 20 && !messagePagination.loading && messagePagination.hasMore) {
        loadMoreMessages();
      }
    };
    
    const messageContainer = messageContainerRef.current;
    if (messageContainer) {
      messageContainer.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (messageContainer) {
        messageContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [messagePagination.loading, messagePagination.hasMore]);

  const [messagePagination, setMessagePagination] = useState({
    page: 0,
    limit: 50,
    total: 0,
    pages: 0,
    loading: false,
    hasMore: true
  });
  
  const fetchMessages = async (page = 0, append = false) => {
    try {
      setMessagePagination(prev => ({ ...prev, loading: true }));
      
      const response = await axios.get(
        `http://localhost:5000/api/groups/${selectedGroup._id}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { page, limit: messagePagination.limit }
        }
      );
      
      const { messages: newMessages, pagination } = response.data;
      
      // Update messages state
      if (append) {
        setMessages(prev => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }
      
      // Update pagination state
      setMessagePagination({
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: pagination.pages,
        loading: false,
        hasMore: pagination.page < pagination.pages - 1
      });
      
      // Mark messages as read
      newMessages.forEach(message => {
        if (!message.readBy.some(read => read.user === currentUser.id)) {
          markMessageAsRead(message._id);
        }
      });
    } catch (err) {
      console.error('Error fetching group messages:', err);
      setMessagePagination(prev => ({ ...prev, loading: false }));
    }
  };
  
  const loadMoreMessages = () => {
    if (messagePagination.loading || !messagePagination.hasMore) return;
    fetchMessages(messagePagination.page + 1, true);
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await axios.patch(
        `http://localhost:5000/api/groups/${selectedGroup._id}/messages/${messageId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (err) {
      console.error('Error marking message as read:', err);
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

  const handleDeleteMessage = async () => {
    try {
      await axios.delete(
        `http://localhost:5000/api/groups/${selectedGroup._id}/messages/${selectedMessageId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessages(prev => prev.filter(msg => msg._id !== selectedMessageId));
      
      // Emit socket event for message deletion
      if (socket) {
        socket.emit('group message deleted', {
          messageId: selectedMessageId,
          groupId: selectedGroup._id
        });
      }
      
      handleMessageMenuClose();
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage && !attachment) || !selectedGroup) return;

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
        `http://localhost:5000/api/groups/${selectedGroup._id}/messages`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Add the message to the local state immediately for better UX
      setMessages(prev => [...prev, response.data]);
      
      // Emit to socket for other group members
      if (socket) {
        socket.emit('group message', {
          groupId: selectedGroup._id,
          message: response.data
        });
      }

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

  const handleGroupMenuOpen = (event) => {
    setGroupMenuAnchor(event.currentTarget);
  };

  const handleGroupMenuClose = () => {
    setGroupMenuAnchor(null);
  };

  const handleOpenGroupDetails = () => {
    setGroupDetailsOpen(true);
    handleGroupMenuClose();
  };

  const handleCloseGroupDetails = () => {
    setGroupDetailsOpen(false);
  };

  const handleOpenAddMemberDialog = () => {
    setAddMemberDialogOpen(true);
    handleGroupMenuClose();
  };

  const handleCloseAddMemberDialog = () => {
    setAddMemberDialogOpen(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleSearchUsers = async () => {
    if (!searchTerm) return;
    
    try {
      const response = await axios.get(
        `http://localhost:5000/api/users/search?term=${searchTerm}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Filter out users who are already members
      const memberIds = selectedGroup.members.map(member => member.user._id);
      const filteredResults = response.data.filter(user => !memberIds.includes(user._id));
      
      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      const response = await axios.post(
        `http://localhost:5000/api/groups/${selectedGroup._id}/members`,
        { userId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update the selected group with the new member
      // This would typically be handled by the parent component
      // that manages the selectedGroup state
      
      handleCloseAddMemberDialog();
    } catch (err) {
      console.error('Error adding member:', err);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await axios.delete(
        `http://localhost:5000/api/groups/${selectedGroup._id}/members/${currentUser.id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Navigate back to the group list
      onBack();
    } catch (err) {
      console.error('Error leaving group:', err);
    }
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
    }
    
    // For yesterday's messages, show "Yesterday" with time
    if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    }
    
    // For older messages, show date with time
    return format(date, 'MMM d, yyyy h:mm a');
  };

  // Get full timestamp for tooltip
  const getFullTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return format(new Date(timestamp), 'EEEE, MMMM d, yyyy h:mm a');
  };

  // Check if the current user is an admin of the group
  const isAdmin = selectedGroup?.members.some(
    member => member.user._id === currentUser.id && member.role === 'admin'
  );

  return (
    <ChatContainer>
      {/* Group Header */}
      <Box sx={{ p: 2, backgroundColor: '#075e54', color: 'white', display: 'flex', alignItems: 'center' }}>
        <IconButton color="inherit" onClick={onBack}>
          <Box sx={{ transform: 'rotate(180deg)' }}>
            <SendIcon />
          </Box>
        </IconButton>
        <Avatar src={selectedGroup?.profilePhoto} sx={{ mr: 2 }}>
          <GroupIcon />
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6">{selectedGroup?.name}</Typography>
          <Typography variant="caption">
            {selectedGroup?.members.length} members
          </Typography>
        </Box>
        <IconButton color="inherit" onClick={handleGroupMenuOpen}>
          <MoreVertIcon />
        </IconButton>
        
        {/* Group Menu */}
        <Menu
          anchorEl={groupMenuAnchor}
          open={Boolean(groupMenuAnchor)}
          onClose={handleGroupMenuClose}
        >
          <MenuItem onClick={handleOpenGroupDetails}>
            <ListItemIcon>
              <GroupIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Group Info" />
          </MenuItem>
          {isAdmin && (
            <MenuItem onClick={handleOpenAddMemberDialog}>
              <ListItemIcon>
                <PersonAddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Add Member" />
            </MenuItem>
          )}
          <MenuItem onClick={handleLeaveGroup}>
            <ListItemIcon>
              <ExitToAppIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Leave Group" />
          </MenuItem>
        </Menu>
      </Box>

      {/* Messages Area */}
      <Box ref={messageContainerRef} sx={{ flexGrow: 1, p: 2, overflowY: 'auto', position: 'relative' }}>
        {messagePagination.loading && messagePagination.page > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {messages.map((message) => {
          const isCurrentUser = message.sender._id === currentUser.id;
          return (
            <Box
              key={message._id}
              sx={{
                display: 'flex',
                justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                mb: 2
              }}
            >
              {!isCurrentUser && (
                <Avatar
                  src={message.sender.profilePhoto}
                  sx={{ mr: 1, width: 32, height: 32 }}
                />
              )}
              <Box>
                {!isCurrentUser && (
                  <Typography variant="caption" sx={{ ml: 1, color: '#888' }}>
                    {message.sender.username}
                  </Typography>
                )}
                <MessageBubble isCurrentUser={isCurrentUser}>
                  {message.messageType === 'text' && (
                    <Typography variant="body1">{message.content}</Typography>
                  )}
                  {message.messageType === 'image' && (
                    <Box>
                      <img
                        src={`http://localhost:5000${message.attachmentUrl}`}
                        alt="Attachment"
                        style={{ maxWidth: '100%', borderRadius: '4px' }}
                        loading="lazy"
                      />
                      {message.content && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {message.content}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {(message.messageType === 'video' || message.messageType === 'document') && (
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          p: 1,
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          backgroundColor: '#f5f5f5'
                        }}
                      >
                        {message.messageType === 'video' ? (
                          <VideocamIcon sx={{ mr: 1 }} />
                        ) : (
                          <InsertDriveFileIcon sx={{ mr: 1 }} />
                        )}
                        <Box>
                          <Typography variant="body2">
                            {message.attachmentUrl.split('/').pop()}
                          </Typography>
                          <Button
                            size="small"
                            href={`http://localhost:5000${message.attachmentUrl}`}
                            target="_blank"
                            download
                          >
                            Download
                          </Button>
                        </Box>
                      </Box>
                      {message.content && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {message.content}
                        </Typography>
                      )}
                    </Box>
                  )}
                  <Tooltip title={getFullTimestamp(message.createdAt)} placement="left">
                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, color: '#888' }}>
                      {formatMessageTime(message.createdAt)}
                    </Typography>
                  </Tooltip>
                  {isCurrentUser && (
                    <MessageActions className="message-actions">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMessageMenuOpen(e, message._id)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </MessageActions>
                  )}
                </MessageBubble>
              </Box>
            </Box>
          );
        })}
        <div ref={messageEndRef} />
      </Box>

      {/* Message Input Area */}
      <Box sx={{ p: 2, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={handleAttachmentClick}>
          <AttachFileIcon />
        </IconButton>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type a message"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          size="small"
          sx={{ mx: 1 }}
        />
        <IconButton color="primary" onClick={handleSendMessage}>
          <SendIcon />
        </IconButton>

        {/* Attachment Menu */}
        <Menu
          anchorEl={attachMenu}
          open={Boolean(attachMenu)}
          onClose={handleAttachmentMenuClose}
        >
          <MenuItem onClick={() => handleAttachmentSelect('image/*')}>
            <ListItemIcon>
              <ImageIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Image" />
          </MenuItem>
          <MenuItem onClick={() => handleAttachmentSelect('video/*')}>
            <ListItemIcon>
              <VideocamIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Video" />
          </MenuItem>
          <MenuItem onClick={() => handleAttachmentSelect('*/*')}>
            <ListItemIcon>
              <InsertDriveFileIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Document" />
          </MenuItem>
        </Menu>

        {/* Message Actions Menu */}
        <Menu
          anchorEl={messageMenuAnchor}
          open={Boolean(messageMenuAnchor)}
          onClose={handleMessageMenuClose}
        >
          <MenuItem onClick={handleDeleteMessage}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Delete" />
          </MenuItem>
        </Menu>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleAttachment}
        />
      </Box>

      {/* Group Details Dialog */}
      <Dialog open={groupDetailsOpen} onClose={handleCloseGroupDetails} maxWidth="sm" fullWidth>
        <DialogTitle>Group Info</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <Avatar
              src={selectedGroup?.profilePhoto}
              sx={{ width: 80, height: 80, mb: 1 }}
            >
              <GroupIcon fontSize="large" />
            </Avatar>
            <Typography variant="h6">{selectedGroup?.name}</Typography>
            {selectedGroup?.description && (
              <Typography variant="body2" color="textSecondary" align="center">
                {selectedGroup.description}
              </Typography>
            )}
          </Box>
          
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            {selectedGroup?.members.length} Members
          </Typography>
          
          <List>
            {selectedGroup?.members.map((member) => (
              <ListItem key={member.user._id}>
                <ListItemAvatar>
                  <Avatar src={member.user.profilePhoto} />
                </ListItemAvatar>
                <ListItemText
                  primary={member.user.username}
                  secondary={
                    member.role === 'admin' ? 'Admin' : 
                    member.user._id === selectedGroup.creator ? 'Creator' : ''
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGroupDetails}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onClose={handleCloseAddMemberDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Member</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search users"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ mr: 1 }}
            />
            <Button variant="contained" onClick={handleSearchUsers}>
              Search
            </Button>
          </Box>
          
          <List>
            {searchResults.map((user) => (
              <ListItem key={user._id}>
                <ListItemAvatar>
                  <Avatar src={user.profilePhoto} />
                </ListItemAvatar>
                <ListItemText primary={user.username} />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleAddMember(user._id)}
                >
                  Add
                </Button>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddMemberDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </ChatContainer>
  );
};

export default GroupChat;