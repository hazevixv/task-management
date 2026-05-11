import { NextRequest, NextResponse } from 'next/server';
import { ChatModel } from '@/models/ChatModel';
import { getSessionUser } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const convs = await ChatModel.getConversationsForUser(user.username);
    return NextResponse.json({ success: true, conversations: convs });
  } catch (e: any) {
    console.error('[Chat Conversations GET] Error:', e);
    
    // Check if error is due to missing tables
    if (e.message?.includes('ER_NO_SUCH_TABLE') || e.message?.includes("doesn't exist")) {
      return NextResponse.json({ 
        success: false, 
        error: 'Chat database tables not found. Please run CHAT-DATABASE-SETUP.sql first.',
        hint: 'Check 00-documentation/CHAT-DATABASE-SETUP.sql'
      }, { status: 500 });
    }
    
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { type, name, members, agentId, email } = body;

    let convId: string;
    if (type === 'direct') {
      // Support both username and email for direct messages
      let targetUsername: string;
      
      if (email && email.trim()) {
        // Look up user by email
        const { query } = await import('@/lib/db');
        const users = await query<any[]>(
          'SELECT username, full_name FROM users WHERE email = ? AND is_active = 1',
          [email.trim()]
        );
        
        if (!users[0]) {
          return NextResponse.json({ 
            success: false, 
            error: 'User not found with that email address' 
          }, { status: 404 });
        }
        
        targetUsername = users[0].username;
      } else if (members?.[0]) {
        targetUsername = members[0];
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Target user email or username required' 
        }, { status: 400 });
      }
      
      // Check if trying to message yourself
      if (targetUsername === user.username) {
        return NextResponse.json({ 
          success: false, 
          error: 'Cannot create direct message with yourself' 
        }, { status: 400 });
      }
      
      convId = await ChatModel.createDirectConversation(user.username, targetUsername);
    } else if (type === 'group') {
      if (!name) return NextResponse.json({ success: false, error: 'Group name required' }, { status: 400 });
      convId = await ChatModel.createGroupConversation(name, members || [], user.username);
    } else if (type === 'ai_agent' || type === 'ai_personal') {
      if (!agentId) return NextResponse.json({ success: false, error: 'Agent ID required' }, { status: 400 });
      convId = await ChatModel.createAIAgentConversation(user.username, agentId, type === 'ai_personal');
    } else {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }

    const conv = await ChatModel.getConversationById(convId);
    return NextResponse.json({ success: true, conversation: conv, conv_id: convId });
  } catch (e: any) {
    console.error('[Chat Conversations POST] Error:', e);
    
    // Check if error is due to missing tables
    if (e.message?.includes('ER_NO_SUCH_TABLE') || e.message?.includes("doesn't exist")) {
      return NextResponse.json({ 
        success: false, 
        error: 'Chat database tables not found. Please run COMPLETE-DATABASE-MIGRATION.sql first.',
        hint: 'Check 00-documentation/COMPLETE-DATABASE-MIGRATION.sql'
      }, { status: 500 });
    }
    
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
