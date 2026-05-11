import { NextRequest, NextResponse } from 'next/server';
import { ChatModel } from '@/models/ChatModel';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    const { searchParams } = new URL(req.url);
    const forSettings = searchParams.get('settings') === '1';

    // Get all roles for this user:
    // 1. job_position from users table
    // 2. all role_names from user_roles table
    // 3. all org unit names from org_unit_staff (so agents assigned to unit names also work)
    const userInfo = await query<any[]>(
      'SELECT job_position FROM users WHERE username = ?',
      [user.username]
    );
    const userRoles = await query<any[]>(
      'SELECT role_name FROM user_roles WHERE username = ?',
      [user.username]
    );
    const orgUnits = await query<any[]>(`
      SELECT ou.unit_name 
      FROM org_unit_staff ous
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      WHERE ous.username = ? AND ou.is_active = 1
    `, [user.username]);

    // Collect all role names to check
    const allRoles = new Set<string>();
    if (userInfo[0]?.job_position) allRoles.add(userInfo[0].job_position);
    userRoles.forEach(r => allRoles.add(r.role_name));
    orgUnits.forEach(u => allRoles.add(u.unit_name));

    const roleList = Array.from(allRoles);
    
    if (forSettings) {
      // For settings page: return agents user has access to (including inactive)
      const personalAgents = await query<any[]>(
        `SELECT a.*, u.avatar as owner_avatar, u.full_name as owner_full_name
         FROM ai_agents a
         LEFT JOIN users u ON u.username = a.owner_username
         WHERE a.is_personal = 1 AND a.owner_username = ?`,
        [user.username]
      );
      
      let roleAgents: any[] = [];
      if (roleList.length > 0) {
        const placeholders = roleList.map(() => '?').join(',');
        roleAgents = await query<any[]>(
          `SELECT DISTINCT a.*, u.avatar as owner_avatar, u.full_name as owner_full_name
           FROM ai_agents a
           LEFT JOIN users u ON u.username = a.owner_username
           JOIN agent_role_assignments ara ON ara.agent_id = a.agent_id
           WHERE ara.role_name IN (${placeholders}) AND a.is_personal = 0`,
          roleList
        );
      }
      
      const agents = [...personalAgents, ...roleAgents];
      return NextResponse.json({ success: true, agents });
    }
    
    // For chat: return only active agents the user has access to
    const personalAgents = await query<any[]>(
      `SELECT a.*, u.avatar as owner_avatar, u.full_name as owner_full_name
       FROM ai_agents a
       LEFT JOIN users u ON u.username = a.owner_username
       WHERE a.is_personal = 1 AND a.owner_username = ? AND a.is_active = 1`,
      [user.username]
    );
    
    let roleAgents: any[] = [];
    if (roleList.length > 0) {
      const placeholders = roleList.map(() => '?').join(',');
      roleAgents = await query<any[]>(
        `SELECT DISTINCT a.*, u.avatar as owner_avatar, u.full_name as owner_full_name
         FROM ai_agents a
         LEFT JOIN users u ON u.username = a.owner_username
         JOIN agent_role_assignments ara ON ara.agent_id = a.agent_id
         WHERE ara.role_name IN (${placeholders}) AND a.is_active = 1 AND a.is_personal = 0`,
        roleList
      );
    }
    
    const agents = [...personalAgents, ...roleAgents];
    return NextResponse.json({ success: true, agents });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const data = await req.json();
    if (!data.name || !data.system_prompt) {
      return NextResponse.json({ success: false, error: 'name and system_prompt required' }, { status: 400 });
    }
    const agent = await ChatModel.createAgent(data, user.username);

    // Notify all admins that a new agent was created
    try {
      const admins = await query<any[]>('SELECT username FROM users WHERE role = "admin"');
      for (const admin of admins) {
        if (admin.username !== user.username) {
          await query(
            `INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, 'ai_action', ?, ?, ?)
             ON DUPLICATE KEY UPDATE updated_at = NOW()`,
            [admin.username, `New AI Agent dibuat oleh ${user.full_name || user.username}`, `"${agent.name}" (${agent.role || 'AI Agent'}) telah dibuat dan perlu di-review`, JSON.stringify({ agent_id: agent.agent_id, created_by: user.username })]
          );
        }
      }
    } catch {}

    return NextResponse.json({ success: true, agent });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
