const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy manifest
fs.copyFileSync('manifest.json', 'dist/manifest.json');

// Copy icons
if (fs.existsSync('public/icons')) {
  copyRecursiveSync('public/icons', 'dist/public/icons');
}

// Copy content script CSS statically
if (fs.existsSync('src/styles/content.css')) {
  copyRecursiveSync('src/styles/content.css', 'dist/src/styles/content.css');
}

console.log('Manifest, icons and content CSS copied successfully to dist/');
