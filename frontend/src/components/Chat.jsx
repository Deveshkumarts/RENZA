import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './Chat.css';

export default function Chat({ user }) {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Fetch channels on mount
  useEffect(() => {
    fetchChannels();
  }, []);

  // Fetch messages when active channel changes and subscribe to real-time updates
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('type', { ascending: false })
        .order('name');
        
      if (!error && data) {
        setChannels(data);
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
    setNewMessage(''); // optimistic clear

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
        // Optionally restore the message if failed
        setNewMessage(messageText);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  // Group channels by type and category
  const companyChannels = channels.filter(c => c.type === 'COMPANY');
  const techGroups = channels.filter(c => c.type === 'GROUP' && c.sub_category === 'TECH');
  const nonTechGroups = channels.filter(c => c.type === 'GROUP' && c.sub_category === 'NON-TECH');
  const projectGroups = channels.filter(c => c.type === 'GROUP' && c.sub_category === 'PROJECT');

  if (loading) {
    return <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>Loading Chat...</div>;
  }

  return (
    <div className="chat-container animate-fade-in">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3>Chat</h3>
        </div>
        
        <div className="chat-sidebar-content">
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

          {/* Groups - Non-Tech */}
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

          {/* Groups - Project */}
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
        </div>
      </div>

      {/* Main Chat Area */}
      {activeChannel ? (
        <div className="chat-main">
          <div className="chat-header">
            <h3># {activeChannel.name}</h3>
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

          <div className="chat-input-container">
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input
                type="text"
                className="chat-input"
                placeholder={`Message #${activeChannel.name}...`}
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
        </div>
      ) : (
        <div className="no-channel-selected">
          Select a channel to start messaging
        </div>
      )}
    </div>
  );
}
