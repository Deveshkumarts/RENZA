import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function CompanyUpdates({ user }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const isLeader = user?.role === 'CEO' || user?.role === 'COO';

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('company_updates')
        .select(`
          *,
          author:users!company_updates_author_id_fkey(name, email, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (err) {
      console.error('Error fetching updates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostUpdate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    setIsPosting(true);
    try {
      const { error } = await supabase
        .from('company_updates')
        .insert([{
          author_id: user.id,
          title: title.trim(),
          content: content.trim()
        }]);

      if (error) throw error;
      
      setTitle('');
      setContent('');
      fetchUpdates();
    } catch (err) {
      console.error('Error posting update:', err);
      alert('Failed to post update.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteUpdate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      const { error } = await supabase
        .from('company_updates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setUpdates(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      console.error('Error deleting update:', err);
      alert('Failed to delete update.');
    }
  };

  if (loading) {
    return <div className="loading">Loading Updates...</div>;
  }

  return (
    <div className="updates-container animate-fade-in" style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 className="dashboard-title" style={{ margin: 0 }}>Company Updates</h2>
      </div>

      {isLeader && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-color)' }}>Post a New Announcement</h3>
          <form onSubmit={handlePostUpdate} className="modern-form">
            <div className="input-group">
              <label>Announcement Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's the update?"
                required
                style={{ padding: '0.8rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-color)', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label>Details</label>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Provide the full details here..."
                required
                style={{ padding: '0.8rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-color)', width: '100%', minHeight: '120px', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <button type="submit" disabled={isPosting} style={{ marginTop: '1.5rem', width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'var(--accent-color)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}>
              {isPosting ? 'Posting...' : 'Post Announcement'}
            </button>
          </form>
        </div>
      )}

      <div className="updates-feed" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {updates.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            No company announcements yet.
          </div>
        ) : (
          updates.map(update => (
            <div key={update.id} className="card update-card" style={{ padding: '1.5rem', position: 'relative' }}>
              {isLeader && (
                <button 
                  onClick={() => handleDeleteUpdate(update.id)}
                  title="Delete Announcement"
                  style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255, 77, 79, 0.1)', color: '#ff4d4f', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  🗑️
                </button>
              )}
              
              <div style={{ paddingRight: isLeader ? '40px' : '0' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: 'var(--text-color)' }}>{update.title}</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-color)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.7rem' }}>
                      {(update.author?.name || update.author?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    {update.author?.name || update.author?.email} ({update.author?.role})
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>•</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(update.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                
                <div style={{ fontSize: '1.05rem', lineHeight: '1.6', color: 'var(--text-color)', whiteSpace: 'pre-wrap' }}>
                  {update.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
