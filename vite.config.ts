import react from '@vitejs/plugin-react';
import {defineConfig,type Plugin} from 'vite';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,relative,sep} from 'node:path';

async function listStaticFiles(directory:string):Promise<string[]>{
  const entries=await readdir(directory,{withFileTypes:true});
  const files=await Promise.all(entries.map(async entry=>{
    const path=join(directory,entry.name);
    if(entry.isDirectory())return listStaticFiles(path);
    if(entry.name==='sw.js')return [];
    return [`/${relative(join(process.cwd(),'dist'),path).split(sep).join('/')}`];
  }));
  return files.flat();
}

function offlineWorker():Plugin{return {
  name:'glucoguide-offline-worker',
  async closeBundle(){
    const output=join(process.cwd(),'dist');
    const cacheVersion=Date.now().toString(36);
    const precache=['/',...await listStaticFiles(output)];
    const path=join(output,'sw.js');
    const source=await readFile(path,'utf8');
    const withVersion=source.replace("const CACHE='glucoguide-shell-v1'",`const CACHE='glucoguide-shell-${cacheVersion}'`);
    await writeFile(path,withVersion.replace(/const PRECACHE=\[[^;]*\]/,`const PRECACHE=${JSON.stringify(precache)}`));
  }
}}

export default defineConfig({plugins:[react(),offlineWorker()]});
