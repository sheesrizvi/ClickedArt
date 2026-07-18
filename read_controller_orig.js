const fs = require('fs');

const content = fs.readFileSync('d:\\GitHub\\ClickedArt\\controller\\artworkController_orig.js', 'utf8');
const lines = content.split('\n');

console.log('Original controller functions:');
lines.forEach(line => {
  if (line.includes('const ') && line.includes('asyncHandler')) {
    console.log(line.trim());
  }
});

process.exit(0);
