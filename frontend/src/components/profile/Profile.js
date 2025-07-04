import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Avatar,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Tab,
  Tabs
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import UserInfo from './UserInfo';
import axios from 'axios';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      setFormData({
        username: response.data.username,
        email: response.data.email
      });
      setFriendRequests(response.data.friendRequests.filter(req => req.status === 'pending'));
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/users/search?q=${searchQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSearchResults(response.data);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await axios.post(
        `http://localhost:5000/api/users/friend-request/${userId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setSearchResults(prev =>
        prev.map(user =>
          user._id === userId
            ? { ...user, requestSent: true }
            : user
        )
      );
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  const handleFriendRequest = async (requestId, status) => {
    try {
      await axios.patch(
        `http://localhost:5000/api/users/friend-request/${requestId}`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchUserProfile();
    } catch (err) {
      console.error('Error handling friend request:', err);
    }
  };

  const handlePhotoUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('profilePhoto', file);

      const response = await axios.post(
        'http://localhost:5000/api/users/profile/photo',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setUser(prev => ({ ...prev, profilePhoto: response.data.profilePhoto }));
    } catch (err) {
      console.error('Error uploading profile photo:', err);
    }
  };

  const handleDeletePhoto = async () => {
    try {
      const response = await axios.delete(
        'http://localhost:5000/api/users/profile/photo',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setUser(prev => ({ ...prev, profilePhoto: response.data.profilePhoto }));
    } catch (err) {
      console.error('Error deleting profile photo:', err);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await axios.patch(
        'http://localhost:5000/api/users/profile',
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setEditMode(false);
      fetchUserProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  if (!user) return null;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'relative' }}>
            <Avatar
              src={`http://localhost:5000${user.profilePhoto}`}
              sx={{ width: 100, height: 100, mr: 3 }}
            />
            {user.profilePhoto !== '/uploads/profiles/default.svg' && (
              <IconButton
                size="small"
                sx={{
                  position: 'absolute',
                  top: -10,
                  right: 14,
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'grey.200' }
                }}
                onClick={handleDeletePhoto}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="profile-photo-upload"
              type="file"
              onChange={handlePhotoUpload}
            />
            <label htmlFor="profile-photo-upload">
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 24,
                  backgroundColor: 'white',
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
                component="span"
              >
                <PhotoCamera />
              </IconButton>
            </label>
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            {editMode ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
                <TextField
                  label="Email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleUpdateProfile}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            ) : (
              <>
                <Typography variant="h5">{user.username}</Typography>
                <Typography color="textSecondary">{user.email}</Typography>
                <Button
                  variant="outlined"
                  sx={{ mt: 1 }}
                  onClick={() => setEditMode(true)}
                >
                  Edit Profile
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab label="Profile Info" />
        <Tab label="Find Friends" />
        <Tab
          label={`Friend Requests (${friendRequests.length})`}
        />
      </Tabs>

      {tabValue === 0 ? (
        <UserInfo />
      ) : tabValue === 1 ? (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <IconButton onClick={handleSearch}>
              <SearchIcon />
            </IconButton>
          </Box>
          <List>
            {searchResults.map((result) => (
              <ListItem key={result._id}>
                <ListItemAvatar>
                  <Avatar src={`http://localhost:5000${result.profilePhoto}`} />
                </ListItemAvatar>
                <ListItemText
                  primary={result.username}
                  secondary={result.email}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={result.requestSent}
                    onClick={() => handleSendFriendRequest(result._id)}
                  >
                    {result.requestSent ? 'Request Sent' : 'Add Friend'}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : (
        <Paper sx={{ p: 2 }}>
          <List>
            {friendRequests.map((request) => (
              <ListItem key={request._id}>
                <ListItemAvatar>
                  <Avatar
                    src={`http://localhost:5000${request.from.profilePhoto}`}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={request.from.username}
                  secondary={request.from.email}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    color="primary"
                    onClick={() =>
                      handleFriendRequest(request._id, 'accepted')
                    }
                  >
                    <CheckIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() =>
                      handleFriendRequest(request._id, 'rejected')
                    }
                  >
                    <CloseIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Container>
  );
};

export default Profile;