const { execSync } = require('child_process');

try {
  console.log('--- Routes Diff ---');
  const routesDiff = execSync('git diff HEAD -- routes/artworkRoutes.js', { encoding: 'utf8' });
  console.log(routesDiff);

  console.log('--- Controller Diff (only deleted lines starting with -) ---');
  const controllerDiff = execSync('git diff HEAD -- controller/artworkController.js', { encoding: 'utf8' });
  const lines = controllerDiff.split('\n');
  lines.forEach(line => {
    if (line.startsWith('-') && !line.startsWith('---')) {
      console.log(line);
    }
  });
} catch (err) {
  console.error(err);
}

process.exit(0);
