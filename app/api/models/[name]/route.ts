import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ name: string }> }
) {
    try {
        const { name } = await context.params;
        if (!name) {
            return new NextResponse('Missing model name parameter', { status: 400 });
        }

        // Decode the filename
        const filename = decodeURIComponent(name);
        const root = process.cwd();

        // Check both directories (public/models and root models)
        let filePath = path.join(root, 'public', 'models', filename);
        if (!fs.existsSync(filePath)) {
            filePath = path.join(root, 'models', filename);
        }

        if (!fs.existsSync(filePath)) {
            console.error(`Model file not found: ${filename} (resolved path: ${filePath})`);
            return new NextResponse(`Model file "${filename}" not found`, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);

        // Set octet-stream and content length
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Content-Length': fileBuffer.length.toString()
            }
        });
    } catch (e: any) {
        console.error('Error in model handler:', e);
        return new NextResponse('Internal error reading model: ' + e.message, { status: 500 });
    }
}
