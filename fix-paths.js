const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');
const notFoundPath = path.join(distDir, '404.html');
const noJekyllPath = path.join(distDir, '.nojekyll');

if (fs.existsSync(indexPath)) {
  let content = fs.readFileSync(indexPath, 'utf8');
  // Replace absolute leading slashes for scripts and stylesheets with relative paths
  content = content.replace(/href="\/_expo\//g, 'href="./_expo/');
  content = content.replace(/src="\/_expo\//g, 'src="./_expo/');
  content = content.replace(/href="\/assets\//g, 'href="./assets/');
  content = content.replace(/src="\/assets\//g, 'src="./assets/');
  content = content.replace(/href="\/favicon.ico"/g, 'href="./favicon.ico"');
  
  fs.writeFileSync(indexPath, content, 'utf8');
  fs.writeFileSync(notFoundPath, content, 'utf8');
  fs.writeFileSync(noJekyllPath, '', 'utf8');
  console.log('Successfully adjusted dist for GitHub Pages (relative paths, 404.html, .nojekyll)');
} else {
  console.error('dist/index.html not found');
}
