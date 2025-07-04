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
  DialogContentText,
  DialogActions,
  Fab,
  Tooltip,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import GroupChat from './GroupChat';

const GroupContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#f0f2f5',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative'
}));

const GroupItem = styled(ListItem)(({ theme }) => ({
  borderRadius: '8px',
  marginBottom: theme.spacing(1),
  '&:hover': {
    backgroundColor: '#e9edef'
  }
}));

const UnreadBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#25D366',
    color: 'white'
  }
}));

const GroupManagement = ({ socket }) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [groupProfilePhoto, setGroupProfilePhoto] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const fileInputRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Listen for new group messages to update unread counts
    socket.on('group message', ({ message, group }) => {
      if (message.sender._id !== currentUser.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [group]: (prev[group] || 0) + 1
        }));
      }
    });

    // Listen for group updates (new member, member left, etc.)
    socket.on('group updated', (updatedGroup) => {
      setGroups(prev => 
        prev.map(group => 
          group._id === updatedGroup._id ? updatedGroup : group
        )
      );
    });

    // Listen for new group creation
    socket.on('new group', (group) => {
      if (group.members.some(member => member.user._id === currentUser.id)) {
        setGroups(prev => [...prev, group]);
      }
    });

    return () => {
      socket.off('group message');
      socket.off('group updated');
      socket.off('new group');
    };
  }, [socket, currentUser.id]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'http://localhost:5000/api/groups',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setGroups(response.data);
      
      // Fetch unread counts for each group
      response.data.forEach(group => {
        fetchUnreadCount(group._id);
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setLoading(false);
    }
  };

  const fetchUnreadCount = async (groupId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/groups/${groupId}/messages/unread`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setUnreadCounts(prev => ({
        ...prev,
        [groupId]: response.data.count
      }));
    } catch (err) {
      console.error(`Error fetching unread count for group ${groupId}:`, err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const formData = new FormData();
      formData.append('name', newGroupName);
      formData.append('description', newGroupDescription);
      if (groupProfilePhoto) {
        formData.append('profilePhoto', groupProfilePhoto);
      }

      const response = await axios.post(
        'http://localhost:5000/api/groups',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setGroups(prev => [...prev, response.data]);
      
      // Emit socket event for new group creation
      if (socket) {
        socket.emit('new group', response.data);
      }
      
      handleCloseCreateDialog();
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  const handleSearchGroups = async () => {
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/groups/search?term=${searchTerm}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Filter out groups the user is already a member of
      const userGroupIds = groups.map(group => group._id);
      const filteredResults = response.data.filter(group => !userGroupIds.includes(group._id));
      
      setSearchResults(filteredResults);
      setLoading(false);
    } catch (err) {
      console.error('Error searching groups:', err);
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const response = await axios.post(
        `http://localhost:5000/api/groups/${groupId}/join`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Add the joined group to the list
      setGroups(prev => [...prev, response.data]);
      
      // Close the search dialog
      setSearchDialogOpen(false);
      setSearchTerm('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error joining group:', err);
    }
  };

  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    
    // Reset unread count for this group
    setUnreadCounts(prev => ({
      ...prev,
      [group._id]: 0
    }));
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
    // Refresh groups to get updated information
    fetchGroups();
  };

  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setGroupProfilePhoto(null);
  };

  const handleOpenSearchDialog = () => {
    setSearchDialogOpen(true);
  };

  const handleCloseSearchDialog = () => {
    setSearchDialogOpen(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleProfilePhotoSelect = () => {
    fileInputRef.current.click();
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGroupProfilePhoto(file);
    }
  };

  // If a group is selected, show the group chat
  if (selectedGroup) {
    return <GroupChat selectedGroup={selectedGroup} socket={socket} onBack={handleBackToGroups} />;
  }

  return (
    <GroupContainer>
      <Box sx={{ p: 2, backgroundColor: '#075e54', color: 'white' }}>
        <Typography variant="h6">Groups</Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
          {groups.length > 0 ? (
            <List>
              {groups.map((group) => (
                <GroupItem
                  key={group._id}
                  button
                  onClick={() => handleGroupSelect(group)}
                >
                  <ListItemAvatar>
                    <UnreadBadge badgeContent={unreadCounts[group._id] || 0} max={99}>
                      <Avatar src={group.profilePhoto}>
                        <GroupIcon />
                      </Avatar>
                    </UnreadBadge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={group.name}
                    secondary={`${group.members.length} members`}
                  />
                </GroupItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography variant="body1" color="textSecondary">
                You are not a member of any groups yet.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateDialog}
                sx={{ mt: 2 }}
              >
                Create a Group
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<SearchIcon />}
                onClick={handleOpenSearchDialog}
                sx={{ mt: 2, ml: 2 }}
              >
                Find Groups
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Floating action buttons */}
      {groups.length > 0 && (
        <Box sx={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column' }}>
          <Tooltip title="Find Groups">
            <Fab
              color="primary"
              size="medium"
              onClick={handleOpenSearchDialog}
              sx={{ mb: 1 }}
            >
              <SearchIcon />
            </Fab>
          </Tooltip>
          <Tooltip title="Create Group">
            <Fab
              color="primary"
              onClick={handleOpenCreateDialog}
            >
              <AddIcon />
            </Fab>
          </Tooltip>
        </Box>
      )}

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <Avatar
              src={groupProfilePhoto ? URL.createObjectURL(groupProfilePhoto) : ''}
              sx={{ width: 80, height: 80, mb: 1, cursor: 'pointer' }}
              onClick={handleProfilePhotoSelect}
            >
              <GroupIcon fontSize="large" />
            </Avatar>
            <Typography variant="caption" color="textSecondary">
              Click to add group photo
            </Typography>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleProfilePhotoChange}
            />
          </Box>
          
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="Group Description (Optional)"
            fullWidth
            variant="outlined"
            value={newGroupDescription}
            onChange={(e) => setNewGroupDescription(e.target.value)}
            multiline
            rows={3}
          />
          <DialogContentText sx={{ mt: 2, fontSize: '0.875rem' }}>
            You will be the admin of this group. You can add up to 50 members.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            color="primary"
            disabled={!newGroupName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Search Groups Dialog */}
      <Dialog open={searchDialogOpen} onClose={handleCloseSearchDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Find Groups</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search groups by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchGroups()}
              size="small"
              sx={{ mr: 1 }}
            />
            <Button
              variant="contained"
              onClick={handleSearchGroups}
              startIcon={<SearchIcon />}
            >
              Search
            </Button>
          </Box>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List>
              {searchResults.length > 0 ? (
                searchResults.map((group) => (
                  <ListItem
                    key={group._id}
                    secondaryAction={
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleJoinGroup(group._id)}
                      >
                        Join
                      </Button>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar src={group.profilePhoto}>
                        <GroupIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={group.name}
                      secondary={`${group.members.length} members`}
                    />
                  </ListItem>
                ))
              ) : searchTerm ? (
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    No groups found matching your search.
                  </Typography>
                </Box>
              ) : null}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSearchDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </GroupContainer>
  );
};

export default GroupManagement;