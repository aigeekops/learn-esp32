import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
const [projectLicense,threeLicense,packageText]=await Promise.all([
  readFile(new URL('LICENSE',root),'utf8'),
  readFile(new URL('node_modules/three/LICENSE',root),'utf8'),
  readFile(new URL('node_modules/three/package.json',root),'utf8')
]);
const {version}=JSON.parse(packageText);
await mkdir(new URL('public/',root),{recursive:true});
await writeFile(new URL('public/LICENSE.txt',root),projectLicense);
await writeFile(new URL('public/THIRD_PARTY_NOTICES.txt',root),
  `Three.js ${version}\nhttps://github.com/mrdoob/three.js\n\n${threeLicense}`);
console.log('Prepared distribution licenses in '+fileURLToPath(new URL('public/',root)));
