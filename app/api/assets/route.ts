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

    // Write the static assets.json fallback for standalone/static environments like GitHub Pages and VS Code Live Server
    try {
        fs.writeFileSync(path.join(root, 'public', 'assets.json'), JSON.stringify(assets, null, 2));
    } catch (e) {
        console.error('Failed to write public/assets.json static fallback', e);
    }

    return NextResponse.json(assets);
}
