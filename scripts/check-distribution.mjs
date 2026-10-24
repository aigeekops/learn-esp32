import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const dist=resolve('dist');
const read=path=>readFile(path,'utf8');
const [index,standalone,license,vendor]=await Promise.all([
  read(resolve(dist,'index.html')),read('output/learn-esp32.html'),
  read('LICENSE'),read('node_modules/three/LICENSE')
]);
const js=index.match(/<script[^>]*src="([^"]+)"/)?.[1];
const css=index.match(/<link[^>]*href="([^"]+\.css)"/)?.[1];
assert.ok(js&&css,'Expected the Vite module and stylesheet');
for(const path of [js,css])assert.ok(path.startsWith('./'),'Assets must be relative for GitHub Pages');
const cssSource=await read(resolve(dist,css));
for(const prefix of ['/','/learn-esp32/']){
  const base=new URL(prefix,'https://example.invalid');
  const assets=[new URL(js,base),new URL(css,base)];
  for(const match of cssSource.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/g)){
    if(!match[2].startsWith('data:'))assets.push(new URL(match[2],new URL(css,base)));
  }
  for(const url of assets){
    assert.ok(url.pathname.startsWith(prefix),`Asset escaped the deployment path: ${url}`);
    assert.ok((await stat(resolve(dist,url.pathname.slice(prefix.length)))).isFile());
  }
}
assert.equal(await read(resolve(dist,'LICENSE.txt')),license);
assert.ok((await read(resolve(dist,'THIRD_PARTY_NOTICES.txt'))).includes(vendor));
const notices=JSON.parse(standalone.match(/<script id="license-notices" type="application\/json">([\s\S]*?)<\/script>/)?.[1]??'null');
assert.equal(notices?.license,license);
assert.ok(notices?.notices.includes(vendor));
assert.doesNotMatch(standalone,/<script[^>]*\bsrc="/);
assert.doesNotMatch(standalone,/<link[^>]*href="[^\"]+\.css"/);
assert.match(standalone,/url\("data:image\/svg\+xml,/);
const script=standalone.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Standalone script is missing');
const syntax=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr||syntax.error?.message);
console.log('Distribution checked: root/subpath assets, complete licenses, standalone syntax.');
