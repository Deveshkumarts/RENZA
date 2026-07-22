import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // In a pure Supabase setup, you'd use Supabase Auth (supabase.auth.signInWithPassword)
      // Since we migrated our custom 'users' table structure with plain passwords for now:
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
            <h1>Welcome Back</h1>
            <p className="subtitle">Please enter your credentials to continue</p>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
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
              <label>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            
            <button type="submit" className="modern-button">Login</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
