import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');

if (fs.existsSync(distDir)) {
  const assetsDir = path.join(distDir, 'assets');
  
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const mainJs = files.find(f => f.startsWith('index-') && f.endsWith('.js') && !f.includes('deYoFgj1') && !f.includes('DRgOVa4q'));
    const mainCss = files.find(f => f.startsWith('index-') && f.endsWith('.css') && !f.includes('BRQqCFan'));

    // Create legacy aliases for cached browsers
    if (mainJs) {
      fs.copyFileSync(path.join(assetsDir, mainJs), path.join(assetsDir, 'index-DRgOVa4q.js'));
      console.log(`Created legacy JS alias: index-DRgOVa4q.js -> ${mainJs}`);
    }
    if (mainCss) {
      fs.copyFileSync(path.join(assetsDir, mainCss), path.join(assetsDir, 'index-BRQqCFan.css'));
      console.log(`Created legacy CSS alias: index-BRQqCFan.css -> ${mainCss}`);
    }
  }

  // Create duplicate subdirectories for both MobiGuard and MobiGaurd spelling to guarantee 0 404s
  ['MobiGuard', 'MobiGaurd'].forEach(folder => {
    const targetDir = path.join(distDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy manifest, icons and html
    ['manifest.json', 'icon.svg', 'apple-touch-icon.png', 'favicon.ico', 'index.html', '404.html'].forEach(f => {
      const src = path.join(distDir, f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(targetDir, f));
      }
    });

    // Copy assets into targetDir/assets
    const targetAssets = path.join(targetDir, 'assets');
    if (!fs.existsSync(targetAssets)) {
      fs.mkdirSync(targetAssets, { recursive: true });
    }
    if (fs.existsSync(assetsDir)) {
      fs.readdirSync(assetsDir).forEach(f => {
        fs.copyFileSync(path.join(assetsDir, f), path.join(targetAssets, f));
      });
    }
    console.log(`Generated backward-compatible static directory: ${folder}/`);
  });
}
