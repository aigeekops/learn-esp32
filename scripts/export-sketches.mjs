import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {lessons,defaults} from '../src/lessons.ts';
import {source} from '../src/firmware.ts';
const root=resolve(process.argv[2]??'output/sketches');
for(const l of lessons){const dir=resolve(root,l.id);await mkdir(dir,{recursive:true});await writeFile(resolve(dir,l.id+'.ino'),source(l,defaults(l)));}
const radio=lessons.find(l=>l.id==='espnow');
if(radio){const dir=resolve(root,'espnow-sender');await mkdir(dir,{recursive:true});await writeFile(resolve(dir,'espnow-sender.ino'),source(radio,{...defaults(radio),radioRole:'sender'}));}
console.log(`Exported ${lessons.length} default sketches and the ESP-NOW sender to ${root}`);
