import {spawnSync} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {lessons} from '../src/lessons.ts';

const [cli='arduino-cli',config]=process.argv.slice(2);
const report=resolve('output/compile');
const buildRoot=await mkdtemp(join(tmpdir(),'learn-esp32-build-'));
const results=[];
await mkdir(report,{recursive:true});
try{
  for(const l of [...lessons,{id:'espnow-sender'}]){
    const args=['compile','--fqbn','esp32:esp32:esp32','--build-path',join(buildRoot,l.id)];
    if(config)args.push('--config-file',resolve(config));
    args.push(resolve('output/sketches',l.id));
    const started=Date.now();
    const r=spawnSync(cli,args,{encoding:'utf8',maxBuffer:10*1024*1024});
    if(r.error)throw new Error(`Cannot run ${cli}: ${r.error.message}`);
    await writeFile(join(report,l.id+'.log'),(r.stdout??'')+(r.stderr??''));
    const item={id:l.id,passed:r.status===0,seconds:Math.round((Date.now()-started)/100)/10};
    results.push(item);
    console.log(`${l.id}: ${item.passed?'PASS':'FAIL'} (${item.seconds}s)`);
    await writeFile(join(report,'results.json'),JSON.stringify({
      fqbn:'esp32:esp32:esp32',
      requiredEnvironment:{core:'3.3.12',libraries:{'Adafruit SSD1306':'2.5.17','Adafruit GFX Library':'1.13.0','Adafruit BusIO':'1.17.4'}},
      results
    },null,2)+'\n');
  }
  if(results.some(r=>!r.passed))process.exitCode=1;
}finally{
  await rm(buildRoot,{recursive:true,force:true});
}
