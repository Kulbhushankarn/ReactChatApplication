import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  IconButton,
  Chip,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';

const UserInfo = () => {
  const [userData, setUserData] = useState({
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: null,
      phoneNumber: '',
      address: {
        street: '',
        city: '',
        state: '',
        pinCode: '',
        country: ''
      }
    },
    professionalInfo: {
      designation: '',
      company: '',
      education: []
    },
    interests: {
      hobbies: [],
      skills: [],
      languages: []
    }
  });

  const [newEducation, setNewEducation] = useState({
    institution: '',
    degree: '',
    field: '',
    startYear: '',
    endYear: '',
    type: 'university'
  });

  const [openEducationDialog, setOpenEducationDialog] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [interestType, setInterestType] = useState('hobbies');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Ensure the response data has the required structure
      const defaultData = {
        personalInfo: {
          firstName: '',
          lastName: '',
          dateOfBirth: null,
          phoneNumber: '',
          address: {
            street: '',
            city: '',
            state: '',
            pinCode: '',
            country: ''
          }
        },
        professionalInfo: {
          designation: '',
          company: '',
          education: []
        },
        interests: {
          hobbies: [],
          skills: [],
          languages: []
        }
      };

      // Merge the response data with default data
      const mergedData = {
        personalInfo: {
          ...defaultData.personalInfo,
          ...response.data.personalInfo,
          address: {
            ...defaultData.personalInfo.address,
            ...(response.data.personalInfo?.address || {})
          }
        },
        professionalInfo: {
          ...defaultData.professionalInfo,
          ...response.data.professionalInfo,
          education: response.data.professionalInfo?.education || []
        },
        interests: {
          ...defaultData.interests,
          ...response.data.interests
        }
      };

      setUserData(mergedData);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const handlePersonalInfoChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setUserData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          [parent]: {
            ...prev.personalInfo[parent],
            [child]: value
          }
        }
      }));
    } else {
      setUserData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          [name]: value
        }
      }));
    }
  };

  const handleProfessionalInfoChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      professionalInfo: {
        ...prev.professionalInfo,
        [name]: value
      }
    }));
  };

  const handleAddEducation = () => {
    setUserData(prev => ({
      ...prev,
      professionalInfo: {
        ...prev.professionalInfo,
        education: [...prev.professionalInfo.education, newEducation]
      }
    }));
    setNewEducation({
      institution: '',
      degree: '',
      field: '',
      startYear: '',
      endYear: '',
      type: 'university'
    });
    setOpenEducationDialog(false);
  };

  const handleRemoveEducation = (index) => {
    setUserData(prev => ({
      ...prev,
      professionalInfo: {
        ...prev.professionalInfo,
        education: prev.professionalInfo.education.filter((_, i) => i !== index)
      }
    }));
  };

  const handleAddInterest = () => {
    if (newInterest.trim()) {
      setUserData(prev => ({
        ...prev,
        interests: {
          ...prev.interests,
          [interestType]: [...prev.interests[interestType], newInterest.trim()]
        }
      }));
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (type, interest) => {
    setUserData(prev => ({
      ...prev,
      interests: {
        ...prev.interests,
        [type]: prev.interests[type].filter(item => item !== interest)
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      await axios.patch(
        'http://localhost:5000/api/users/profile',
        userData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Error updating profile');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Personal Information</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="First Name"
              name="firstName"
              value={userData.personalInfo.firstName}
              onChange={handlePersonalInfoChange}
              margin="normal"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Last Name"
              name="lastName"
              value={userData.personalInfo.lastName}
              onChange={handlePersonalInfoChange}
              margin="normal"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                value={userData.personalInfo.dateOfBirth || ''}
                onChange={(e) => setUserData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, dateOfBirth: e.target.value }
                }))}
                InputLabelProps={{ shrink: true }}
                margin="normal"
              />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Phone Number"
              name="phoneNumber"
              value={userData.personalInfo.phoneNumber}
              onChange={handlePersonalInfoChange}
              margin="normal"
            />
          </Grid>
        </Grid>

        <Typography variant="h6" sx={{ mt: 3 }}>Address</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Street"
              name="address.street"
              value={userData.personalInfo.address.street}
              onChange={handlePersonalInfoChange}
              margin="normal"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="City"
              name="address.city"
              value={userData.personalInfo.address.city}
              onChange={handlePersonalInfoChange}
              margin="normal"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="State"
              name="address.state"
              value={userData.personalInfo.address.state}
              onChange={handlePersonalInfoChange}
              margin="normal"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Pin Code"
              name="address.pinCode"
              value={userData.personalInfo.address.pinCode}
              onChange={handlePersonalInfoChange}
              margin="normal"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Country"
              name="address.country"
              value={userData.personalInfo.address.country}
              onChange={handlePersonalInfoChange}
              margin="normal"
            />
          </Grid>
        </Grid>

        <Typography variant="h5" sx={{ mt: 4 }} gutterBottom>Professional Information</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Designation"
              name="designation"
              value={userData.professionalInfo.designation}
              onChange={handleProfessionalInfoChange}
              margin="normal"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Company"
              name="company"
              value={userData.professionalInfo.company}
              onChange={handleProfessionalInfoChange}
              margin="normal"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Education</Typography>
          {userData.professionalInfo.education.map((edu, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={11}>
                  <Typography variant="subtitle1">{edu.institution}</Typography>
                  <Typography variant="body2">
                    {edu.degree} in {edu.field} ({edu.startYear} - {edu.endYear})
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {edu.type.charAt(0).toUpperCase() + edu.type.slice(1)}
                  </Typography>
                </Grid>
                <Grid item xs={1}>
                  <IconButton onClick={() => handleRemoveEducation(index)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          ))}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setOpenEducationDialog(true)}
          >
            Add Education
          </Button>
        </Box>

        <Typography variant="h5" sx={{ mt: 4 }} gutterBottom>Interests & Skills</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Hobbies</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {userData.interests.hobbies.map((hobby, index) => (
                  <Chip
                    key={index}
                    label={hobby}
                    onDelete={() => handleRemoveInterest('hobbies', hobby)}
                  />
                ))}
              </Box>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Skills</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {userData.interests.skills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill}
                    onDelete={() => handleRemoveInterest('skills', skill)}
                  />
                ))}
              </Box>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Languages</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {userData.interests.languages.map((language, index) => (
                  <Chip
                    key={index}
                    label={language}
                    onDelete={() => handleRemoveInterest('languages', language)}
                  />
                ))}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                select
                value={interestType}
                onChange={(e) => setInterestType(e.target.value)}
                sx={{ width: 150 }}
              >
                <MenuItem value="hobbies">Hobbies</MenuItem>
                <MenuItem value="skills">Skills</MenuItem>
                <MenuItem value="languages">Languages</MenuItem>
              </TextField>
              <TextField
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder={`Add new ${interestType.slice(0, -1)}`}
                onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
              />
              <Button
                variant="contained"
                onClick={handleAddInterest}
                startIcon={<AddIcon />}
              >
                Add
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            size="large"
          >
            Save Changes
          </Button>
        </Box>
      </Paper>

      <Dialog open={openEducationDialog} onClose={() => setOpenEducationDialog(false)}>
        <DialogTitle>Add Education</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Institution"
            value={newEducation.institution}
            onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Degree"
            value={newEducation.degree}
            onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Field of Study"
            value={newEducation.field}
            onChange={(e) => setNewEducation({ ...newEducation, field: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Start Year"
            type="number"
            value={newEducation.startYear}
            onChange={(e) => setNewEducation({ ...newEducation, startYear: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="End Year"
            type="number"
            value={newEducation.endYear}
            onChange={(e) => setNewEducation({ ...newEducation, endYear: e.target.value })}
            margin="normal"
          />
          <TextField
            select
            fullWidth
            label="Institution Type"
            value={newEducation.type}
            onChange={(e) => setNewEducation({ ...newEducation, type: e.target.value })}
            margin="normal"
          >
            <MenuItem value="school">School</MenuItem>
            <MenuItem value="college">College</MenuItem>
            <MenuItem value="university">University</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEducationDialog(false)}>Cancel</Button>
          <Button onClick={handleAddEducation} variant="contained" color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserInfo;