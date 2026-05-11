import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

/** GET /api/admin/users - list all users */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const users = await query<any[]>(
    `SELECT username, full_name, email, job_position, organization, avatar, role, is_active, employee_id, phone, created_at
     FROM users ORDER BY full_name ASC`
  );

  return NextResponse.json({ success: true, users });
}

/** POST /api/admin/users - create new user/employee */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { username, password, full_name, email, job_position, organization, role, phone, employee_id } = body;

  if (!username || !password || !full_name) {
    return NextResponse.json({ success: false, error: 'username, password, and full_name are required' }, { status: 400 });
  }

  // Check if username already exists
  const existing = await query<any[]>('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length > 0) {
    return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 400 });
  }

  // Check if email already exists (if provided)
  if (email) {
    const existingEmail = await query<any[]>('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 400 });
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  await query(
    `INSERT INTO users (username, password, full_name, email, job_position, organization, role, phone, employee_id, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [username, hashedPassword, full_name, email || null, job_position || null, organization || null, role || 'user', phone || null, employee_id || null]
  );

  // Auto-sync job_position to user_roles
  if (job_position) {
    await query(
      'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, ?)',
      [username, job_position, user.username]
    );
  }

  // Auto-create personal AI assistant for new employee
  try {
    const agentId = `agent_${username}_${Date.now()}`;
    const agentName = `${full_name}'s AI Assistant`;
    const systemPrompt = `You are a personal AI assistant for ${full_name}. You help them with:
- Task management and prioritization
- Project planning and tracking
- Daily work organization
- Quick information lookup
- Productivity tips and reminders

Be friendly, proactive, and helpful. Always address them by their name when appropriate.`;

    await query(
      `INSERT INTO ai_agents (agent_id, name, role, system_prompt, model, is_personal, owner_username, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, 1, NOW())`,
      [agentId, agentName, 'Personal Assistant', systemPrompt, 'gemini-2.5-flash', username]
    );

    console.log(`✅ Auto-created personal AI assistant for ${username}`);
  } catch (aiErr) {
    console.error('Failed to create personal AI assistant:', aiErr);
    // Don't fail the whole request if AI creation fails
  }

  return NextResponse.json({ success: true, message: 'Employee created successfully with personal AI assistant' });
}

/** PUT /api/admin/users - update any user */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { username, full_name, email, job_position, organization, avatar, role, is_active, phone, password } = body;

  if (!username) return NextResponse.json({ success: false, error: 'username required' }, { status: 400 });

  // If password is being updated, hash it
  if (password && password.trim()) {
    const hashedPassword = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users SET password = ? WHERE username = ?`,
      [hashedPassword, username]
    );
  }

  await query(
    `UPDATE users SET
      full_name = COALESCE(?, full_name),
      email = COALESCE(?, email),
      job_position = COALESCE(?, job_position),
      organization = COALESCE(?, organization),
      avatar = COALESCE(?, avatar),
      role = COALESCE(?, role),
      is_active = COALESCE(?, is_active),
      phone = COALESCE(?, phone),
      updated_at = NOW()
     WHERE username = ?`,
    [full_name, email, job_position, organization, avatar, role, is_active, phone, username]
  );

  // Sync job_position to user_roles if changed
  if (job_position) {
    await query(
      'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, ?)',
      [username, job_position, user.username]
    );
  }

  return NextResponse.json({ success: true });
}
