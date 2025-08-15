const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const projectRoot = path.join(__dirname, '..');
const sourceIcon = path.join(projectRoot, 'assets', 'app-icon.png');

const androidRes = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
const iosSetDir = path.join(projectRoot, 'ios', 'MASSMonsterApp', 'Images.xcassets', 'AppIcon.appiconset');

const androidIcons = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const iosIcons = [
  { idiom: 'iphone', size: 20, scale: 2 },
  { idiom: 'iphone', size: 20, scale: 3 },
  { idiom: 'iphone', size: 29, scale: 2 },
  { idiom: 'iphone', size: 29, scale: 3 },
  { idiom: 'iphone', size: 40, scale: 2 },
  { idiom: 'iphone', size: 40, scale: 3 },
  { idiom: 'iphone', size: 60, scale: 2 },
  { idiom: 'iphone', size: 60, scale: 3 },
  { idiom: 'ios-marketing', size: 1024, scale: 1 },
];

async function generateAndroid() {
  for (const { dir, size } of androidIcons) {
    const outDir = path.join(androidRes, dir);
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(path.join(outDir, 'ic_launcher.png'));
    await sharp(sourceIcon)
      .resize(size, size)
      .toFile(path.join(outDir, 'ic_launcher_round.png'));
  }
}

async function generateIos() {
  const images = [];
  for (const { idiom, size, scale } of iosIcons) {
    const filename = `icon-${size}@${scale}x.png`;
    const pixelSize = size * scale;
    await sharp(sourceIcon)
      .resize(pixelSize, pixelSize)
      .toFile(path.join(iosSetDir, filename));
    images.push({
      idiom,
      size: `${size}x${size}`,
      scale: `${scale}x`,
      filename,
    });
  }
  const contents = {
    images,
    info: { author: 'xcode', version: 1 },
  };
  fs.writeFileSync(
    path.join(iosSetDir, 'Contents.json'),
    JSON.stringify(contents, null, 2)
  );
}

async function main() {
  await generateAndroid();
  await generateIos();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
