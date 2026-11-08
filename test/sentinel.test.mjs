import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {snapshot,review,inside,validateConfig,validateFinding,repairLoop,hash} from '../sentinel.mjs';
import {fixture,plan,verifyFixture,demo} from '../demo.mjs';
const config=JSON.parse(fs.readFileSync(new URL('../config.example.json',import.meta.url)));
function setup(t) {const base=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-test-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));const root=path.join(base,'repo');fixture(root);return {base,root};}
test('planted runtime defect and omission reproduced; bounded repairs and regression checks; source unchanged',t=>{
 const {root}=setup(t);const before=snapshot(root);const r=repairLoop(root,plan,2,verifyFixture);
 assert.deepEqual(r.history.map(x=>x.passed),[false,false,true]);assert.equal(r.sourceUnchanged,true);assert.match(r.history[0].tests,/arithmetic defect/);assert.match(r.history[1].tests,/omitted empty guard/);assert.equal(snapshot(root).digest,before.digest);
});
test('exhaustion cannot turn unresolved omission into pass',t=>{const {root}=setup(t);const r=repairLoop(root,plan,1,verifyFixture);assert.equal(r.history.at(-1).passed,false);assert.equal(r.history.length,2);});
test('read-only review validates evidence; judge challenges; hash ledger chains',async t=>{
 const {base,root}=setup(t);let calls=0;
 const infer=async(c,role,p)=>{calls++;if(p.finding)return {verdict:'supported',reason:'Wrong denominator',reproduction:'mean([2,4]) returns 2'};return {findings:[{title:'Wrong denominator',path:'math.mjs',line:2,quote:'(values.length + 1)',reason:'Expected divisor is length'}]};};
 const r=await review(root,config,path.join(base,'review'),infer);assert.equal(calls,4);assert.equal(r.targetUnchanged,true);assert.equal(r.gate,'NEEDS_HUMAN_REVIEW');assert.equal(r.findings[0].reproduced,false);assert.equal(r.independence.independentReviewers,false);
 let previous='0'.repeat(64);for(const line of fs.readFileSync(path.join(base,'review','ledger.jsonl'),'utf8').trim().split('\n')){const e=JSON.parse(line);assert.equal(e.previous,previous);const h=e.hash;delete e.hash;assert.equal(hash(JSON.stringify(e)),h);previous=h;}
});
test('malformed model output fails closed; one-model limitation exposed',async t=>{const {base,root}=setup(t);const c=structuredClone(config);c.reviewers[1].model=c.reviewers[0].model;const r=await review(root,c,path.join(base,'bad'),async()=>({findings:'approved'}));assert.ok(r.reports.every(x=>x.status==='error'));assert.match(r.independence.note,/One model/);assert.equal(r.gate,'NEEDS_HUMAN_REVIEW');});
test('invalid citations and traversal rejected',t=>{const {root}=setup(t);const s=snapshot(root);for(const p of ['../escape','x/../../escape','.git/config','C:/escape','x\\escape'])assert.throws(()=>inside(root,p));assert.throws(()=>validateFinding({path:'math.mjs',line:2,title:'x',reason:'x',quote:'invented'},s));});
test('output cannot write into target',async t=>{const {root}=setup(t);await assert.rejects(review(root,config,path.join(root,'report'),async()=>({findings:[]})),/outside target/);assert.equal(fs.existsSync(path.join(root,'report')),false);});
test('dirty repositories cannot be repaired',t=>{const {root}=setup(t);fs.appendFileSync(path.join(root,'math.mjs'),'// dirty');assert.throws(()=>repairLoop(root,plan,2,verifyFixture),/clean/);});
test('outbound endpoints and unbounded loops rejected',()=>{for(const endpoint of ['https://example.com','http://localhost:11434','http://127.0.0.1:11434/path']) assert.throws(()=>validateConfig({...config,endpoint}));assert.throws(()=>validateConfig({...config,maxRounds:100}));});
test('inference failure cannot produce approval',async t=>{const {base,root}=setup(t);const r=await review(root,config,path.join(base,'offline'),async()=>{throw Error('offline');});assert.equal(r.reports.filter(x=>x.status==='error').length,2);assert.equal(r.targetUnchanged,true);});
test('selected snapshot includes tracked working edits and exposes exclusions',t=>{const {root}=setup(t);fs.appendFileSync(path.join(root,'math.mjs'),'// edited');fs.writeFileSync(path.join(root,'untracked.mjs'),'not reviewed');const s=snapshot(root);assert.match(s.files['math.mjs'],/edited/);assert.equal(s.files['untracked.mjs'],undefined);assert.ok(s.status);const limited=snapshot(root,1);assert.equal(Object.keys(limited.files).length,0);assert.ok(limited.excluded.includes('math.mjs'));});
test('repair precondition failure leaves source unchanged',t=>{const {root}=setup(t);const before=snapshot(root);assert.throws(()=>repairLoop(root,[[{path:'math.mjs',before:'not present',after:'bad'}]],1,verifyFixture),/precondition/);assert.equal(snapshot(root).digest,before.digest);assert.equal(snapshot(root).status,'');});
test('judge malformed verdict is uncertain, never reproduced',async t=>{const {base,root}=setup(t);const r=await review(root,config,path.join(base,'judge-error'),async(c,role,p)=>p.finding?{verdict:'approved'}:{findings:[{title:'bug',path:'math.mjs',line:2,quote:'values.length + 1',reason:'denominator'}]});assert.ok(r.findings.every(f=>f.judge.verdict==='uncertain'&&!f.reproduced));});
test('mixed evidence retains valid findings and flags rejected citations',async t=>{const {base,root}=setup(t);const good={title:'bug',path:'math.mjs',line:2,quote:'values.length + 1',reason:'denominator'};const r=await review(root,config,path.join(base,'mixed'),async(c,role,p)=>p.finding?{verdict:'uncertain',reason:'needs execution',reproduction:'run tests'}:{findings:[good,{...good,quote:'invented'}]});assert.equal(r.findings.length,2);assert.ok(r.reports.every(x=>x.status==='partial'&&x.rejectedEvidence.length===1));});
test('demo refuses existing directories without overwriting files',async t=>{const {base,root}=setup(t);const before=snapshot(root);await assert.rejects(demo(base),/refusing overwrite/);assert.throws(()=>fixture(root));assert.equal(snapshot(root).digest,before.digest);});
