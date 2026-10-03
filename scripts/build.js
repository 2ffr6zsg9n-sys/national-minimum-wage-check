const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'calculation.js']) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
console.log('Prepared calculator frontend for Netlify.');
