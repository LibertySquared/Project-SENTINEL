import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {review,executionSucceeded,safeData} from './sentinel.mjs';
import {archivedBenchmark} from './demo.mjs';
export async function main(args,dependencies={}) {
 const print=dependencies.print??console.log,error=dependencies.error??console.error;
 try {
  if(args[0]==='--evaluate-archive') {
   if(!args[1]){error('Usage: node cli.mjs --evaluate-archive <new-output-directory>');return 2;}
   const r=archivedBenchmark(args[1]);print(JSON.stringify({infrastructureRegression:r.infrastructureRegression,historicalAiMetrics:r.historicalAiMetrics,newModelEvaluation:r.newModelEvaluation,gate:r.gate,output:args[1]},null,2));return r.infrastructureRegression==='passed'?0:1;
  }
  const [target,config,out]=args;
  if(!target||!config||!out){error('Usage: node cli.mjs <Git-root> <config.json> <new-output-directory outside target>');return 2;}
  const r=await (dependencies.review??review)(target,JSON.parse(fs.readFileSync(config)),out);
  print(JSON.stringify({gate:r.gate,humanApproval:r.humanApproval,qualityAcceptance:r.qualityAcceptance,findings:r.findings.length,independence:r.independence,output:out},null,2));return executionSucceeded(r)?0:1;
 }catch(e){error(safeData(e.message));return 1;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=await main(process.argv.slice(2));
