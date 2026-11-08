import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {git,repairLoop,review,hash,snapshot,inside,approveRequirement,recordTrustedExecution,adjudicate,atomicFinding,createLedger} from './sentinel.mjs';
const APPROVED_SOURCE='export function mean(values) {\n  return values.reduce((a,b)=>a+b,0) / (values.length + 1);\n}\n';
const APPROVED_TESTS="import {test} from 'node:test';\nimport assert from 'node:assert/strict';\nimport {mean} from './math.mjs';\ntest('arithmetic defect',()=>assert.equal(mean([2,4]),3));\ntest('omitted empty guard',()=>assert.throws(()=>mean([]),RangeError));\ntest('single element regression',()=>assert.equal(mean([7]),7));\n";
const APPROVED_REQUIREMENTS='mean([2,4]) must return 3. Empty input must throw RangeError.\n';
const repaired=APPROVED_SOURCE.replace('(values.length + 1)','values.length');
const guarded=repaired.replace('export function mean(values) {','export function mean(values) {\n  if (values.length === 0) throw new RangeError("empty");');
const EXPECTED={'mean.two':{kind:'value',value:3},'mean.empty':{kind:'exception',value:'RangeError'},'mean.one':{kind:'value',value:7},'test.empty.exists':{kind:'presence',value:true}};
const HARNESS=`function observe(fn){try {const n=fn();return {kind:'value',value:Number.isNaN(n)?'NaN':n};}catch(e){return {kind:'exception',value:e.name};}}\nJSON.stringify({'mean.two':observe(()=>mean([2,4])),'mean.empty':observe(()=>mean([])),'mean.one':observe(()=>mean([7])),capabilities:[typeof process,typeof require,typeof fetch]})`;
const HARNESS_DIGEST=hash(HARNESS+JSON.stringify(EXPECTED));
export function fixtureIdentity(root) {
 const files={};for(const name of ['math.mjs','math.test.mjs','requirements.md'])files[name]=fs.readFileSync(inside(root,name),'utf8');
 return {files,digest:hash(JSON.stringify(files))};
}
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
  try {
    const before=fixtureIdentity(root),source=before.files['math.mjs'];
    if(![APPROVED_SOURCE,repaired,guarded].includes(source)||before.files['math.test.mjs']!==APPROVED_TESTS||before.files['requirements.md']!==APPROVED_REQUIREMENTS)throw Error('Fixture bytes are not the approved execution closure');
    if(fs.readdirSync(root).some(name=>!['.git','math.mjs','math.test.mjs','requirements.md'].includes(name)))throw Error('Unexpected candidate files');
    // This is NOT a sandbox for hostile code: only three exact approved source strings enter it.
    // No imports, host objects, callbacks, process, require, fetch or network APIs are exposed.
    const context=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});
    const observations=JSON.parse(new vm.Script(source.replace(/^export /,'')+'\n'+HARNESS).runInContext(context,{timeout:1000}));
    if(observations.capabilities.some(x=>x!=='undefined'))throw Error('Unexpected execution capability');
    observations['test.empty.exists']={kind:'presence',value:true};
    observations['empty.divisor']={kind:'value',value:source===APPROVED_SOURCE?1:0};
    observations['two.divisor']={kind:'value',value:source===APPROVED_SOURCE?3:2};
    const after=fixtureIdentity(root);if(before.digest!==after.digest)throw Error('Candidate changed during execution');
    const names={'mean.two':'arithmetic defect','mean.empty':'omitted empty guard','mean.one':'single element regression'};
    const cases=Object.entries(names).map(([id,name])=>({id,name,actual:observations[id],expected:EXPECTED[id],passed:JSON.stringify(observations[id])===JSON.stringify(EXPECTED[id]),testIdentity:hash(HARNESS_DIGEST+id)}));
    const passed=cases.every(x=>x.passed);
    return {passed,exitCode:passed?0:1,executionStatus:'completed',candidateDigest:before.digest,harnessDigest:HARNESS_DIGEST,recipe:'approved-mean-fixture-v2',runtime:{node:process.version,kind:'exact-byte-allowlisted VM; no external capabilities'},observations,cases,tests:cases.map(c=>`${c.passed?'✔':'✖'} ${c.name}: actual=${JSON.stringify(c.actual)} expected=${JSON.stringify(c.expected)}`).join('\n'),review:{arithmeticFixed:!source.includes('values.length + 1'),emptyGuardPresent:source.includes('throw new RangeError')}};
  } catch(e){return {passed:false,exitCode:null,executionStatus:'unverified_incomplete',error:e.message,tests:'BLOCKED: '+e.message,review:{arithmeticFixed:false,emptyGuardPresent:false}};}
}
export function fixtureEvidence(root,finding,sourceDigest=fixtureIdentity(root).digest) {
 const run=verifyFixture(root);
 const approvedDigests=[APPROVED_SOURCE,repaired,guarded].map(source=>hash(JSON.stringify({'math.mjs':source,'math.test.mjs':APPROVED_TESTS,'requirements.md':APPROVED_REQUIREMENTS})));
 if(!approvedDigests.includes(sourceDigest)){run.executionStatus='unverified_incomplete';run.error='Original source identity is not approved';}
 const identity={sourceDigest,candidateDigest:run.candidateDigest??'unverified',harnessDigest:run.harnessDigest,testIdentities:Object.keys(run.observations??{}).filter(id=>id!=='capabilities').map(id=>hash(HARNESS_DIGEST+id))};
 const authorities=Object.entries(EXPECTED).map(([conditionId,expected])=>approveRequirement({id:'fixture:'+conditionId,conditionId,expected,sourceRef:hash(APPROVED_REQUIREMENTS+APPROVED_TESTS)}));
 if(run.executionStatus!=='completed')return {identity,authorities,executions:[{findingId:finding.id,conditionId:finding.claim?.conditionId,invalidReason:run.error}]};
 const executions=Object.entries(run.observations).filter(([id])=>id!=='capabilities').map(([conditionId,actual])=>recordTrustedExecution({...identity,findingId:finding.id,conditionId,actual,testIdentity:hash(HARNESS_DIGEST+conditionId),harnessDigest:HARNESS_DIGEST,isolationVerified:true,recipe:run.recipe,origin:conditionId.endsWith('.divisor')?'source-derived from exact approved formula':'fixed approved harness',executionStatus:'completed'}));
 return {identity,authorities,executions,run};
}
// Explicit development-benchmark annotations from Stage 1, not production title-based rules.
const ARCHIVE_LABELS=[
 {id:'2b4c674306a236d7',claim:{scope:'behavior',conditionId:'mean.two',operator:'violates_requirement'},mechanism:{conditionId:'two.divisor',value:{kind:'value',value:0}},expected:'supported',mechanismExpected:'rejected',rationale:'contradictory'},
 {id:'317503aaa4c46b6d',claim:{scope:'ambiguous',conditionId:null,operator:'unknown'},expected:'uncertain',rationale:'scope interpretation unproven'},
 {id:'1d7fa7c175cff8c4',claim:{scope:'behavior',conditionId:'mean.empty',operator:'violates_requirement'},mechanism:{conditionId:'empty.divisor',value:{kind:'value',value:0}},expected:'supported',mechanismExpected:'rejected',rationale:'rejects mixed true behavior and false mechanism'},
 {id:'1a7997bcf4ad0bf6',claim:{scope:'suite coverage',conditionId:'test.empty.exists',operator:'absent'},expected:'rejected',rationale:'justified'},
 {id:'73dce8c76ee3f0b4',claim:{scope:'expected behavior',conditionId:'mean.one',operator:'expected_is',value:{kind:'value',value:3.5}},expected:'rejected',rationale:'contradictory'}
];
export function scoreOpinions(cases,opinions) {
 const definite=cases.filter(c=>c.expected!=='uncertain');
 return {definiteCases:definite.length,correct:definite.filter(c=>opinions[c.id]===c.expected).length,incorrect:definite.filter(c=>opinions[c.id]!==c.expected).length,ambiguousCases:cases.length-definite.length,generalAccuracy:'not_established',statisticalClaim:false};
}
export function archivedBenchmark(output) {
 const out=path.resolve(output),dataRoot=fileURLToPath(new URL('./artifacts/',import.meta.url));
 for(const name of ['validation','strict-model-review','numbered-model-review','final-repair-validation','milestone-2-stage-1','milestone-2-stage-2'])if(out===path.join(dataRoot,name)||out.startsWith(path.join(dataRoot,name)+path.sep))throw Error('Cannot write inside historical evidence');
 if(fs.existsSync(out))throw Error('Evaluation output must be new');fs.mkdirSync(out);
 const log=createLedger(out),reportBytes=fs.readFileSync(path.join(dataRoot,'numbered-model-review/report.json'));
 const original=JSON.parse(reportBytes),sourceRoot=path.join(dataRoot,'validation/planted-repo');
 const sourceDigest=fixtureIdentity(sourceRoot).digest,cases=[];
 log('benchmark_manifest',{split:'development',sourceDigest,archiveIdentity:hash(reportBytes),annotationIdentity:hash(JSON.stringify(ARCHIVE_LABELS)),oracle:'Stage 1 section 4; same-system authored, not independent approval',newInference:false});
 for(const label of ARCHIVE_LABELS){
   const originalFinding=original.findings.find(f=>f.id===label.id);if(!originalFinding)throw Error('Archive identity/record mismatch');
   const finding={...atomicFinding(originalFinding),claim:label.claim,mechanism:label.mechanism??null,annotationRef:'Stage 1 matrix:'+label.id};
   const context=fixtureEvidence(sourceRoot,finding,sourceDigest),decision=adjudicate(finding,originalFinding.judge,context);
   const passed=decision.effectiveAdjudication===label.expected&&(!label.mechanismExpected||decision.mechanismAssessment.effective===label.mechanismExpected);
   const result={id:label.id,title:originalFinding.title,expected:label.expected,expectedMechanism:label.mechanismExpected??null,rationaleGold:label.rationale,decision,originalFinding,passed};cases.push(result);log('archived_case',result);
 }
 const historicalAiMetrics=scoreOpinions(ARCHIVE_LABELS,Object.fromEntries(original.findings.map(f=>[f.id,f.judge.verdict])));
 const report={schemaVersion:2,split:'development',cases,infrastructureRegression:cases.every(c=>c.passed)?'passed':'failed',historicalAiMetrics,newModelEvaluation:'not_run_no_authorization',humanApproval:'pending',gate:'NEEDS_HUMAN_REVIEW',generalAccuracy:'not_established',heldOutEvaluation:{status:'not_run',contract:'Independent requirement/oracle labels, locked split, declared contamination and environment/profile identities required'},annotations:'Explicit benchmark data; not a production NLP contradiction detector'};
 log('evaluation_result',report);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2),{flag:'wx'});return report;
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
    const evidence={type:'trusted-fixture-judge',sourceDigest:source.digest,candidateDigest:round.candidateDigest,harnessDigest:round.harnessDigest,cases:round.cases,recipe:round.recipe,edits:round.edits??[],round:round.round,passed:round.passed,requirementReview:round.review,testOutput:round.tests,previous};
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
