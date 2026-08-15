import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Profile.css';

function Profile({ user }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (userError) throw userError;

        let combinedData = { ...userData };
        const { data: profileData, error: profileError } = await supabase
          .from('employee_profiles')
          .select('*')
          .eq('user_id', user.id)
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
  }, [user.id]);

  if (loading) {
    return <div className="profile-container"><div className="loading">Loading profile...</div></div>;
  }

  if (error) {
    return <div className="profile-container"><div className="error">Error: {error}</div></div>;
  }

  return (
    <div className="profile-container">
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
        <div className="profile-detail-card">
          <label>Phone No</label>
          <p>{profileData?.phone || 'N/A'}</p>
        </div>
        <div className="profile-detail-card">
          <label>Gender</label>
          <p>{profileData?.gender || 'N/A'}</p>
        </div>
        <div className="profile-detail-card">
          <label>College / Work</label>
          <p>{profileData?.college_work || 'N/A'}</p>
        </div>
        <div className="profile-detail-card">
          <label>Year / Experience</label>
          <p>{profileData?.year_experience || 'N/A'}</p>
        </div>
        <div className="profile-detail-card">
          <label>Age</label>
          <p>{profileData?.age || 'N/A'}</p>
        </div>
        <div className="profile-detail-card">
          <label>DOB</label>
          <p>{profileData?.dob ? new Date(profileData.dob).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div className="profile-detail-card">
          <label>Current City</label>
          <p>{profileData?.current_city || 'N/A'}</p>
        </div>
        <div className="profile-detail-card">
          <label>Domain</label>
          <p>{profileData?.domain || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}

export default Profile;
