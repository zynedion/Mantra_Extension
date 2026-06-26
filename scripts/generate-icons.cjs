const fs = require('fs');
const path = require('path');

// Read the source PNG as binary
const sourceImagePath = process.argv[2];
if (!sourceImagePath || !fs.existsSync(sourceImagePath)) {
  console.error('Usage: node generate-icons.cjs <source-image-path>');
  process.exit(1);
}

const outputDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// We'll copy the full-size image for all icon sizes
// Chrome will scale them appropriately at display time
const sizes = [16, 48, 128];
const sourceData = fs.readFileSync(sourceImagePath);

sizes.forEach(size => {
  const outPath = path.join(outputDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, sourceData);
  console.log(`Created: ${outPath}`);
});

console.log('\nAll icons generated successfully!');
console.log('Note: All icons use the full-resolution image; Chrome scales automatically.');
