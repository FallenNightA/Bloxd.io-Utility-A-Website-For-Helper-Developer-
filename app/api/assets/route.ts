import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    const root = process.cwd();

    // Migrate root folders to public/ to enable serving them statically
    [
        { srcName: 'skyBoxes', destName: 'public/skyBoxes' },
        { srcName: 'models', destName: 'public/models' },
        { srcName: 'textures', destName: 'public/textures' },
        { srcName: 'textures2', destName: 'public/textures' },
        { srcName: 'textures3', destName: 'public/textures' }
    ].forEach(({ srcName, destName }) => {
        const src = path.join(root, srcName);
        const dest = path.join(root, destName);
        if (fs.existsSync(src)) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }
            
            const moveRecursive = (srcDir: string, destDir: string) => {
                const entries = fs.readdirSync(srcDir);
                entries.forEach(entry => {
                    if (entry.startsWith('.')) return;
                    const srcPath = path.join(srcDir, entry);
                    const destPath = path.join(destDir, entry);
                    if (fs.statSync(srcPath).isDirectory()) {
                        if (!fs.existsSync(destPath)) {
                            fs.mkdirSync(destPath, { recursive: true });
                        }
                        moveRecursive(srcPath, destPath);
                        try {
                            fs.rmdirSync(srcPath);
                        } catch (e) {}
                    } else {
                        try {
                            if (!fs.existsSync(destPath)) {
                                fs.renameSync(srcPath, destPath);
                            } else {
                                fs.unlinkSync(srcPath);
                            }
                        } catch (e) {
                            console.error(`Failed to move file ${srcPath} to ${destPath}`, e);
                        }
                    }
                });
            };
            
            moveRecursive(src, dest);
            try {
                fs.rmdirSync(src);
            } catch (e) {}
        }
    });

    const assets: { textures: string[]; models: string[]; skyBoxes: string[] } = {
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
        if (type === 'textures' || type === 'models' || type === 'skyBoxes') {
            assets[type] = Array.from(new Set(items));
        }
    });

    // Write the static assets.json fallback for standalone/static environments like GitHub Pages and VS Code Live Server
    try {
        fs.writeFileSync(path.join(root, 'public', 'assets.json'), JSON.stringify(assets, null, 2));
    } catch (e) {
        console.error('Failed to write public/assets.json static fallback', e);
    }

    return NextResponse.json(assets);
}

