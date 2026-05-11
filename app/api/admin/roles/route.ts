import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

/**
 * GET /api/admin/roles
 * Returns all distinct job positions from users table + agent-role assignments
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  // Get all distinct job_positions from users table (the real source of truth)
  const positions = await query<any[]>(
    'SELECT DISTINCT job_position FROM users WHERE job_position IS NOT NULL AND job_position != \'\' ORDER BY job_position'
  );

  const assignments = await query<any[]>(`
    SELECT ara.agent_id, ara.role_name, ara.assigned_by, ara.created_at,
           a.name as agent_name, a.role as agent_role, a.avatar
    FROM agent_role_assignments ara
    JOIN ai_agents a ON a.agent_id = ara.agent_id
    ORDER BY ara.role_name, a.name
  `);

  // Also get user counts per role for display
  const roleCounts = await query<any[]>(`
    SELECT job_position, COUNT(*) as user_count
    FROM users
    WHERE job_position IS NOT NULL AND job_position != '' AND is_active = 1
    GROUP BY job_position
    ORDER BY job_position
  `);

  return NextResponse.json({
    success: true,
    positions: positions.map(p => p.job_position),
    assignments,
    roleCounts
  });
}

/**
 * POST /api/admin/roles
 * Assign an agent to a role
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const { agent_id, role_name } = await req.json();
  if (!agent_id || !role_name) {
    return NextResponse.json({ success: false, error: 'agent_id and role_name required' }, { status: 400 });
  }

  await query(
    'INSERT IGNORE INTO agent_role_assignments (agent_id, role_name, assigned_by) VALUES (?, ?, ?)',
    [agent_id, role_name, user.username]
  );

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/roles
 * Remove agent from role
 */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const agent_id = searchParams.get('agent_id');
  const role_name = searchParams.get('role_name');

  if (!agent_id || !role_name) {
    return NextResponse.json({ success: false, error: 'agent_id and role_name required' }, { status: 400 });
  }

  await query(
    'DELETE FROM agent_role_assignments WHERE agent_id = ? AND role_name = ?',
    [agent_id, role_name]
  );

  return NextResponse.json({ success: true });
}
