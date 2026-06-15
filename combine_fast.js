const fs = require('fs');
const path = require('path');

function mergeDirs(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    
    fs.readdirSync(src).forEach(file => {
        fs.renameSync(path.join(src, file), path.join(dest, file));
    });
}

const pubTex = path.join(__dirname, 'public', 'textures');
mergeDirs(path.join(__dirname, 'textures'), pubTex);
mergeDirs(path.join(__dirname, 'textures2'), pubTex);
mergeDirs(path.join(__dirname, 'textures3'), pubTex);

const pubModels = path.join(__dirname, 'public', 'models');
mergeDirs(path.join(__dirname, 'models'), pubModels);

const pubSky = path.join(__dirname, 'public', 'skyBoxes');
mergeDirs(path.join(__dirname, 'skyBoxes'), pubSky);

console.log('done');
