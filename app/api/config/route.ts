import { NextRequest, NextResponse } from 'next/server';
import { BrainModel } from '@/models/BrainModel';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;
    const user = auth.user;

    // Check if nocache parameter is set
    const { searchParams } = new URL(request.url);
    const noCache = searchParams.get('nocache') === '1';

    // For non-admin users, filter team members by their organizational assignments
    const username = user.role === 'admin' ? undefined : user.username;
    
    console.log(`[CONFIG API] Loading config for user: ${user.username}, role: ${user.role}, filtering by username: ${username || 'NO (admin)'}, nocache: ${noCache}`);

    const [configs, defaults, projectRows] = await Promise.all([
      BrainModel.getAllConfigs(username).catch(err => {
        console.error('Error loading configs:', err);
        return { team: [], status: [], priority: [], progress: [], categories: [] };
      }),
      BrainModel.getDefaults().catch(err => {
        console.error('Error loading defaults:', err);
        return {};
      }),
      query<any[]>('SELECT project_id, project_name FROM projects ORDER BY created_at DESC').catch(err => {
        console.error('Error loading projects:', err);
        return [];
      })
    ]);

    console.log(`[CONFIG API] Team members loaded: ${configs.team?.length || 0} members`);
    if (configs.team && configs.team.length > 0) {
      console.log(`[CONFIG API] Team members:`, configs.team.map((t: any) => t.value || t).join(', '));
    }

    return NextResponse.json({
      success: true,
      data: {
        ...configs,
        projects: projectRows.map(p => p.project_id),
        projectOptions: projectRows,
        defaults
      }
    }, {
      headers: { 
        'Cache-Control': noCache ? 'no-store, no-cache, must-revalidate' : 'no-store',
        'Pragma': noCache ? 'no-cache' : 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Config API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to load configuration'
    }, { status: 500 });
  }
}
