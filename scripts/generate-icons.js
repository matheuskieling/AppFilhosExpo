const sharp = require('sharp');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

async function generateIcons() {
  const svgPath = path.join(assetsDir, 'icon-source.svg');

  // Main icon (1024x1024)
  await sharp(svgPath)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('Created icon.png');

  // Adaptive icon foreground (1024x1024)
  await sharp(svgPath)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('Created adaptive-icon.png');

  // Splash icon (smaller, centered)
  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('Created splash-icon.png');

  // Favicon (48x48)
  await sharp(svgPath)
    .resize(48, 48)
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('Created favicon.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
