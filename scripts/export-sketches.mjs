import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {lessons,defaults} from '../src/lessons.ts';
import {source} from '../src/firmware.ts';
const root=resolve(process.argv[2]??'output/sketches');
for(const l of lessons){const dir=resolve(root,l.id);await mkdir(dir,{recursive:true});await writeFile(resolve(dir,l.id+'.ino'),source(l,defaults(l)));}
console.log(`Exported ${lessons.length} default sketches to ${root}`);
