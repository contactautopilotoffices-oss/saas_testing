import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/frontend/utils/supabase/admin';
import { createClient } from '@/frontend/utils/supabase/server';
import { getMCPClient } from '@/lib/mcp-client';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `
You are the Autopilot Intelligence Assistant, a professional expert in facility management operations.
You have access to a Supabase database via MCP tools. Use these tools to answer user questions about tickets, properties, users, and organizations.

Table Schema Overview:
- tickets: id, title, description, category, status, priority, property_id, organization_id, raised_by, created_at
- properties: id, name, code, organization_id
- users: id, full_name, email, is_master_admin
- organizations: id, name, code

Default Context:
- The primary focus is the 'Autopilot Offices' organization.
- If a user asks about "projects", "properties", or "tickets", assume they mean 'Autopilot Offices'.
- 'Autopilot Offices' might have a trailing newline; use ILIKE '%Autopilot Offices%' in your queries.

Guidelines:
1. Always use 'ILIKE' with '%' wildcards for text filtering to handle variations.
2. Use 'execute_sql' for complex queries or joins.
3. Be concise and professional.
`;

async function callGroq(messages: any[], tools?: any[]) {
    const body: any = {
        model: MODEL,
        messages,
        temperature: 0.1,
    };

    if (tools && tools.length > 0) {
        body.tools = tools.map((tool: any) => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema
            }
        }));
        body.tool_choice = 'auto';
    }

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message;
}

export async function POST(req: NextRequest) {
    try {
        const { question } = await req.json();
        if (!question) {
            return NextResponse.json({ error: 'Question is required' }, { status: 400 });
        }

        // 1. Verify Master Admin
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
            .from('users')
            .select('is_master_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_master_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Setup MCP
        const mcpClient = await getMCPClient();
        const { tools } = await mcpClient.listTools();

        // 3. Initial Call to Groq
        const messages: any[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: question }
        ];

        let response = await callGroq(messages, tools);
        let sqlUsed = '';

        // 4. Handle Tool Calls
        if (response.tool_calls) {
            messages.push(response);

            for (const toolCall of response.tool_calls) {
                const toolName = toolCall.function.name;
                const toolArgs = JSON.parse(toolCall.function.arguments);

                console.log(`[Chatbot] Calling tool: ${toolName}`, toolArgs);

                if (toolName === 'execute_sql' && toolArgs.sql) {
                    sqlUsed = toolArgs.sql;
                }

                const result = await mcpClient.callTool({
                    name: toolName,
                    arguments: toolArgs
                });

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: toolName,
                    content: JSON.stringify(result)
                });
            }

            // Get final response from Groq
            response = await callGroq(messages);
        }

        return NextResponse.json({
            answer: response.content,
            sql: sqlUsed
        });

    } catch (error: any) {
        console.error('[Chatbot API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
