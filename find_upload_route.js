const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchDir(fullPath);
      }
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('/upload') || content.includes('upload') || content.includes('/api/artworks/upload')) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('/upload') || (line.includes('router.') && line.includes('upload'))) {
            console.log(`${fullPath}:${index + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

console.log('Searching routes...');
searchDir('d:\\GitHub\\ClickedArt\\routes');
console.log('\nSearching controllers...');
searchDir('d:\\GitHub\\ClickedArt\\controller');
process.exit(0);
