import { NextRequest, NextResponse } from 'next/server';
import { ChatModel } from '@/models/ChatModel';
import { getSessionUser } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const agent = await ChatModel.getAgentById(params.id);
    if (!agent) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, agent });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    // Check ownership: admin can edit all, users can only edit their own agents
    if (user.role !== 'admin') {
      const { query } = await import('@/lib/db');
      const agents = await query<any[]>('SELECT created_by, is_personal FROM ai_agents WHERE agent_id = ?', [params.id]);
      if (!agents[0]) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
      if (agents[0].created_by !== user.username) {
        return NextResponse.json({ success: false, error: 'You can only edit agents you created' }, { status: 403 });
      }
    }
    
    const data = await req.json();
    await ChatModel.updateAgent(params.id, data);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    // Check ownership: admin can delete all, users can only delete their own agents
    const { query } = await import('@/lib/db');
    const agents = await query<any[]>('SELECT created_by, is_personal FROM ai_agents WHERE agent_id = ?', [params.id]);
    if (!agents[0]) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });
    
    if (user.role !== 'admin' && agents[0].created_by !== user.username) {
      return NextResponse.json({ success: false, error: 'You can only delete agents you created' }, { status: 403 });
    }
    
    // Delete agent conversations and messages first
    await query('DELETE FROM chat_messages WHERE conv_id IN (SELECT conv_id FROM chat_conversations WHERE agent_id = ?)', [params.id]);
    await query('DELETE FROM chat_members WHERE conv_id IN (SELECT conv_id FROM chat_conversations WHERE agent_id = ?)', [params.id]);
    await query('DELETE FROM chat_conversations WHERE agent_id = ?', [params.id]);
    await query('DELETE FROM ai_agent_memory WHERE agent_id = ?', [params.id]);
    await query('DELETE FROM ai_agents WHERE agent_id = ?', [params.id]);
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
