import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../dist/',import.meta.url),entry=new URL('index.html',root);
const source=await readFile(entry,'utf8');
const paths=[...new Set([...source.matchAll(/\b(?:href|src)="(assets\/[^"?#]+\.(?:css|js))(?:\?[^"#]*)?"/g)].map(match=>match[1]))];
const versions=new Map(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(new URL(path,root))).digest('hex').slice(0,12)])));
const stamped=source.replace(/\b(href|src)="(assets\/[^"?#]+\.(?:css|js))(?:\?[^"#]*)?"/g,(_,attribute,path)=>`${attribute}="${path}?v=${versions.get(path)}"`);
if(stamped!==source)await writeFile(entry,stamped);
console.log(`资源版本已更新：${paths.length} 个入口与样式文件。`);
