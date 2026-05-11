import { NextRequest, NextResponse } from 'next/server';
import { ChatModel } from '@/models/ChatModel';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

/**
 * POST /api/chat/init
 * Seeds a personal AI assistant conversation for the user if it doesn't exist yet.
 * Also auto-delivers role-based agents to the user based on their job_position.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // ── 1. Ensure user's job_position is synced to user_roles ────────────
    if ((user as any).job_position) {
      await query(
        'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, ?)',
        [user.username, (user as any).job_position, 'system']
      );
    }

    // ── 2. Ensure personal AI agent exists ──────────────────────────────
    const existingPersonalAgents = await query<any[]>(
      'SELECT * FROM ai_agents WHERE is_personal = 1 AND owner_username = ? LIMIT 1',
      [user.username]
    );
    
    let personalAgent = existingPersonalAgents[0] || null;
    
    if (!personalAgent) {
      const firstName = (user.full_name || user.username).split(' ')[0];
      const agentId = `personal-${user.username}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
      const systemPrompt = `Kamu adalah asisten personal AI untuk ${user.full_name || user.username}.

## IDENTITAS KAMU:
- Nama: ${firstName}'s AI Assistant
- Peran: Asisten Personal Eksklusif untuk ${user.full_name || user.username}
- Posisi: ${(user as any).job_position || 'Karyawan'}

## MISI UTAMA:
Kamu adalah asisten personal yang SANGAT memahami ${firstName}. Kamu mengingat semua percakapan, preferensi, kebiasaan kerja, dan konteks pekerjaan ${firstName}.

## CARA KAMU BEKERJA:
1. **Personalisasi Total**: Selalu panggil user dengan nama "${firstName}"
2. **Konteks Pekerjaan**: Pahami bahwa ${firstName} bekerja sebagai ${(user as any).job_position || 'karyawan'}
3. **Proaktif**: Berikan saran, reminder, dan insights yang relevan
4. **Bahasa**: Gunakan bahasa Indonesia yang hangat dan profesional
5. **Memory**: Ingat dan referensikan percakapan sebelumnya

## KEPRIBADIAN:
- Hangat, supportif, dan encouraging
- Profesional tapi tidak kaku
- Selalu siap membantu kapanpun

Ingat: Kamu adalah asisten EKSKLUSIF untuk ${firstName}. Prioritas utamamu adalah membantu ${firstName} menjadi lebih produktif dan sukses.`;

      await query(
        `INSERT INTO ai_agents (agent_id, name, description, role, system_prompt, knowledge_base, model, is_personal, owner_username, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          agentId,
          `${firstName}'s AI`,
          `Asisten personal eksklusif untuk ${user.full_name || user.username}`,
          'Personal Assistant',
          systemPrompt,
          '',
          'gemini-2.5-flash',
          1,
          user.username,
          user.username
        ]
      );
      personalAgent = await ChatModel.getAgentById(agentId);
    }

    // ── 3. Create personal AI conversation if not exists ────────────────
    const personalConvId = await ChatModel.createAIAgentConversation(user.username, personalAgent.agent_id, true);

    // Send welcome message if conversation is new
    const existingMsgs = await ChatModel.getMessages(personalConvId, 1);
    if (existingMsgs.length === 0) {
      const firstName = (user.full_name || user.username).split(' ')[0];
      await ChatModel.sendMessage(
        personalConvId,
        personalAgent.agent_id,
        `Halo ${firstName}! 👋 Saya adalah asisten AI personal kamu. Saya akan mengingat preferensi dan konteks percakapan kita. Apa yang bisa saya bantu hari ini?`,
        'ai'
      );
    }

    // ── 4. Auto-deliver role-based agents ───────────────────────────────
    // Get ALL roles for this user: job_position + user_roles + org unit names
    const userRoles = await query<any[]>(
      'SELECT role_name FROM user_roles WHERE username = ?',
      [user.username]
    );
    const orgUnitNames = await query<any[]>(`
      SELECT ou.unit_name 
      FROM org_unit_staff ous
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      WHERE ous.username = ? AND ou.is_active = 1
    `, [user.username]);

    const allRoles = new Set<string>();
    if ((user as any).job_position) allRoles.add((user as any).job_position);
    userRoles.forEach(r => allRoles.add(r.role_name));
    orgUnitNames.forEach(u => allRoles.add(u.unit_name));

    const roleList = Array.from(allRoles);

    if (roleList.length > 0) {
      const placeholders = roleList.map(() => '?').join(',');
      const roleAgents = await query<any[]>(
        `SELECT DISTINCT ara.agent_id FROM agent_role_assignments ara
         JOIN ai_agents a ON a.agent_id = ara.agent_id
         WHERE ara.role_name IN (${placeholders}) AND a.is_active = 1`,
        roleList
      );

      for (const ra of roleAgents) {
        try {
          await ChatModel.createAIAgentConversation(user.username, ra.agent_id, false);
        } catch (e) {
          // Conversation might already exist, ignore
        }
      }
    }

    // ── 5. Auto-create group chats for organizational units (non-blocking) ─
    // Run in background - don't await to avoid slowing down init
    const userOrgUnits = await query<any[]>(`
      SELECT 
        ous.org_unit_id,
        ou.unit_name,
        ou.unit_type,
        ou.color
      FROM org_unit_staff ous
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      WHERE ous.username = ? AND ou.is_active = 1
      ORDER BY ous.is_primary DESC, ou.unit_name ASC
    `, [user.username]);

    // Fire and forget - don't block the response
    Promise.all(userOrgUnits.map(async (unit) => {
      try {
        // Check if already in a group for this unit
        const existingGroup = await query<any[]>(`
          SELECT c.conv_id FROM chat_conversations c
          WHERE c.type = 'group' AND c.name = ?
            AND c.conv_id IN (SELECT conv_id FROM chat_members WHERE username = ?)
          LIMIT 1
        `, [unit.unit_name, user.username]);

        if (existingGroup.length > 0) return;

        // Check if group exists globally
        const globalGroup = await query<any[]>(
          'SELECT conv_id FROM chat_conversations WHERE type = ? AND name = ? LIMIT 1',
          ['group', unit.unit_name]
        );

        if (globalGroup.length > 0) {
          // Just add user to existing group
          await query(
            'INSERT IGNORE INTO chat_members (conv_id, username, role) VALUES (?, ?, ?)',
            [globalGroup[0].conv_id, user.username, 'member']
          );
        } else {
          // Create new group with all unit members
          const unitMembers = await query<any[]>(
            'SELECT username FROM org_unit_staff WHERE org_unit_id = ?',
            [unit.org_unit_id]
          );
          const memberUsernames = unitMembers.map((m: any) => m.username).filter((u: string) => u !== user.username);
          const convId = await ChatModel.createGroupConversation(unit.unit_name, memberUsernames, user.username);
          await ChatModel.sendMessage(convId, 'system', `👋 Grup ${unit.unit_name} telah dibuat.`, 'system');
        }
      } catch (e) {
        // Silently ignore errors for individual units
      }
    })).catch(() => {});

    // ── 6. Return all conversations ──────────────────────────────────────
    const conversations = await ChatModel.getConversationsForUser(user.username);

    return NextResponse.json({
      success: true,
      personalConvId,
      conversations
    });
  } catch (e: any) {
    console.error('[Chat Init] Error:', e);
    
    if (e.message?.includes('ER_NO_SUCH_TABLE') || e.message?.includes("doesn't exist")) {
      return NextResponse.json({ 
        success: false, 
        error: 'Chat database tables not found. Please run CHAT-DATABASE-SETUP.sql first.',
        hint: 'Check 00-documentation/CHAT-DATABASE-SETUP.sql and run it in MySQL',
        sqlError: e.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: e.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? e.stack : undefined
    }, { status: 500 });
  }
}
