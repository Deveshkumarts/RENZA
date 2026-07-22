import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Wiki({ user }) {
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLeader = user.role === 'CEO' || user.role === 'COO';

  const fetchSops = async () => {
    try {
      const { data, error } = await supabase
        .from('sops')
        .select(`
          *,
          author:users(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSops(data || []);
    } catch (err) {
      console.error('Error fetching sops:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSops();
  }, []);

  const handleCreateSop = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('sops')
        .insert([{ title, content, author_id: user.id }]);
        
      if (error) throw error;
      setTitle('');
      setContent('');
      fetchSops();
    } catch (err) {
      console.error('Error creating SOP:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSop = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const { error } = await supabase
        .from('sops')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      fetchSops();
    } catch (err) {
      console.error('Error deleting SOP:', err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="wiki-container">
      {isLeader && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 className="dashboard-title">Publish New SOP</h2>
          <form onSubmit={handleCreateSop} className="modern-form seamless-form">
            <div className="input-group">
              <label>Document Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Employee Onboarding Guide"
              />
            </div>
            
            <div className="input-group">
              <label>Content</label>
              <textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)}
                required
                placeholder="Write the procedure or policy..."
                style={{ minHeight: '150px' }}
              />
            </div>
            
            <button type="submit" disabled={isSubmitting} style={{ marginTop: '1rem' }}>
              {isSubmitting ? 'Publishing...' : 'Publish Document'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="dashboard-title">Company Knowledge Base</h2>
        {sops.length === 0 ? (
          <p>No documents found.</p>
        ) : (
          <div className="sop-list">
            {sops.map(sop => (
              <div key={sop.id} className="sop-item" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-color)' }}>{sop.title}</h3>
                  {isLeader && (
                    <button className="btn-small secondary" onClick={() => handleDeleteSop(sop.id)}>Delete</button>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Published by <strong>{sop.author?.name || sop.author?.email || 'Unknown'}</strong> on {new Date(sop.created_at).toLocaleDateString()}
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {sop.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Wiki;
