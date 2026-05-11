import { query, transaction } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Conversation extends RowDataPacket {
  id: number;
  conv_id: string;
  type: 'direct' | 'group' | 'ai_agent' | 'ai_personal';
  name: string | null;
  description: string | null;
  avatar: string | null;
  created_by: string;
  agent_id: string | null;
  is_archived: number;
  last_message: string | null;
  last_msg_at: Date | null;
  created_at: Date;
  updated_at: Date;
  // joined fields
  unread_count?: number;
  members?: string;
}

export interface Message extends RowDataPacket {
  id: number;
  msg_id: string;
  conv_id: string;
  sender: string;
  content: string;
  msg_type: 'text' | 'image' | 'file' | 'system' | 'ai';
  reply_to: string | null;
  is_edited: number;
  is_deleted: number;
  metadata: any;
  created_at: Date;
}

export interface AIAgent extends RowDataPacket {
  id: number;
  agent_id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  role: string | null;
  system_prompt: string;
  knowledge_base: string | null;
  model: string;
  is_active: number;
  is_personal: number;
  owner_username: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export class ChatModel {
  // ── Conversations ──────────────────────────

  static async getConversationsForUser(username: string): Promise<Conversation[]> {
    return query<Conversation[]>(`
      SELECT c.*,
        GROUP_CONCAT(DISTINCT CONCAT(m.username, ':', COALESCE(u.full_name, m.username), ':', COALESCE(u.avatar, '')) ORDER BY m.username SEPARATOR ',') AS members,
        (
          SELECT COUNT(*) FROM chat_messages msg
          WHERE msg.conv_id = c.conv_id
            AND msg.created_at > COALESCE(
              (SELECT last_read_at FROM chat_members WHERE conv_id = c.conv_id AND username = ?),
              '1970-01-01'
            )
            AND msg.sender != ?
            AND msg.is_deleted = 0
        ) AS unread_count,
        -- For AI conversations, get agent name and avatar
        (SELECT a.name FROM ai_agents a WHERE a.agent_id = c.agent_id LIMIT 1) AS agent_name,
        (SELECT a.avatar FROM ai_agents a WHERE a.agent_id = c.agent_id LIMIT 1) AS agent_avatar,
        -- For personal AI: get owner's (user's) avatar to use as the AI avatar
        (SELECT u3.avatar FROM users u3
          JOIN ai_agents a3 ON a3.owner_username = u3.username
          WHERE a3.agent_id = c.agent_id AND a3.is_personal = 1
          LIMIT 1
        ) AS owner_avatar,
        -- For direct conversations, get the other person's info
        (SELECT u2.avatar FROM users u2
          JOIN chat_members m2 ON m2.conv_id = c.conv_id AND m2.username = u2.username
          WHERE c.type = 'direct' AND u2.username != ?
          LIMIT 1
        ) AS direct_avatar,
        (SELECT u2.full_name FROM users u2
          JOIN chat_members m2 ON m2.conv_id = c.conv_id AND m2.username = u2.username
          WHERE c.type = 'direct' AND u2.username != ?
          LIMIT 1
        ) AS direct_name
      FROM chat_conversations c
      JOIN chat_members m ON m.conv_id = c.conv_id
      LEFT JOIN users u ON u.username = m.username
      WHERE c.conv_id IN (
        SELECT conv_id FROM chat_members WHERE username = ?
      )
      AND c.is_archived = 0
      GROUP BY c.id
      ORDER BY COALESCE(c.last_msg_at, c.created_at) DESC
    `, [username, username, username, username, username]);
  }

  static async getConversationById(convId: string): Promise<Conversation | null> {
    const rows = await query<Conversation[]>(
      'SELECT * FROM chat_conversations WHERE conv_id = ?', [convId]
    );
    return rows[0] || null;
  }

  static async createDirectConversation(userA: string, userB: string): Promise<string> {
    // Check if direct conv already exists
    const existing = await query<any[]>(`
      SELECT c.conv_id FROM chat_conversations c
      JOIN chat_members ma ON ma.conv_id = c.conv_id AND ma.username = ?
      JOIN chat_members mb ON mb.conv_id = c.conv_id AND mb.username = ?
      WHERE c.type = 'direct'
      LIMIT 1
    `, [userA, userB]);

    if (existing[0]) return existing[0].conv_id;

    return transaction(async (conn) => {
      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO chat_conversations (conv_id, type, created_by) VALUES (UUID(), 'direct', ?)`, [userA]
      );
      const [convIdResult] = await conn.execute<any[]>('SELECT conv_id FROM chat_conversations WHERE id = ?', [res.insertId]);
      const cid = convIdResult[0]?.conv_id;
      
      if (!cid) {
        throw new Error('Failed to create conversation');
      }
      
      await conn.execute(
        `INSERT INTO chat_members (conv_id, username, role) VALUES (?, ?, 'owner'), (?, ?, 'member')`,
        [cid, userA, cid, userB]
      );
      return cid;
    });
  }

  static async createGroupConversation(name: string, members: string[], createdBy: string): Promise<string> {
    return transaction(async (conn) => {
      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO chat_conversations (conv_id, type, name, created_by) VALUES (UUID(), 'group', ?, ?)`,
        [name, createdBy]
      );
      const [convIdResult] = await conn.execute<any[]>('SELECT conv_id FROM chat_conversations WHERE id = ?', [res.insertId]);
      const cid = convIdResult[0]?.conv_id;
      
      if (!cid) {
        throw new Error('Failed to create conversation');
      }
      
      const allMembers = Array.from(new Set([createdBy, ...members]));
      for (const m of allMembers) {
        await conn.execute(
          `INSERT INTO chat_members (conv_id, username, role) VALUES (?, ?, ?)`,
          [cid, m, m === createdBy ? 'owner' : 'member']
        );
      }
      return cid;
    });
  }

