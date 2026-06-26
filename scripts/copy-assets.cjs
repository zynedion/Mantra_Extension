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
console.log('✓ manifest.json copied');

// Copy icons
if (fs.existsSync('public/icons')) {
  copyRecursiveSync('public/icons', 'dist/public/icons');
  console.log('✓ icons copied to dist/public/icons/');
}

// Copy content script CSS statically
if (fs.existsSync('src/styles/content.css')) {
  copyRecursiveSync('src/styles/content.css', 'dist/src/styles/content.css');
  console.log('✓ content.css copied');
}

// Move popup.html and options.html from dist/public/ to dist/ root
// Then fix absolute paths (/foo.js) → relative paths (./foo.js) for Chrome extensions
const htmlFiles = ['popup.html', 'options.html'];
htmlFiles.forEach(file => {
  const src = path.join('dist', 'public', file);
  const dest = path.join('dist', file);
  if (fs.existsSync(src)) {
    let html = fs.readFileSync(src, 'utf8');

    // Fix absolute src/href paths → relative (Chrome extension requirement)
    html = html.replace(/(src|href)="\//g, '$1="./');

    fs.writeFileSync(dest, html);
    fs.unlinkSync(src);
    console.log(`✓ ${file} moved to dist/ root with relative paths fixed`);
  } else if (fs.existsSync(dest)) {
    // Already at dest, just fix paths
    let html = fs.readFileSync(dest, 'utf8');
    html = html.replace(/(src|href)="\//g, '$1="./');
    fs.writeFileSync(dest, html);
    console.log(`✓ ${file} paths fixed in-place`);
  } else {
    console.warn(`⚠ ${file} not found - skipping`);
  }
});

console.log('\nAll assets processed successfully!');
