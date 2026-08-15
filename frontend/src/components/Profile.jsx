import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Profile.css';

function Profile({ user }) {
  const isLeader = user.role === 'CEO' || user.role === 'COO';
  
  const [selectedUserId, setSelectedUserId] = useState(user.id);
  const [allUsers, setAllUsers] = useState([]);
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all users for dropdown if leader
  useEffect(() => {
    if (isLeader) {
      const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('id, name, email, role, category').order('name');
        if (data) setAllUsers(data);
      };
      fetchUsers();
    }
  }, [isLeader]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', selectedUserId)
          .single();
          
        if (userError) throw userError;

        let combinedData = { ...userData };
        const { data: profileData, error: profileError } = await supabase
          .from('employee_profiles')
          .select('*')
          .eq('user_id', selectedUserId)
          .single();
          
        if (profileData) {
          combinedData = { ...combinedData, ...profileData };
        }
        
        setProfileData(combinedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [selectedUserId]);

  if (loading) {
    return <div className="profile-container"><div className="loading">Loading profile...</div></div>;
  }

  if (error) {
    return <div className="profile-container"><div className="error">Error: {error}</div></div>;
  }

  return (
    <div className="profile-container">
      {/* Top Bar */}
      <div className="profile-topbar">
        {isLeader ? (
          <div className="leader-controls">
            <div className="selector-group">
              <label>Viewing Profile:</label>
              <select 
                value={selectedUserId} 
                onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
                className="user-selector"
              >
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name || u.email} ({u.role})</option>
                ))}
              </select>
            </div>
            <div className="employee-notice" style={{ width: 'auto', marginLeft: 'auto' }}>
              <span>ℹ️ For any changes contact IT Team</span>
            </div>
          </div>
        ) : (
          <div className="employee-notice">
            <span>ℹ️ For any changes contact IT Team</span>
          </div>
        )}
      </div>

      <div className="profile-header">
        <div className="profile-avatar-large">
          {(profileData?.name ? profileData.name.charAt(0) : profileData?.email?.charAt(0) || 'U').toUpperCase()}
        </div>
        <div className="profile-title">
          <h2>{profileData?.name || profileData?.email?.split('@')[0]}</h2>
          <p className="profile-role">{profileData?.role} • {profileData?.category}</p>
        </div>
      </div>
      
      <div className="profile-details-grid">
        <div className="profile-detail-card">
          <label>Email</label>
          <p>{profileData?.email || 'N/A'}</p>
        </div>

        {/* Editable Fields */}
        {[
          { key: 'phone', label: 'Phone', type: 'text' },
          { key: 'gender', label: 'Gender', type: 'text' },
          { key: 'college_name', label: 'College Name', type: 'text' },
          { key: 'year_and_sem', label: 'Year and Sem', type: 'text' },
          { key: 'age', label: 'Age', type: 'number' },
          { key: 'dob', label: 'DOB', type: 'date' },
          { key: 'state', label: 'State', type: 'text' },
          { key: 'city', label: 'City', type: 'text' },
          { key: 'domain', label: 'Domain in RENZA', type: 'text' }
        ].map(field => (
          <div className="profile-detail-card" key={field.key}>
            <label>{field.label}</label>
            <p>
              {field.type === 'date' && profileData?.[field.key] 
                ? new Date(profileData[field.key]).toLocaleDateString() 
                : profileData?.[field.key] || 'N/A'
              }
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Profile;
