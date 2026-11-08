import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {review,executionSucceeded,hash,validateFinding} from '../sentinel.mjs';
import {fixture,fixtureEvidence,archivedBenchmark,scoreOpinions} from '../demo.mjs';
import {main} from '../cli.mjs';
const config=JSON.parse(fs.readFileSync(new URL('../config.example.json',import.meta.url)));
function setup(t){const base=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-integration-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));const root=path.join(base,'repo');fixture(root);return {base,root};}
const good={title:'wrong divisor',path:'math.mjs',line:2,quote:'values.length + 1',reason:'implementation wrong',claim:{scope:'behavior',conditionId:'mean.two',operator:'violates_requirement'}};
test('T1/T2/T5/T6 integrated review preserves supported defect, AI verdict, provenance and pending approval',async t=>{
 const {base,root}=setup(t),out=path.join(base,'review');
 const r=await review(root,config,out,async(c,role,p)=>p.finding?{verdict:'rejected',reason:'passes',reproduction:'model description only'}:{findings:[good]}, {evidenceProvider:(f,s)=>fixtureEvidence(root,f,s.digest)});
 assert.ok(r.findings.every(f=>f.effectiveAdjudication==='supported'&&f.originalAiVerdict.verdict==='rejected'&&f.aiEvidenceDisagreement&&f.reproduced));assert.equal(r.humanApproval,'pending');assert.equal(r.qualityAcceptance,'criteria_incomplete');assert.equal(r.targetUnchanged,true);assert.equal(r.groups.length,1);
 const events=fs.readFileSync(path.join(out,'ledger.jsonl'),'utf8').trim().split('\n').map(JSON.parse);const requests=events.filter(e=>e.type==='request');assert.equal(requests.length,4);for(const e of requests)assert.equal(hash(JSON.stringify(e.data.request)),e.data.requestIdentity);assert.ok(fs.existsSync(path.join(out,'manifest.json')));
});
test('T4 exact B response retains one valid sibling, marks partial, and distinguishes lexical from semantic evidence',async t=>{
 const {base,root}=setup(t);const events=fs.readFileSync(new URL('../artifacts/strict-model-review/ledger.jsonl',import.meta.url),'utf8').trim().split('\n').map(JSON.parse);const raw=events.find(e=>e.type==='review_response'&&e.data.role==='requirements').data.raw;
 const r=await review(root,config,path.join(base,'partial'),async(c,role,p)=>p.finding?{verdict:'uncertain',reason:'no execution',reproduction:''}:raw);
 assert.ok(r.reports.every(x=>x.status==='partial'&&x.findings.length===1&&x.rejectedEvidence.length===2));assert.equal(r.findings.length,2);assert.equal(executionSucceeded(r),false);assert.equal(r.findings[0].supportingEvidence[0].semanticRelevance,'unassessed');
});
test('T6 real review-to-CLI judge failure is execution failure; trusted truth is not demoted',async t=>{
 const {base,root}=setup(t);const code=await main([root,fileURLToPath(new URL('../config.example.json',import.meta.url)),path.join(base,'failed-judge')],{print:()=>{},error:()=>{},review:(target,c,out)=>review(target,c,out,async(c,r,p)=>{if(p.finding)throw Error('judge unavailable');return {findings:[good]};},{evidenceProvider:(f,s)=>fixtureEvidence(root,f,s.digest)})});
 assert.equal(code,1);const r=JSON.parse(fs.readFileSync(path.join(base,'failed-judge/report.json')));assert.ok(r.findings.every(f=>f.effectiveAdjudication==='supported'&&f.judgeExecution.status==='failed'));assert.equal(r.gate,'NEEDS_HUMAN_REVIEW');
});
test('T5/T6 request budget exhaustion is incomplete, with no hidden retries or approval',async t=>{
 const {base,root}=setup(t);let calls=0;const r=await review(root,{...config,budget:{maxCalls:0}},path.join(base,'budget'),async()=>{calls++;return {findings:[]};});assert.equal(calls,0);assert.equal(r.usage.requests,0);assert.equal(executionSucceeded(r),false);assert.equal(r.humanApproval,'pending');
});
test('T8 actual archived benchmark distinguishes effective correctness from historical AI accuracy',t=>{
 const {base}=setup(t),r=archivedBenchmark(path.join(base,'benchmark'));assert.equal(r.infrastructureRegression,'passed');assert.deepEqual(r.cases.map(c=>c.decision.effectiveAdjudication),['supported','uncertain','supported','rejected','rejected']);assert.equal(r.historicalAiMetrics.correct,2);assert.equal(r.historicalAiMetrics.incorrect,2);assert.equal(r.historicalAiMetrics.ambiguousCases,1);assert.equal(r.newModelEvaluation,'not_run_no_authorization');
 const reject=scoreOpinions(r.cases,Object.fromEntries(r.cases.map(c=>[c.id,'rejected']))),support=scoreOpinions(r.cases,Object.fromEntries(r.cases.map(c=>[c.id,'supported'])));assert.equal(reject.incorrect,2);assert.equal(support.incorrect,2);assert.equal(r.generalAccuracy,'not_established');
});
test('T4 CRLF, trailing blank lines and exact substrings follow one-based source policy',()=>{
 const s={files:{'a.js':'first\r\nsecond\r\n'}},f={title:'x',path:'a.js',line:2,quote:'second',reason:'x'};
 assert.equal(validateFinding(f,s).line,2);for(const change of [{line:0},{line:4},{quote:'sec ond'},{line:3,quote:'second'}])assert.throws(()=>validateFinding({...f,...change},s));
});
test('T6 invalid execution binding is CLI failure even when the AI judge completed',async t=>{
 const {base,root}=setup(t);const code=await main([root,fileURLToPath(new URL('../config.example.json',import.meta.url)),path.join(base,'invalid-binding')],{print:()=>{},error:()=>{},review:(target,c,out)=>review(target,c,out,async(c,r,p)=>p.finding?{verdict:'supported',reason:'claims reproduction',reproduction:'trust me'}:{findings:[good]}, {evidenceProvider:(f,s)=>{const context=fixtureEvidence(root,f,s.digest);return {...context,identity:{...context.identity,candidateDigest:'0'.repeat(64)}};}})});
 assert.equal(code,1);const r=JSON.parse(fs.readFileSync(path.join(base,'invalid-binding/report.json')));assert.ok(r.findings.every(f=>f.effectiveAdjudication===null&&f.adjudicationCompleteness==='unverified_incomplete'));assert.equal(r.humanApproval,'pending');
});
test('T6 empty findings and model-supplied approval text never approve a project',async t=>{
 const {base,root}=setup(t),r=await review(root,config,path.join(base,'model-approval'),async()=>({findings:[],humanApproval:'approved',gate:'APPROVED'}));assert.equal(r.findings.length,0);assert.equal(r.gate,'NEEDS_HUMAN_REVIEW');assert.equal(r.humanApproval,'pending');assert.equal(r.qualityAcceptance,'criteria_incomplete');
});
