import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {git,repairLoop,review,hash,snapshot} from './sentinel.mjs';
export function fixture(root) {
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root,'math.mjs'),'export function mean(values) {\n  return values.reduce((a,b)=>a+b,0) / (values.length + 1);\n}\n');
  fs.writeFileSync(path.join(root,'requirements.md'),'mean([2,4]) must return 3. Empty input must throw RangeError.\n');
  fs.writeFileSync(path.join(root,'math.test.mjs'),`import {test} from 'node:test';\nimport assert from 'node:assert/strict';\nimport {mean} from './math.mjs';\ntest('arithmetic defect',()=>assert.equal(mean([2,4]),3));\ntest('omitted empty guard',()=>assert.throws(()=>mean([]),RangeError));\ntest('single element regression',()=>assert.equal(mean([7]),7));\n`);
  git(root,['init']);git(root,['add','--','math.mjs','math.test.mjs','requirements.md']);git(root,['-c','user.name=Sentinel Fixture','-c','user.email=fixture@localhost','commit','-m','Deliberately planted defects']);
}
export const plan=[[
  {path:'math.mjs',before:'(values.length + 1)',after:'values.length'}
],[{path:'math.mjs',before:'export function mean(values) {',after:'export function mean(values) {\n  if (values.length === 0) throw new RangeError("empty");'}]];
// Executes only our generated fixture test; arbitrary target tests are never auto-run.
export function verifyFixture(root) {
  const env={...process.env,NODE_OPTIONS:''}; delete env.NODE_TEST_CONTEXT;
  const p=spawnSync(process.execPath,['--test','math.test.mjs'],{cwd:root,encoding:'utf8',timeout:10000,windowsHide:true,env});
  const source=fs.readFileSync(path.join(root,'math.mjs'),'utf8');
  return {passed:p.status===0,exitCode:p.status,tests:p.stdout+p.stderr,review:{arithmeticFixed:!source.includes('values.length + 1'),emptyGuardPresent:source.includes('throw new RangeError')},error:p.error?.message};
}
export async function demo(base,live=false) {
  if(fs.existsSync(base)) throw Error('Demo requires a new output directory; refusing overwrite');
  fs.mkdirSync(base,{recursive:true});const root=path.join(base,'planted-repo');fixture(root);
  const config=JSON.parse(fs.readFileSync(new URL('./config.example.json',import.meta.url)));
  let ai;
  if(live) ai=await review(root,config,path.join(base,'local-model-review'));
  const result=repairLoop(root,plan,config.maxRounds,verifyFixture);
  const source=snapshot(root);
  let previous='0'.repeat(64);
  for(const round of result.history) {
    const evidence={type:'trusted-fixture-judge',sourceDigest:source.digest,round:round.round,passed:round.passed,requirementReview:round.review,testOutput:round.tests,previous};
    evidence.hash=hash(JSON.stringify(evidence));previous=evidence.hash;
    fs.appendFileSync(path.join(base,'reproduction-ledger.jsonl'),JSON.stringify(evidence)+'\n');
  }
  fs.writeFileSync(path.join(base,'repair-evidence.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({source:root,rounds:result.history.map(x=>({round:x.round,passed:x.passed,review:x.review})),sourceUnchanged:result.sourceUnchanged,aiFindings:ai?.findings.length},null,2));
  if(!result.sourceUnchanged||result.history[0].passed||!result.history.at(-1).passed) throw Error('Acceptance failed');
  return result;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  demo(path.resolve(process.argv[2]||path.join('artifacts','demo-'+Date.now())),process.argv.includes('--live')).catch(e=>{console.error(e);process.exitCode=1;});
}
