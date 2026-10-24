import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,sep} from 'node:path';

const dist=resolve('dist');
const index=await readFile(resolve(dist,'index.html'),'utf8');
const jsPath=index.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/)?.[1];
const cssPath=index.match(/<link[^>]*href="([^"]+\.css)"[^>]*>/)?.[1];
if(!jsPath||!cssPath)throw new Error('Build assets not found. Run npm run build first.');
function assetPath(path){
  const file=resolve(dist,path);
  if(!file.startsWith(dist+sep))throw new Error('Expected a relative asset inside dist: '+path);
  return file;
}
const [js,css,pattern,license,notices]=await Promise.all([
  readFile(assetPath(jsPath),'utf8'),readFile(assetPath(cssPath),'utf8'),
  readFile(resolve(dist,'circuit-pattern.svg'),'utf8'),
  readFile(resolve(dist,'LICENSE.txt'),'utf8'),readFile(resolve(dist,'THIRD_PARTY_NOTICES.txt'),'utf8')
]);
const inlineCss=css.replace(/url\((['"]?)(?:\.\.\/|\.\/|\/)?circuit-pattern\.svg\1\)/g,
  ()=>`url("data:image/svg+xml,${encodeURIComponent(pattern)}")`);
// JSON preserves the complete notices and cannot close the containing script element.
const licenses=JSON.stringify({license,notices}).replaceAll('<','\\u003c');
const html=index
  .replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/,
    ()=>'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script>')
  .replace(/<link[^>]*href="[^"]+\.css"[^>]*>/,()=>'<style>'+inlineCss+'</style>')
  .replace('</head>',()=>'<script id="license-notices" type="application/json">'+licenses+'</script></head>');
await mkdir('output',{recursive:true});
await writeFile('output/learn-esp32.html',html);
console.log('output/learn-esp32.html: '+Buffer.byteLength(html)+' bytes');