  static async createAIAgentConversation(username: string, agentId: string, isPersonal = false): Promise<string> {
    // Check existing
    const existing = await query<any[]>(`
      SELECT c.conv_id FROM chat_conversations c
      JOIN chat_members m ON m.conv_id = c.conv_id AND m.username = ?
      WHERE c.agent_id = ? AND c.type IN ('ai_agent','ai_personal')
      LIMIT 1
    `, [username, agentId]);

    if (existing[0]) return existing[0].conv_id;

    return transaction(async (conn) => {
      const type = isPersonal ? 'ai_personal' : 'ai_agent';
      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO chat_conversations (conv_id, type, agent_id, created_by) VALUES (UUID(), ?, ?, ?)`,
        [type, agentId, username]
      );
      const [convIdResult] = await conn.execute<any[]>('SELECT conv_id FROM chat_conversations WHERE id = ?', [res.insertId]);
      const cid = convIdResult[0]?.conv_id;
      
      if (!cid) {
        throw new Error('Failed to create conversation');
      }
      
      await conn.execute(
        `INSERT INTO chat_members (conv_id, username, role) VALUES (?, ?, 'owner')`,
        [cid, username]
      );
      return cid;
    });
  }

  // ── Messages ──────────────────────────────

  static async getMessages(convId: string, limit: number = 50, before?: string): Promise<Message[]> {
    const numLimit = Math.max(1, Math.min(1000, typeof limit === 'number' ? limit : parseInt(String(limit), 10) || 50));
    
    if (before && before !== 'null' && before !== 'undefined') {
      return query<Message[]>(`
        SELECT m.*, u.avatar AS sender_avatar, u.full_name AS sender_full_name,
          rm.content AS reply_content, rm.sender AS reply_sender
        FROM chat_messages m
        LEFT JOIN users u ON u.username = m.sender
        LEFT JOIN chat_messages rm ON rm.msg_id = m.reply_to
        WHERE m.conv_id = ? AND m.created_at < (SELECT created_at FROM chat_messages WHERE msg_id = ?)
          AND m.is_deleted = 0
        ORDER BY m.created_at DESC LIMIT ${numLimit}
      `, [convId, before]);
    }
    const rows = await query<Message[]>(`
      SELECT m.*, u.avatar AS sender_avatar, u.full_name AS sender_full_name,
        rm.content AS reply_content, rm.sender AS reply_sender
      FROM chat_messages m
      LEFT JOIN users u ON u.username = m.sender
      LEFT JOIN chat_messages rm ON rm.msg_id = m.reply_to
      WHERE m.conv_id = ? AND m.is_deleted = 0
      ORDER BY m.created_at DESC LIMIT ${numLimit}
    `, [convId]);
    return rows.reverse();
  }

  static async sendMessage(
    convId: string, 
    sender: string, 
    content: string, 
    msgType: string = 'text', 
    metadata?: any, 
    voiceData?: any, 
    attachments?: any, 
    replyTo?: string,
    sessionId?: string
  ): Promise<Message> {
    // Try with session_id first, fallback without if column doesn't exist
    let res: ResultSetHeader;
    try {
      res = await query<ResultSetHeader>(
        `INSERT INTO chat_messages (conv_id, sender, content, msg_type, metadata, voice_data, attachments, reply_to, session_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          convId, 
          sender, 
          content, 
          msgType, 
          metadata ? JSON.stringify(metadata) : null, 
          voiceData ? JSON.stringify(voiceData) : null, 
          attachments ? JSON.stringify(attachments) : null, 
          replyTo || null,
          sessionId || null
        ]
      ) as any as ResultSetHeader;
    } catch (e: any) {
      // If session_id column doesn't exist yet, insert without it
      if (e.code === 'ER_BAD_FIELD_ERROR' && e.message?.includes('session_id')) {
        res = await query<ResultSetHeader>(
          `INSERT INTO chat_messages (conv_id, sender, content, msg_type, metadata, voice_data, attachments, reply_to) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            convId, 
            sender, 
            content, 
            msgType, 
            metadata ? JSON.stringify(metadata) : null, 
            voiceData ? JSON.stringify(voiceData) : null, 
            attachments ? JSON.stringify(attachments) : null, 
            replyTo || null
          ]
        ) as any as ResultSetHeader;
      } else {
        throw e;
      }
    }

    // Update conversation last message
    await query(
      `UPDATE chat_conversations SET last_message = ?, last_msg_at = NOW() WHERE conv_id = ?`,
      [content.substring(0, 200), convId]
    );

    // Update session stats if session provided
    if (sessionId) {
      try {
        await query(
          `UPDATE chat_sessions 
           SET message_count = message_count + 1,
               last_message_at = NOW(),
               updated_at = NOW()
           WHERE session_id = ?`,
          [sessionId]
        );
      } catch (e: any) {
        // Ignore if chat_sessions table doesn't exist yet
        if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
      }
    }

    const msgs = await query<Message[]>('SELECT * FROM chat_messages WHERE id = ?', [res.insertId]);
    return msgs[0];
  }

  static async markAsRead(convId: string, username: string): Promise<void> {
    await query(
      `UPDATE chat_members SET last_read_at = NOW() WHERE conv_id = ? AND username = ?`,
      [convId, username]
    );
  }

  static async deleteMessage(msgId: string, username: string): Promise<boolean> {
    const msgs = await query<Message[]>('SELECT * FROM chat_messages WHERE msg_id = ?', [msgId]);
    if (!msgs[0] || msgs[0].sender !== username) return false;
    await query('UPDATE chat_messages SET is_deleted = 1 WHERE msg_id = ?', [msgId]);
    return true;
  }

  // ── AI Agents ─────────────────────────────

  static async getAgents(includePersonal = false, username?: string, includeInactive = false): Promise<AIAgent[]> {
    const activeFilter = includeInactive ? '' : 'AND is_active = 1';
    if (includePersonal && username) {
      return query<AIAgent[]>(`
        SELECT a.*, u.avatar as owner_avatar, u.full_name as owner_full_name
        FROM ai_agents a
        LEFT JOIN users u ON u.username = a.owner_username
        WHERE ${includeInactive ? '' : 'a.is_active = 1 AND'} (a.is_personal = 0 OR (a.is_personal = 1 AND a.owner_username = ?))
        ORDER BY a.is_personal ASC, a.name ASC
      `, [username]);
    }
    return query<AIAgent[]>(
      `SELECT a.*, u.avatar as owner_avatar, u.full_name as owner_full_name
       FROM ai_agents a
       LEFT JOIN users u ON u.username = a.owner_username
       WHERE a.is_personal = 0 ${activeFilter} 
       ORDER BY a.name ASC`
    );
  }

  static async getAgentById(agentId: string): Promise<AIAgent | null> {
    const rows = await query<AIAgent[]>('SELECT * FROM ai_agents WHERE agent_id = ?', [agentId]);
    return rows[0] || null;
  }

  static async createAgent(data: Partial<AIAgent>, createdBy: string): Promise<AIAgent> {
    const agentId = `agent-${Date.now()}`;
    await query(
      `INSERT INTO ai_agents (agent_id, name, description, role, system_prompt, knowledge_base, model, is_personal, owner_username, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [agentId, data.name, data.description, data.role, data.system_prompt, data.knowledge_base, data.model || 'gpt-4o-mini', data.is_personal || 0, data.owner_username, createdBy]
    );
    const rows = await query<AIAgent[]>('SELECT * FROM ai_agents WHERE agent_id = ?', [agentId]);
    return rows[0];
  }

  static async updateAgent(agentId: string, data: Partial<AIAgent>): Promise<boolean> {
    const fields: string[] = [];
    const vals: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); vals.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); vals.push(data.description); }
    if (data.role !== undefined) { fields.push('role = ?'); vals.push(data.role); }
    if (data.system_prompt !== undefined) { fields.push('system_prompt = ?'); vals.push(data.system_prompt); }
    if (data.knowledge_base !== undefined) { fields.push('knowledge_base = ?'); vals.push(data.knowledge_base); }
    if (data.model !== undefined) { fields.push('model = ?'); vals.push(data.model); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); vals.push(data.is_active); }
    if (!fields.length) return false;
    vals.push(agentId);
    await query(`UPDATE ai_agents SET ${fields.join(', ')} WHERE agent_id = ?`, vals);
    return true;
  }

  // ── Agent Memory ──────────────────────────

  static async getAgentMemory(agentId: string, username: string): Promise<Record<string, string>> {
    const rows = await query<any[]>(
      'SELECT memory_key, memory_value FROM ai_agent_memory WHERE agent_id = ? AND username = ?',
      [agentId, username]
    );
    return Object.fromEntries(rows.map(r => [r.memory_key, r.memory_value]));
  }

  static async setAgentMemory(agentId: string, username: string, key: string, value: string): Promise<void> {
    await query(
      `INSERT INTO ai_agent_memory (agent_id, username, memory_key, memory_value)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE memory_value = ?, updated_at = NOW()`,
      [agentId, username, key, value, value]
    );
  }

  // ── Members ───────────────────────────────

  static async getMembers(convId: string): Promise<any[]> {
    return query('SELECT * FROM chat_members WHERE conv_id = ?', [convId]);
  }

  static async addMember(convId: string, username: string): Promise<void> {
    await query(
      `INSERT IGNORE INTO chat_members (conv_id, username) VALUES (?, ?)`,
      [convId, username]
    );
  }

  static async removeMember(convId: string, username: string): Promise<void> {
    await query('DELETE FROM chat_members WHERE conv_id = ? AND username = ?', [convId, username]);
  }
}
