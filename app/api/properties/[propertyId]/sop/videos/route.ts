import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();

    try {
        // Auth: try getUser first (secure), fallback to getSession
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        let authenticatedUser = user;
        if (!authenticatedUser) {
            console.warn('[SOP Video Upload] getUser failed/returned null, trying getSession fallback...');
            const { data: { session } } = await supabase.auth.getSession();
            authenticatedUser = session?.user || null;
        }

        if (!authenticatedUser) {
            console.error('[SOP Video Upload] Auth Error:', {
                error: authError?.message,
                status: authError?.status,
                hasUser: !!user,
                propertyId
            });
            return NextResponse.json({
                error: 'Unauthorized',
                details: 'Please ensure you are logged in. (Session not found)'
            }, { status: 401 });
        }

        console.log('[SOP Video Upload] Auth Success:', { userId: authenticatedUser.id, propertyId });

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const completionId = formData.get('completionId') as string;
        const completionItemId = formData.get('completionItemId') as string;

        if (!file) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 });
        }

        if (!completionId || !completionItemId) {
            return NextResponse.json(
                { error: 'completionId and completionItemId are required' },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Determine file extension from content type
        const ext = file.type.includes('mp4') ? 'mp4' : 'webm';
        const contentType = file.type || (ext === 'mp4' ? 'video/mp4' : 'video/webm');

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${completionId}/${completionItemId}-${timestamp}.${ext}`;
        const filePath = `sop-videos/${propertyId}/${filename}`;

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
            .from('sop-videos')
            .upload(filePath, buffer, {
                contentType,
                upsert: false,
            });

        if (uploadError) {
            return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }

        // Get public URL
        const { data: publicData } = supabase.storage
            .from('sop-videos')
            .getPublicUrl(filePath);

        return NextResponse.json(
            {
                success: true,
                url: publicData.publicUrl,
                path: filePath,
            },
            { status: 201 }
        );
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
