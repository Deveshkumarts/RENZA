import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (isChangingPassword) {
      if (!newPassword || newPassword.length < 6) {
        setError('New password must be at least 6 characters');
        return;
      }
      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
          
        if (fetchError || !data) {
          setError('Invalid email');
          return;
        }
        
        if (data.password !== password) {
          setError('Incorrect old password');
          return;
        }
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ password: newPassword })
          .eq('id', data.id);
          
        if (updateError) throw updateError;
        
        setSuccess('Password changed successfully! You can now login.');
        setIsChangingPassword(false);
        setPassword('');
        setNewPassword('');
      } catch (err) {
        setError('Failed to change password');
      }
      return;
    }

    // Normal Login Flow
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
        
      if (error || !data) {
        setError('Invalid email or password');
        return;
      }
      
      if (data.password !== password) {
        setError('Invalid email or password');
        return;
      }
      
      onLogin(data);
    } catch (err) {
      setError('An error occurred during login');
    }
  };

  return (
    <div className="login-container modern">
      <div className="login-info-side">
        <div className="login-glow"></div>
        <img src="/logo.png" alt="Renza Logo" className="info-logo" onError={(e) => e.target.style.display = 'none'} />
        <h1 className="info-title">RENZA</h1>
        <p className="info-description">
          Streamline your team operations, track massive goals, and maintain a seamless flow of internal communication. Welcome to the future of management.
        </p>
      </div>
      
      <div className="login-form-side">
        <div className="modern-box">
          <div className="login-header">
            <h1>{isChangingPassword ? 'Change Password' : 'Welcome Back'}</h1>
            <p className="subtitle">
              {isChangingPassword ? 'Create a new secure password' : 'Please enter your credentials to continue'}
            </p>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-banner" style={{marginBottom: '1rem', padding: '1rem', background: '#d4edda', color: '#155724', borderRadius: '8px'}}>{success}</div>}
          
          <form onSubmit={handleSubmit} className="modern-form">
            <div className="input-group">
              <label>Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="member@renza.com"
              />
            </div>
            
            <div className="input-group" style={{ marginTop: '0.5rem' }}>
              <label>{isChangingPassword ? 'Old Password' : 'Password'}</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {isChangingPassword && (
              <div className="input-group" style={{ marginTop: '0.5rem' }}>
                <label>New Password</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
            )}
            
            {!isChangingPassword && (
              <div style={{ textAlign: 'right', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => { setIsChangingPassword(true); setError(''); setSuccess(''); }}
                  style={{ background: 'none', border: 'none', color: '#666', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                >
                  Change Password?
                </button>
              </div>
            )}
            
            <button type="submit" className="modern-button">
              {isChangingPassword ? 'Update Password' : 'Login'}
            </button>
            
            {isChangingPassword && (
              <button 
                type="button" 
                className="modern-button" 
                style={{ background: '#f5f5f5', color: '#333', border: '1px solid #ddd', marginTop: '0.5rem' }}
                onClick={() => { setIsChangingPassword(false); setError(''); setPassword(''); setNewPassword(''); }}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
