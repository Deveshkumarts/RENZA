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
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  
  const canEdit = isLeader && selectedUserId === user.id;

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
      setIsEditing(false);
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
        setEditData({
          phone: combinedData.phone || '',
          gender: combinedData.gender || '',
          college_name: combinedData.college_name || '',
          year_and_sem: combinedData.year_and_sem || '',
          age: combinedData.age || '',
          dob: combinedData.dob ? new Date(combinedData.dob).toISOString().split('T')[0] : '',
          state: combinedData.state || '',
          city: combinedData.city || '',
          domain: combinedData.domain || ''
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [selectedUserId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        user_id: selectedUserId,
        phone: editData.phone,
        gender: editData.gender,
        college_name: editData.college_name,
        year_and_sem: editData.year_and_sem,
        age: editData.age ? parseInt(editData.age) : null,
        dob: editData.dob || null,
        state: editData.state,
        city: editData.city,
        domain: editData.domain
      };

      const { error } = await supabase
        .from('employee_profiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
      
      // refresh data
      setProfileData({ ...profileData, ...payload });
      setIsEditing(false);
    } catch (err) {
      alert("Failed to save profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

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
            {canEdit ? (
              <div className="action-group">
                {!isEditing ? (
                  <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
                ) : (
                  <div className="edit-actions">
                    <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                    <button className="save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="employee-notice" style={{ width: 'auto', marginLeft: 'auto' }}>
                <span>ℹ️ For any changes contact IT Team</span>
              </div>
            )}
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
            {isEditing ? (
              <input 
                type={field.type} 
                name={field.key} 
                value={editData[field.key] || ''} 
                onChange={handleChange}
                className="edit-input"
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            ) : (
              <p>
                {field.type === 'date' && profileData?.[field.key] 
                  ? new Date(profileData[field.key]).toLocaleDateString() 
                  : profileData?.[field.key] || 'N/A'
                }
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Profile;
