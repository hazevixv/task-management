'use client';

import { useState, useEffect } from 'react';
import { X, Search, Users, MessageSquare, Bot, ChevronRight } from 'lucide-react';
import { getAvatarUrl } from '@/lib/utils';
import styles from '../../app/chat/Chat.module.css';

function getInitials(name: string) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

interface NewChatModalProps {
  user: any;
  agents: any[];
  onClose: () => void;
  onCreated: (convId: string, conv?: any) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

type ModalTab = 'contacts' | 'groups' | 'ai';

export default function NewChatModal({ user, agents, onClose, onCreated, showToast }: NewChatModalProps) {
  const [tab, setTab] = useState<ModalTab>('contacts');
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupChats, setGroupChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/contacts');
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts || []);
        setGroups(data.groups || []);
        setGroupChats(data.groupChats || []);
      }
    } catch {}
    setLoading(false);
  };

  const startDirectChat = async (contact: any) => {
    setCreating(contact.username);
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'direct', members: [contact.username] })
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.conv_id, {
          conv_id: data.conv_id,
          type: 'direct',
          direct_name: contact.full_name,
          direct_avatar: contact.avatar,
          ...data.conversation
        });
      } else {
        showToast(data.error || 'Failed to start chat', 'error');
      }
    } catch {
      showToast('Error starting chat', 'error');
    }
    setCreating(null);
  };

  const openGroupChat = async (groupChat: any) => {
    onCreated(groupChat.conv_id, {
      conv_id: groupChat.conv_id,
      type: 'group',
      name: groupChat.name,
      avatar: groupChat.avatar
    });
  };

  const createGroupChat = async (group: any) => {
    setCreating(`group-${group.org_unit_id}`);
    try {
      const memberUsernames = group.members.map((m: any) => m.username);
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name: group.unit_name,
          members: memberUsernames
        })
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.conv_id, {
          conv_id: data.conv_id,
          type: 'group',
          name: group.unit_name
        });
      } else {
        showToast(data.error || 'Failed to create group', 'error');
      }
    } catch {
      showToast('Error creating group', 'error');
    }
    setCreating(null);
  };

  const openAgentChat = async (agent: any) => {
    setCreating(agent.agent_id);
    try {
      const convType = agent.is_personal ? 'ai_personal' : 'ai_agent';
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: convType, agentId: agent.agent_id })
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.conv_id, {
          conv_id: data.conv_id,
          type: convType,
          agent_id: agent.agent_id,
          agent_name: agent.name,
          agent_avatar: agent.avatar,
          name: agent.name
        });
      } else {
        showToast(data.error || 'Failed to open agent chat', 'error');
      }
    } catch {
      showToast('Error opening agent chat', 'error');
    }
    setCreating(null);
  };

  const filteredContacts = contacts.filter(c =>
    !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.username?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    !search || g.unit_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAgents = agents.filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modalBox} style={{ maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <span className={styles.modalTitle}>New Chat</span>
          <button className={styles.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#F3F4F6', borderRadius: 10, padding: '8px 12px',
          marginBottom: 14, flexShrink: 0
        }}>
          <Search size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif',
              color: '#111827', flex: 1
            }}
          />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 14,
          background: '#F3F4F6', borderRadius: 10, padding: 4, flexShrink: 0
        }}>
          {([
            { id: 'contacts', label: 'Direct', icon: <MessageSquare size={13} /> },
            { id: 'groups', label: 'Groups', icon: <Users size={13} /> },
            { id: 'ai', label: 'AI Agents', icon: <Bot size={13} /> }
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 5, padding: '7px 10px', borderRadius: 8, border: 'none',
                background: tab === t.id ? 'white' : 'transparent',
                color: tab === t.id ? '#7c3aed' : '#6B7280',
                fontWeight: tab === t.id ? 700 : 500,
                fontSize: '0.8125rem', fontFamily: 'DM Sans, sans-serif',
                cursor: 'pointer',
                boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 150ms'
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
              Loading contacts...
            </div>
          ) : tab === 'contacts' ? (
            <div>
              {filteredContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 }}>No contacts yet</div>
                  <div style={{ fontSize: '0.75rem' }}>Contacts come from your organizational assignments</div>
                </div>
              ) : (
                <>
                  {/* Group contacts by unit */}
                  {groups.filter(g => g.members.length > 0).map(group => {
                    const groupContacts = filteredContacts.filter(c =>
                      group.members.some((m: any) => m.username === c.username)
                    );
                    if (groupContacts.length === 0) return null;
                    return (
                      <div key={group.org_unit_id} style={{ marginBottom: 16 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '4px 0 8px', marginBottom: 4,
                          borderBottom: `1.5px solid ${group.unit_color || '#7c3aed'}25`
                        }}>
                          <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: group.unit_color || '#7c3aed', flexShrink: 0
                          }} />
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 700,
                            color: group.unit_color || '#7c3aed',
                            fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize'
                          }}>
                            {group.unit_name}
                          </span>
                        </div>
                        {groupContacts.map(contact => (
                          <button
                            key={contact.username}
                            onClick={() => startDirectChat(contact)}
                            disabled={creating === contact.username}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                              padding: '10px 8px', border: 'none', background: 'transparent',
                              borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                              transition: 'background 150ms',
                              opacity: creating === contact.username ? 0.6 : 1
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            {/* Avatar */}
                            <div style={{
                              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                              overflow: 'hidden', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', color: 'white', fontWeight: 700,
                              fontSize: '0.875rem', fontFamily: 'DM Sans, sans-serif'
                            }}>
                              {contact.avatar ? (
                                <img src={getAvatarUrl(contact.avatar)} alt={contact.full_name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : getInitials(contact.full_name || contact.username)}
                            </div>
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                                {contact.full_name || contact.username}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginTop: 1 }}>
                                @{contact.username}
                                {contact.job_position && ` · ${contact.job_position}`}
                              </div>
                            </div>
                            <ChevronRight size={14} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : tab === 'groups' ? (
            <div>
              {filteredGroups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                  <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 }}>No groups yet</div>
                  <div style={{ fontSize: '0.75rem' }}>Groups are created from your organizational units</div>
                </div>
              ) : (
                filteredGroups.map(group => {
                  // Check if group chat already exists
                  const existingChat = groupChats.find(gc => gc.name === group.unit_name);
                  const isCreating = creating === `group-${group.org_unit_id}`;

                  return (
                    <button
                      key={group.org_unit_id}
                      onClick={() => existingChat ? openGroupChat(existingChat) : createGroupChat(group)}
                      disabled={isCreating}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 8px', border: 'none', background: 'transparent',
                        borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        transition: 'background 150ms', marginBottom: 4,
                        opacity: isCreating ? 0.6 : 1
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Group avatar */}
                      <div style={{
                        width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                        background: group.unit_color || '#7c3aed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '1.1rem'
                      }}>
                        <Users size={20} />
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                            {group.unit_name}
                          </span>
                          {existingChat && (
                            <span style={{
                              fontSize: '0.65rem', padding: '1px 6px',
                              background: 'rgba(16,185,129,0.1)', color: '#059669',
                              borderRadius: 4, fontWeight: 700, fontFamily: 'DM Sans, sans-serif'
                            }}>
                              Active
                            </span>
                          )}
                          {group.is_primary && (
                            <span style={{
                              fontSize: '0.65rem', padding: '1px 6px',
                              background: 'rgba(245,158,11,0.1)', color: '#d97706',
                              borderRadius: 4, fontWeight: 700, fontFamily: 'DM Sans, sans-serif'
                            }}>
                              ⭐ Primary
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginTop: 2 }}>
                          {group.members.length + 1} members · {group.unit_type}
                          {existingChat && existingChat.last_message && ` · ${existingChat.last_message.slice(0, 30)}...`}
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            // AI Agents tab
            <div>
              {filteredAgents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif' }}>
                  <Bot size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>No AI agents available</div>
                </div>
              ) : (
                filteredAgents.map(agent => (
                  <button
                    key={agent.agent_id}
                    onClick={() => openAgentChat(agent)}
                    disabled={creating === agent.agent_id}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 8px', border: 'none', background: 'transparent',
                      borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      transition: 'background 150ms', marginBottom: 4,
                      opacity: creating === agent.agent_id ? 0.6 : 1
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      background: agent.is_personal
                        ? 'linear-gradient(135deg,#7c3aed,#a78bfa)'
                        : 'linear-gradient(135deg,#10b981,#059669)',
                      overflow: 'hidden', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'white'
                    }}>
                      {agent.avatar ? (
                        <img src={getAvatarUrl(agent.avatar)} alt={agent.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : <Bot size={18} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827', fontFamily: 'DM Sans, sans-serif' }}>
                          {agent.name}
                        </span>
                        <span style={{
                          fontSize: '0.65rem', padding: '1px 6px',
                          background: agent.is_personal ? 'rgba(124,58,237,0.1)' : 'rgba(16,185,129,0.1)',
                          color: agent.is_personal ? '#7c3aed' : '#059669',
                          borderRadius: 4, fontWeight: 700, fontFamily: 'DM Sans, sans-serif'
                        }}>
                          {agent.is_personal ? 'Personal' : 'Worker'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'DM Sans, sans-serif', marginTop: 1 }}>
                        {agent.role || 'AI Assistant'}
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
