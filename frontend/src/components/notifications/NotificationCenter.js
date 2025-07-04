import React, { useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Divider,
  Button,
  CircularProgress
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MessageIcon from '@mui/icons-material/Message';
import GroupIcon from '@mui/icons-material/Group';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { format, formatDistanceToNow } from 'date-fns';
import axios from 'axios';

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    right: -3,
    top: 3,
    backgroundColor: '#25D366',
    color: 'white',
  },
}));

const NotificationItem = styled(ListItem)(({ theme, isRead }) => ({
  backgroundColor: isRead ? 'transparent' : '#f0f9ff',
  '&:hover': {
    backgroundColor: '#f5f5f5',
  },
}));

const EmptyNotification = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
}));

const NotificationCenter = ({ socket, onNavigateToChat, onNavigateToGroup }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for new notifications
    socket.on('new notification', (notification) => {
      if (notification.recipient === currentUser.id) {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      socket.off('new notification');
    };
  }, [socket, currentUser.id]);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5000/api/notifications/unread/count',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setUnreadCount(response.data.count);
    } catch (err) {
      console.error('Error fetching unread notifications count:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'http://localhost:5000/api/notifications',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setNotifications(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setLoading(false);
    }
  };

  const handleOpenNotifications = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleCloseNotifications = () => {
    setAnchorEl(null);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.patch(
        'http://localhost:5000/api/notifications/read/all',
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        await axios.patch(
          `http://localhost:5000/api/notifications/${notification._id}/read`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n._id === notification._id ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    // Navigate based on notification type
    handleCloseNotifications();
    
    switch (notification.type) {
      case 'message':
      case 'friend_request':
        if (notification.sender) {
          onNavigateToChat(notification.sender);
        }
        break;
      case 'group_message':
      case 'group_invitation':
        if (notification.group) {
          onNavigateToGroup(notification.group);
        }
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <MessageIcon color="primary" />;
      case 'group_message':
      case 'group_invitation':
        return <GroupIcon color="primary" />;
      case 'friend_request':
        return <PersonAddIcon color="primary" />;
      default:
        return <NotificationsIcon color="primary" />;
    }
  };

  const getNotificationTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // If less than 24 hours ago, show relative time
    if (now - date < 24 * 60 * 60 * 1000) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    
    // Otherwise show date
    return format(date, 'MMM d, yyyy');
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton color="inherit" onClick={handleOpenNotifications}>
        <StyledBadge badgeContent={unreadCount} max={99}>
          <NotificationsIcon />
        </StyledBadge>
      </IconButton>
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleCloseNotifications}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 320, maxHeight: 500 }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {notifications.length > 0 && (
            <Button size="small" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </Box>
        
        <Divider />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length > 0 ? (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <React.Fragment key={notification._id}>
                <NotificationItem 
                  button 
                  isRead={notification.read}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <ListItemAvatar>
                    <Avatar>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body1" component="div" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                        {notification.content}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {getNotificationTime(notification.createdAt)}
                      </Typography>
                    }
                  />
                </NotificationItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <EmptyNotification>
            <NotificationsIcon sx={{ fontSize: 40, opacity: 0.5, mb: 1 }} />
            <Typography>No notifications</Typography>
          </EmptyNotification>
        )}
      </Popover>
    </>
  );
};

export default NotificationCenter;