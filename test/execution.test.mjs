import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fixture,fixtureEvidence,fixtureIdentity,verifyFixture,plan} from '../demo.mjs';
import {adjudicate,repairLoop,hash} from '../sentinel.mjs';
function setup(t){const parent=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-exec-'));t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));const root=path.join(parent,'repo');fixture(root);return root;}
test('T3 real approved JavaScript executes baseline and both repairs with distinct exact identities',t=>{
 const root=setup(t),runs=[verifyFixture(root)];
 for(const edits of plan){for(const e of edits){const p=path.join(root,e.path);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(e.before,e.after));}runs.push(verifyFixture(root));}
 assert.deepEqual(runs.map(r=>r.cases.filter(c=>c.passed).length),[0,2,3]);assert.equal(new Set(runs.map(r=>r.candidateDigest)).size,3);assert.equal(new Set(runs.map(r=>r.harnessDigest)).size,1);assert.ok(runs.every(r=>r.observations.capabilities.every(x=>x==='undefined')));
});
test('T1/T2/T3 actual missing exception survives AI rejection and wrong explanation',t=>{
 const root=setup(t),f={id:'empty',claim:{scope:'behavior',conditionId:'mean.empty',operator:'violates_requirement'},mechanism:{conditionId:'empty.divisor',value:{kind:'value',value:0}}};
 const context=fixtureEvidence(root,f);const r=adjudicate(f,{verdict:'rejected',reason:'divisor is not zero'},context);
 assert.equal(r.effectiveAdjudication,'supported');assert.equal(r.mechanismAssessment.effective,'rejected');assert.equal(r.aiEvidenceDisagreement.evidenceBasedOutcome,'supported');
 const stale={...context,identity:{...context.identity,candidateDigest:'0'.repeat(64)}};assert.equal(adjudicate(f,{},stale).adjudicationCompleteness,'unverified_incomplete');
});
test('T3 unknown or edited harness/implementation is blocked before execution; no model commands run',t=>{
 const root=setup(t),before=fixtureIdentity(root);fs.appendFileSync(path.join(root,'math.mjs'),'\nfetch("http://example.invalid");');
 const r=verifyFixture(root);assert.equal(r.executionStatus,'unverified_incomplete');assert.equal(r.observations,undefined);
 fs.writeFileSync(path.join(root,'math.mjs'),before.files['math.mjs']);fs.appendFileSync(path.join(root,'math.test.mjs'),'// always pass');assert.equal(verifyFixture(root).executionStatus,'unverified_incomplete');
});
test('T3 repair leaves all original Git metadata bytes intact and records each candidate and edit',t=>{
 const root=setup(t);function inventory(){const result={};function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())scan(p);else result[path.relative(root,p)]=hash(fs.readFileSync(p));}}scan(root);return result;}
 const before=inventory(),r=repairLoop(root,plan,2,verifyFixture);assert.deepEqual(inventory(),before);assert.deepEqual(r.history.map(x=>x.passed),[false,false,true]);assert.equal(new Set(r.history.map(x=>x.candidateDigest)).size,3);assert.equal(r.history[1].edits.length,1);assert.equal(r.repairsAccepted,false);assert.equal(r.humanApproval,'pending');
});
