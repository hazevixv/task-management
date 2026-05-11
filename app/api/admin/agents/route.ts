import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

/** GET /api/admin/agents - list all AI agents */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const agents = await query<any[]>(
    `SELECT a.agent_id, a.name, a.description, a.avatar, a.role, a.model, 
            a.is_active, a.is_personal, a.owner_username, a.created_at,
            a.system_prompt, a.knowledge_base,
            u.avatar as owner_avatar, u.full_name as owner_full_name
     FROM ai_agents a
     LEFT JOIN users u ON u.username = a.owner_username
     ORDER BY a.is_personal ASC, a.name ASC`
  );

  return NextResponse.json({ success: true, agents });
}

/** POST /api/admin/agents - create new AI agent (admin only) */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, role, system_prompt, knowledge_base, model, is_personal } = body;

  if (!name || !system_prompt) {
    return NextResponse.json({ success: false, error: 'name and system_prompt are required' }, { status: 400 });
  }

  const agentId = `agent-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
  const isPersonal = is_personal ? 1 : 0;

  await query(
    `INSERT INTO ai_agents (agent_id, name, description, role, system_prompt, knowledge_base, model, is_active, is_personal, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [agentId, name, description || null, role || null, system_prompt, knowledge_base || null, model || 'gemini-2.5-flash', isPersonal, user.username]
  );

  const agents = await query<any[]>('SELECT * FROM ai_agents WHERE agent_id = ?', [agentId]);
  return NextResponse.json({ success: true, agent: agents[0] });
}

/** PUT /api/admin/agents - update AI agent */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { agent_id, name, description, avatar, role, model, is_active, system_prompt, knowledge_base } = body;

  if (!agent_id) return NextResponse.json({ success: false, error: 'agent_id required' }, { status: 400 });

  await query(
    `UPDATE ai_agents SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      avatar = COALESCE(?, avatar),
      role = COALESCE(?, role),
      model = COALESCE(?, model),
      is_active = COALESCE(?, is_active),
      system_prompt = COALESCE(?, system_prompt),
      knowledge_base = COALESCE(?, knowledge_base),
      updated_at = NOW()
     WHERE agent_id = ?`,
    [name, description, avatar, role, model, is_active, system_prompt, knowledge_base, agent_id]
  );

  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/agents - delete AI agent */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const agent_id = searchParams.get('agent_id');

  if (!agent_id) return NextResponse.json({ success: false, error: 'agent_id required' }, { status: 400 });

  // Remove role assignments first
  await query('DELETE FROM agent_role_assignments WHERE agent_id = ?', [agent_id]);
  // Remove agent memory
  await query('DELETE FROM ai_agent_memory WHERE agent_id = ?', [agent_id]);
  // Archive conversations (don't delete messages)
  await query('UPDATE chat_conversations SET is_archived = 1 WHERE agent_id = ?', [agent_id]);
  // Delete agent
  await query('DELETE FROM ai_agents WHERE agent_id = ?', [agent_id]);

  return NextResponse.json({ success: true });
}
