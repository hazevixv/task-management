import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/api-auth';
import { getHierarchyFilterSQL } from '@/lib/hierarchy-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;
    const username = auth.user.username;
    const isAdmin = auth.user.role === 'admin';

    // Get user's hierarchy info with fallback
    const userInfo = await query<any[]>(
      'SELECT hierarchy_level, org_unit_id FROM users WHERE username = ?',
      [username]
    ).catch(() => [{ hierarchy_level: 'staff', org_unit_id: null }]);
    
    const currentUser = {
      username,
      full_name: auth.user.full_name || username,
      role: auth.user.role,
      hierarchy_level: userInfo[0]?.hierarchy_level || 'staff',
      division: '',
      org_unit_id: userInfo[0]?.org_unit_id
    };

    // Build hierarchy filter for projects and tasks - use simple filter if hierarchy not available
    let projectFilter = '1=1';
    let taskFilter = '1=1';
    
    try {
      projectFilter = isAdmin ? '1=1' : getHierarchyFilterSQL(currentUser, 'p');
      taskFilter = isAdmin ? '1=1' : getHierarchyFilterSQL(currentUser, 't');
    } catch (e) {
      // Fallback to simple user-based filtering
      projectFilter = isAdmin ? '1=1' : `(p.owner = '${username}' OR p.assignees LIKE '%${username}%')`;
      taskFilter = isAdmin ? '1=1' : `(t.assignees LIKE '%${username}%')`;
    }

    // Use Promise.allSettled instead of Promise.all to prevent one failure from breaking everything
    const results = await Promise.allSettled([
      // Projects: with hierarchy filtering
      query(`
        SELECT p.*, COUNT(t.id) as task_count
        FROM projects p
        LEFT JOIN tasks t ON p.project_id = t.project_id
        WHERE ${projectFilter}
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `),
      
      // Tasks: with hierarchy filtering
      query(`
        SELECT * FROM tasks t
        WHERE ${taskFilter}
        ORDER BY t.updated_at DESC
      `),
      
      // Stats: admin sees all, users see only their stats
      isAdmin
        ? query(`
            SELECT
              (SELECT COUNT(*) FROM projects) as totalProjects,
              (SELECT COUNT(*) FROM projects WHERE status = 'Active') as activeProjects,
              (SELECT COUNT(*) FROM tasks) as totalTasks,
              (SELECT COUNT(*) FROM tasks WHERE status NOT IN ('Done', 'Backlog', 'Closed')) as activeTasks,
              (SELECT COUNT(*) FROM tasks WHERE status = 'Done') as doneTasks,
              (SELECT COUNT(*) FROM tasks WHERE priority = 'Urgent' AND status NOT IN ('Done','Closed')) as urgent,
              (SELECT COUNT(*) FROM tasks WHERE due_date < CURDATE() AND status NOT IN ('Done','Closed')) as overdue,
              (SELECT COALESCE(ROUND(AVG(progress), 1), 0) FROM projects) as avgProgress,
              (SELECT COUNT(*) FROM tasks WHERE due_date = CURDATE() AND status NOT IN ('Done','Closed')) as dueToday,
              (SELECT COUNT(*) FROM tasks WHERE due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status NOT IN ('Done','Closed')) as dueThisWeek
          `)
        : query(`
            SELECT
              (SELECT COUNT(*) FROM projects WHERE owner = ? OR assignees LIKE ?) as totalProjects,
              (SELECT COUNT(*) FROM projects WHERE (owner = ? OR assignees LIKE ?) AND status = 'Active') as activeProjects,
              (SELECT COUNT(*) FROM tasks WHERE assignees LIKE ?) as totalTasks,
              (SELECT COUNT(*) FROM tasks WHERE assignees LIKE ? AND status NOT IN ('Done', 'Backlog', 'Closed')) as activeTasks,
              (SELECT COUNT(*) FROM tasks WHERE assignees LIKE ? AND status = 'Done') as doneTasks,
              (SELECT COUNT(*) FROM tasks WHERE assignees LIKE ? AND priority = 'Urgent' AND status NOT IN ('Done','Closed')) as urgent,
              (SELECT COUNT(*) FROM tasks WHERE assignees LIKE ? AND due_date < CURDATE() AND status NOT IN ('Done','Closed')) as overdue,
              (SELECT COALESCE(ROUND(AVG(progress), 1), 0) FROM projects WHERE owner = ? OR assignees LIKE ?) as avgProgress,
              (SELECT COUNT(*) FROM tasks WHERE assignees LIKE ? AND due_date = CURDATE() AND status NOT IN ('Done','Closed')) as dueToday,
              (SELECT COUNT(*) FROM tasks WHERE assignees LIKE ? AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status NOT IN ('Done','Closed')) as dueThisWeek
          `, [username, `%${username}%`, username, `%${username}%`, `%${username}%`, `%${username}%`, `%${username}%`, `%${username}%`, `%${username}%`, username, `%${username}%`, `%${username}%`, `%${username}%`]),
      
      // Status breakdown: filter by user
      isAdmin
        ? query(`SELECT status, COUNT(*) as cnt FROM tasks GROUP BY status ORDER BY cnt DESC`)
        : query(`SELECT status, COUNT(*) as cnt FROM tasks WHERE assignees LIKE ? GROUP BY status ORDER BY cnt DESC`, [`%${username}%`]),
      
      // Priority breakdown: filter by user
      isAdmin
        ? query(`SELECT priority, COUNT(*) as cnt FROM tasks GROUP BY priority ORDER BY cnt DESC`)
        : query(`SELECT priority, COUNT(*) as cnt FROM tasks WHERE assignees LIKE ? GROUP BY priority ORDER BY cnt DESC`, [`%${username}%`]),
      
      // Category breakdown: filter by user
      isAdmin
        ? query(`SELECT category, COUNT(*) as cnt FROM projects GROUP BY category ORDER BY cnt DESC`)
        : query(`SELECT category, COUNT(*) as cnt FROM projects WHERE owner = ? OR assignees LIKE ? GROUP BY category ORDER BY cnt DESC`, [username, `%${username}%`]),
      
      // My tasks (same for all users)
      query(`
        SELECT t.*, p.project_name
        FROM tasks t
        LEFT JOIN projects p ON p.project_id = t.project_id
        WHERE t.assignees LIKE ? AND t.status NOT IN ('Done','Closed')
        ORDER BY
          CASE t.priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 WHEN 'Normal' THEN 3 ELSE 4 END,
          CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
          t.due_date ASC
        LIMIT 10
      `, [`%${username}%`]),
      
      // Weekly progress: filter by user
      isAdmin
        ? query(`
            SELECT
              DATE(created_at) as day,
              COUNT(*) as created,
              SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done
            FROM tasks
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY day ASC
          `)
        : query(`
            SELECT
              DATE(created_at) as day,
              COUNT(*) as created,
              SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done
            FROM tasks
            WHERE assignees LIKE ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY day ASC
          `, [`%${username}%`]),
      
      // Logs: filter by user (only show logs for their projects/tasks)
      isAdmin
        ? query(`
            SELECT 
              id, timestamp as changed_at, item_type, item_id, item_name, project_name,
              change_type, from_version, to_version, from_value, to_value, changed_by, notes
            FROM weekly_snapshot 
            ORDER BY timestamp DESC 
            LIMIT 200
          `)
        : query(`
            SELECT 
              id, timestamp as changed_at, item_type, item_id, item_name, project_name,
              change_type, from_version, to_version, from_value, to_value, changed_by, notes
            FROM weekly_snapshot 
            WHERE changed_by = ? OR item_id IN (
              SELECT project_id FROM projects WHERE owner = ? OR assignees LIKE ?
              UNION
              SELECT task_id FROM tasks WHERE assignees LIKE ?
            )
            ORDER BY timestamp DESC 
            LIMIT 200
          `, [username, username, `%${username}%`, `%${username}%`])
    ]);

    // Extract results with fallbacks
    const projects = results[0].status === 'fulfilled' ? results[0].value : [];
    const tasks = results[1].status === 'fulfilled' ? results[1].value : [];
    const stats = results[2].status === 'fulfilled' ? results[2].value : [{}];
    const byStatus = results[3].status === 'fulfilled' ? results[3].value : [];
    const byPriority = results[4].status === 'fulfilled' ? results[4].value : [];
    const byCategory = results[5].status === 'fulfilled' ? results[5].value : [];
    const myTasks = results[6].status === 'fulfilled' ? results[6].value : [];
    const weeklyProgress = results[7].status === 'fulfilled' ? results[7].value : [];
    const logs = results[8].status === 'fulfilled' ? results[8].value : [];

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Dashboard query ${index} failed:`, result.reason);
      }
    });

    const byStatusObj: Record<string, number> = {};
    const byPriorityObj: Record<string, number> = {};
    const byCategoryObj: Record<string, number> = {};
    (byStatus as any[]).forEach(r => { byStatusObj[r.status] = Number(r.cnt); });
    (byPriority as any[]).forEach(r => { byPriorityObj[r.priority] = Number(r.cnt); });
    (byCategory as any[]).forEach(r => { byCategoryObj[r.category] = Number(r.cnt); });

    const s = (stats as any[])[0] || {};

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalProjects: Number(s.totalProjects) || 0,
          activeProjects: Number(s.activeProjects) || 0,
          totalTasks: Number(s.totalTasks) || 0,
          activeTasks: Number(s.activeTasks) || 0,
          doneTasks: Number(s.doneTasks) || 0,
          urgent: Number(s.urgent) || 0,
          overdue: Number(s.overdue) || 0,
          avgProgress: s.avgProgress || '0',
          dueToday: Number(s.dueToday) || 0,
          dueThisWeek: Number(s.dueThisWeek) || 0,
        },
        projects,
        tasks,
        logs: logs || [],
        myTasks,
        recentActivity: tasks.slice(0, 8),
        weeklyProgress,
        byStatus: byStatusObj,
        byPriority: byPriorityObj,
        byCategory: byCategoryObj
      }
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error',
      data: {
        stats: {
          totalProjects: 0,
          activeProjects: 0,
          totalTasks: 0,
          activeTasks: 0,
          doneTasks: 0,
          urgent: 0,
          overdue: 0,
          avgProgress: '0',
          dueToday: 0,
          dueThisWeek: 0,
        },
        projects: [],
        tasks: [],
        logs: [],
        myTasks: [],
        recentActivity: [],
        weeklyProgress: [],
        byStatus: {},
        byPriority: {},
        byCategory: {}
      }
    }, { status: 500 });
  }
}
