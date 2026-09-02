const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

if (process.argv[2] === 'clean') {
  fs.rmSync(dist, { recursive: true, force: true });
} else if (process.argv[2] === 'copy') {
  fs.mkdirSync(path.join(dist, 'templates'), { recursive: true });
  fs.cpSync(path.join(root, 'templates'), path.join(dist, 'templates'), { recursive: true });
} else {
  throw new Error('Expected clean or copy');
}
