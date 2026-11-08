import fs from 'node:fs';
import {review} from './sentinel.mjs';
const [target,config,out]=process.argv.slice(2);
if(!target||!config||!out) {console.error('Usage: node cli.mjs <Git-root> <config.json> <new-output-directory outside target>');process.exitCode=2;}
else {try {const r=await review(target,JSON.parse(fs.readFileSync(config)),out);console.log(JSON.stringify({gate:r.gate,findings:r.findings.length,independence:r.independence,output:out},null,2));if(r.reports.some(x=>x.status!=='completed')||!r.targetUnchanged) process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}}
