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

if (fs.existsSync(path.join(__dirname, 'textures'))) fs.rmdirSync(path.join(__dirname, 'textures'));
if (fs.existsSync(path.join(__dirname, 'textures2'))) fs.rmdirSync(path.join(__dirname, 'textures2'));
if (fs.existsSync(path.join(__dirname, 'textures3'))) fs.rmdirSync(path.join(__dirname, 'textures3'));

// do the same for models and skyBoxes
const pubModels = path.join(__dirname, 'public', 'models');
mergeDirs(path.join(__dirname, 'models'), pubModels);
if (fs.existsSync(path.join(__dirname, 'models'))) fs.rmdirSync(path.join(__dirname, 'models'));

const pubSky = path.join(__dirname, 'public', 'skyBoxes');
mergeDirs(path.join(__dirname, 'skyBoxes'), pubSky);
if (fs.existsSync(path.join(__dirname, 'skyBoxes'))) fs.rmdirSync(path.join(__dirname, 'skyBoxes'));
