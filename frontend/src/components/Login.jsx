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
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Welcome to Renza</h1>
        <p className="login-subtitle">Team Management Dashboard</p>
        
        {error && <div className="error-banner">{error}</div>}
        
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
          
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          
          <button type="submit" className="login-btn">Log In</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
