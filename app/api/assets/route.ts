import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    const root = process.cwd();
    const assets = {
        textures: [],
        models: [],
        skyBoxes: []
    };

    ['textures', 'models', 'skyBoxes'].forEach(type => {
        const publicDir = path.join(root, 'public', type);
        const rootDir = path.join(root, type);
        let items: string[] = [];

        if (fs.existsSync(publicDir)) {
            items = items.concat(fs.readdirSync(publicDir).filter(f => !f.startsWith('.')));
        }
        if (fs.existsSync(rootDir)) {
            items = items.concat(fs.readdirSync(rootDir).filter(f => !f.startsWith('.')));
        }

        // De-duplicate items
        assets[type] = Array.from(new Set(items));
    });

    return NextResponse.json(assets);
}
