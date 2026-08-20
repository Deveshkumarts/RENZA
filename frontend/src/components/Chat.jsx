import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './Chat.css';

export default function Chat({ user }) {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState('DIRECT'); // DIRECT or GROUP
  const [selectedUser, setSelectedUser] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupCategory, setGroupCategory] = useState('TECH');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const messagesEndRef = useRef(null);
  const isLeader = user?.role === 'CEO' || user?.role === 'COO';

  // Fetch initial data
  useEffect(() => {
    fetchUsers();
    fetchChannels();
  }, []);

  // Fetch messages when active channel changes
  useEffect(() => {
    if (!activeChannel) return;

    fetchMessages(activeChannel.id);

    const subscription = supabase
      .channel(`public:messages:channel_id=eq.${activeChannel.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `channel_id=eq.${activeChannel.id}`
      }, payload => {
        // Fetch sender details for the new message
        const fetchSender = async () => {
          const { data } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', payload.new.sender_id)
            .single();
          
          setMessages(prev => [...prev, { ...payload.new, sender: data }]);
        };
        fetchSender();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [activeChannel]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from('users').select('id, name, email, category');
      if (data) setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChannels = async () => {
    try {
      const { data: channelsData, error } = await supabase
        .from('channels')
        .select(`
          *,
          channel_members(user_id)
        `)
        .order('type', { ascending: false })
        .order('name');
        
      if (!error && channelsData) {
        // Only show COMPANY channels or channels where user is a member
        const visibleChannels = channelsData.filter(c => {
          if (c.type === 'COMPANY') return true;
          return c.channel_members?.some(cm => cm.user_id === user.id);
        });
        setChannels(visibleChannels);
      }
    } catch (err) {
      console.error('Error fetching channels:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(name, email)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          channel_id: activeChannel.id,
          sender_id: user.id,
          content: messageText
        }]);
        
      if (error) {
        console.error('Error sending message:', error);
        setNewMessage(messageText);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    
    if (modalTab === 'DIRECT') {
      if (!selectedUser) return;
      
      // Check if a direct message already exists
      const existing = channels.find(c => 
        c.type === 'PRIVATE' && 
        c.channel_members?.some(cm => cm.user_id === parseInt(selectedUser))
      );

      if (existing) {
        setActiveChannel(existing);
        setShowModal(false);
        return;
      }

      // Create new private channel
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .insert([{ name: 'Direct Message', type: 'PRIVATE' }])
        .select()
        .single();
        
      if (!channelError && channelData) {
        // Add both users
        await supabase.from('channel_members').insert([
          { channel_id: channelData.id, user_id: user.id, role: 'ADMIN' },
          { channel_id: channelData.id, user_id: parseInt(selectedUser), role: 'MEMBER' }
        ]);
        
        await fetchChannels();
        setActiveChannel(channelData);
        setShowModal(false);
      }
    } else {
      // Create Group
      if (!groupName.trim()) return;
      
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .insert([{ name: groupName, type: 'GROUP', sub_category: groupCategory }])
        .select()
        .single();
        
      if (!channelError && channelData) {
        // Add creator
        const membersToInsert = [
          { channel_id: channelData.id, user_id: user.id, role: 'ADMIN' }
        ];
        
        // Add selected members
        selectedMembers.forEach(id => {
          if (parseInt(id) !== user.id) {
            membersToInsert.push({ channel_id: channelData.id, user_id: parseInt(id), role: 'MEMBER' });
          }
        });
        
        await supabase.from('channel_members').insert(membersToInsert);
        
        await fetchChannels();
        setActiveChannel(channelData);
        setShowModal(false);
      }
    }
  };

  const getChannelName = (channel) => {
    if (channel.type === 'PRIVATE') {
      const otherUserId = channel.channel_members?.find(cm => cm.user_id !== user.id)?.user_id;
      const otherUser = users.find(u => u.id === otherUserId);
      return otherUser ? (otherUser.name || otherUser.email) : 'Direct Message';
    }
    return channel.name;
  };

  const handleMemberToggle = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedMembers(prev => [...prev, userId]);
    }
  };

  // Group channels by type and category
  const companyChannels = channels.filter(c => c.type === 'COMPANY');
  const techGroups = channels.filter(c => c.type === 'GROUP' && c.sub_category === 'TECH');
  const nonTechGroups = channels.filter(c => c.type === 'GROUP' && c.sub_category === 'NON-TECH');
  const projectGroups = channels.filter(c => c.type === 'GROUP' && c.sub_category === 'PROJECT');
  const privateChats = channels.filter(c => c.type === 'PRIVATE');

  if (loading) {
    return <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>Loading Chat...</div>;
  }

  return (
    <div className="chat-container animate-fade-in" style={{ position: 'relative' }}>
      
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Chat</h3>
          {isLeader && (
            <button className="create-chat-btn" onClick={() => setShowModal(true)} title="New Chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          )}
        </div>
        
        <div className="chat-sidebar-content">
          
          {/* Direct Messages */}
          {privateChats.length > 0 && (
            <div className="chat-section">
              <div className="chat-section-title">👤 Direct Messages</div>
              {privateChats.map(channel => (
                <div 
                  key={channel.id}
                  className={`chat-channel-item ${activeChannel?.id === channel.id ? 'active' : ''}`}
                  onClick={() => setActiveChannel(channel)}
                >
                  @ {getChannelName(channel)}
                </div>
              ))}
            </div>
          )}

          {/* Company Wide */}
          <div className="chat-section">
            <div className="chat-section-title">🏢 Company</div>
            {companyChannels.map(channel => (
              <div 
                key={channel.id}
                className={`chat-channel-item ${activeChannel?.id === channel.id ? 'active' : ''}`}
                onClick={() => setActiveChannel(channel)}
              >
                # {channel.name}
              </div>
            ))}
          </div>

          {/* Groups - Tech */}
          {techGroups.length > 0 && (
            <div className="chat-section">
              <div className="chat-section-title">💻 Tech Groups</div>
              {techGroups.map(channel => (
                <div 
                  key={channel.id}
                  className={`chat-channel-item ${activeChannel?.id === channel.id ? 'active' : ''}`}
                  onClick={() => setActiveChannel(channel)}
                >
                  # {channel.name}
                </div>
              ))}
            </div>
          )}

          {/* Groups - Non-Tech */}
          {nonTechGroups.length > 0 && (
            <div className="chat-section">
              <div className="chat-section-title">👔 Non-Tech Groups</div>
              {nonTechGroups.map(channel => (
                <div 
                  key={channel.id}
                  className={`chat-channel-item ${activeChannel?.id === channel.id ? 'active' : ''}`}
                  onClick={() => setActiveChannel(channel)}
                >
                  # {channel.name}
                </div>
              ))}
            </div>
          )}

          {/* Groups - Project */}
          {projectGroups.length > 0 && (
            <div className="chat-section">
              <div className="chat-section-title">🚀 Projects</div>
              {projectGroups.map(channel => (
                <div 
                  key={channel.id}
                  className={`chat-channel-item ${activeChannel?.id === channel.id ? 'active' : ''}`}
                  onClick={() => setActiveChannel(channel)}
                >
                  # {channel.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeChannel ? (
        <div className="chat-main">
          <div className="chat-header">
            <h3>{activeChannel.type === 'PRIVATE' ? '@' : '#'} {getChannelName(activeChannel)}</h3>
          </div>
          
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                No messages yet. Be the first to say hello!
              </div>
            ) : (
              messages.map(msg => {
                const isSelf = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={`chat-message ${isSelf ? 'self' : ''}`}>
                    <div className="chat-message-sender">
                      {isSelf ? 'You' : (msg.sender?.name || msg.sender?.email || 'Unknown')}
                    </div>
                    <div className="chat-message-bubble">
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {activeChannel.type === 'COMPANY' && activeChannel.name === 'Announcements' && !isLeader ? (
            <div className="chat-input-container" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
              Only the CEO and COO can post in #{activeChannel.name}.
            </div>
          ) : (
            <div className="chat-input-container">
              <form onSubmit={handleSendMessage} className="chat-input-form">
                <input
                  type="text"
                  className="chat-input"
                  placeholder={`Message ${activeChannel.type === 'PRIVATE' ? '@' : '#'}${getChannelName(activeChannel)}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="chat-send-btn"
                  disabled={!newMessage.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="no-channel-selected">
          Select a channel to start messaging
        </div>
      )}

      {/* Create Chat Modal */}
      {showModal && (
        <div className="chat-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="chat-modal" onClick={e => e.stopPropagation()}>
            <div className="chat-modal-header">
              <h3>New Chat</h3>
              <button className="chat-modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            
            <div className="chat-modal-tabs">
              <button 
                className={`chat-modal-tab ${modalTab === 'DIRECT' ? 'active' : ''}`}
                onClick={() => setModalTab('DIRECT')}
              >
                Direct Message
              </button>
              <button 
                className={`chat-modal-tab ${modalTab === 'GROUP' ? 'active' : ''}`}
                onClick={() => setModalTab('GROUP')}
              >
                Create Group
              </button>
            </div>

            <form onSubmit={handleCreateChat} className="chat-modal-body">
              {modalTab === 'DIRECT' ? (
                <div className="input-group">
                  <label>Select Employee</label>
                  <select 
                    className="modern-select" 
                    value={selectedUser} 
                    onChange={e => setSelectedUser(e.target.value)}
                    required
                  >
                    <option value="">-- Choose User --</option>
                    {users.filter(u => u.id !== user.id).map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="input-group">
                    <label>Group Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Finance Team" 
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="input-group">
                    <label>Category</label>
                    <select 
                      className="modern-select" 
                      value={groupCategory} 
                      onChange={e => {
                        setGroupCategory(e.target.value);
                        setSelectedMembers([]);
                      }}
                    >
                      <option value="TECH">Tech Group</option>
                      <option value="NON-TECH">Non-Tech Group</option>
                      <option value="PROJECT">Project Group</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Select Members (Optional)</label>
                    <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', backgroundColor: 'var(--input-bg)' }}>
                      {users.filter(u => {
                        if (u.id === user.id) return false;
                        if (groupCategory === 'TECH') return u.category === 'TECHNICAL';
                        if (groupCategory === 'NON-TECH') return u.category === 'NON-TECHNICAL';
                        return true;
                      }).map(u => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.8rem', padding: '0.4rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            id={`user-${u.id}`}
                            checked={selectedMembers.includes(u.id)}
                            onChange={() => handleMemberToggle(u.id)}
                            style={{ width: 'auto', margin: 0, cursor: 'pointer', transform: 'scale(1.2)' }}
                          />
                          <label htmlFor={`user-${u.id}`} style={{ margin: 0, display: 'inline', cursor: 'pointer', fontSize: '0.95rem' }}>{u.name || u.email}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="chat-send-btn" style={{ marginTop: '1rem' }}>
                {modalTab === 'DIRECT' ? 'Start Chat' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
