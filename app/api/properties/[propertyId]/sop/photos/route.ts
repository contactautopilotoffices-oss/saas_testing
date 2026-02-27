import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    const { propertyId } = await params;
    const supabase = await createClient();

    try {
        // Try getUser first (secure), with a fallback to getSession if it fails/slows down
        // Note: in high-latency environments, getUser can be unreliable
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        let authenticatedUser = user;
        if (!authenticatedUser) {
            console.warn('[SOP Photo Upload] getUser failed/returned null, trying getSession fallback...');
            const { data: { session } } = await supabase.auth.getSession();
            authenticatedUser = session?.user || null;
        }

        if (!authenticatedUser) {
            console.error('[SOP Photo Upload] Auth Error:', {
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

        console.log('[SOP Photo Upload] Auth Success:', { userId: authenticatedUser.id, propertyId });


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

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${completionId}/${completionItemId}-${timestamp}.webp`;
        const filePath = `sop-photos/${propertyId}/${filename}`;

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
            .from('sop-photos')
            .upload(filePath, buffer, {
                contentType: 'image/webp',
                upsert: false,
            });

        if (uploadError) {
            return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }

        // Get public URL
        const { data: publicData } = supabase.storage
            .from('sop-photos')
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
