const fs = require('fs');
const path = require('path');

const root = process.cwd();
const assets = {
    textures: [],
    models: [],
    skyBoxes: []
};

['textures', 'models', 'skyBoxes'].forEach(type => {
    const publicDir = path.join(root, 'public', type);
    const rootDir = path.join(root, type);
    let items = [];

    if (fs.existsSync(publicDir)) {
        items = items.concat(fs.readdirSync(publicDir).filter(f => !f.startsWith('.')));
    }
    if (fs.existsSync(rootDir)) {
        items = items.concat(fs.readdirSync(rootDir).filter(f => !f.startsWith('.')));
    }

    // De-duplicate items
    assets[type] = Array.from(new Set(items));
});

fs.writeFileSync(path.join(root, 'public', 'assets.json'), JSON.stringify(assets, null, 2));
console.log('Successfully generated public/assets.json fallback file!');
