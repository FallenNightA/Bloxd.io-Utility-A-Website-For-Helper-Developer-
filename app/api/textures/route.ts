import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    const root = process.cwd();
    const dest = path.join(root, 'public', 'textures');
    
    // Ensure merged
    ['textures', 'textures2', 'textures3'].forEach(dir => {
        const src = path.join(root, dir);
        if (fs.existsSync(src)) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            
            fs.readdirSync(src).forEach(file => {
                const srcFile = path.join(src, file);
                const destFile = path.join(dest, file);
                try {
                    fs.renameSync(srcFile, destFile);
                } catch (e) {
                    console.error('Failed to move', srcFile);
                }
            });
            try {
                fs.rmdirSync(src);
            } catch(e) {}
        }
    });

    if (fs.existsSync(dest)) {
        const files = fs.readdirSync(dest).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.glb'));
        return NextResponse.json({ files });
    }

    return NextResponse.json({ files: [] });
}
