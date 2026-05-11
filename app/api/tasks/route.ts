import { NextRequest, NextResponse } from 'next/server';
import { TaskModel } from '@/models/TaskModel';
import { ProjectModel } from '@/models/ProjectModel';
import { getAuditActor, requireUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;
    const { user } = auth;

    // Get user's hierarchy info
    const userInfo = await query<any[]>(
      'SELECT hierarchy_level, division, org_unit_id FROM users WHERE username = ?',
      [user.username]
    );
    
    const currentUser = {
      username: user.username,
      full_name: user.full_name || user.username,
      role: user.role,
      hierarchy_level: userInfo[0]?.hierarchy_level || 'staff',
      division: userInfo[0]?.division,
      org_unit_id: userInfo[0]?.org_unit_id
    };

    let tasks;
    if (user.role === 'admin') {
      // Admin sees all tasks
      tasks = await TaskModel.getAll();
    } else {
      // Use hierarchy filtering
      const { getHierarchyFilterSQL } = await import('@/lib/hierarchy-utils');
      const hierarchyFilter = getHierarchyFilterSQL(currentUser, 't');
      
      tasks = await query<any[]>(`
        SELECT * FROM tasks t
        WHERE ${hierarchyFilter}
        ORDER BY t.updated_at DESC
      `);
    }
    
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;

    const body = await request.json();
    const result = await TaskModel.create(body, getAuditActor(auth.user));
    
    if (result.success) {
      // Sync project due_date after creating task with due_date
      if (body.due_date && body.project_id) {
        await ProjectModel.syncDueDate(body.project_id);
      }
      return NextResponse.json({ success: true, id: result.id });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
