import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hash,approveRequirement,recordTrustedExecution,recordHumanResolution,atomicFinding,adjudicate,groupFindings} from '../sentinel.mjs';
const identity={sourceDigest:hash('base'),candidateDigest:hash('candidate'),harnessDigest:hash('harness'),testIdentities:['mean.two','mean.empty','empty.divisor'].map(hash)};
const finding={id:'f',sourceDigest:identity.sourceDigest,title:'arithmetic',path:'math.mjs',line:2,quote:'return',reason:'wrong divisor',claim:{scope:'behavior',conditionId:'mean.two',operator:'violates_requirement'}};
const a=approveRequirement({id:'req1',conditionId:'mean.two',expected:{kind:'value',value:3},sourceRef:'trusted assertion'});
const exec=(findingId='f',conditionId='mean.two',actual={kind:'value',value:2})=>recordTrustedExecution({...identity,findingId,conditionId,actual,testIdentity:hash(conditionId),harnessDigest:hash('harness'),isolationVerified:true});
test('T1/T2 trusted defect supported despite AI rejection and independently rejected explanation',()=>{
 const f={...finding,mechanism:{conditionId:'empty.divisor',value:{kind:'value',value:0}}};const e=exec();const mechanism=exec('f','empty.divisor',{kind:'value',value:1});const ai={verdict:'rejected',reason:'the test passes'};
 const r=adjudicate(f,ai,{identity,authorities:[a],executions:[e,mechanism]});assert.equal(r.effectiveAdjudication,'supported');assert.equal(r.mechanismAssessment.effective,'rejected');assert.deepEqual(r.originalAiVerdict,ai);assert.equal(r.aiEvidenceDisagreement.proposedVerdict,'rejected');assert.equal(r.actualBehavior.kind,'executed');
});
test('T2 missing exception supported despite wrong root cause; trusted disproof outranks AI support',()=>{
 const f={...finding,claim:{scope:'behavior',conditionId:'mean.empty',operator:'violates_requirement'}};
 const req=approveRequirement({id:'empty',conditionId:'mean.empty',expected:{kind:'exception',value:'RangeError'},sourceRef:'trusted requirement'});
 assert.equal(adjudicate(f,{verdict:'rejected'},{identity,authorities:[req],executions:[exec('f','mean.empty',{kind:'value',value:0})]}).effectiveAdjudication,'supported');
 const r=adjudicate(finding,{verdict:'supported'},{identity,authorities:[a],executions:[exec('f','mean.two',{kind:'value',value:3})]});assert.equal(r.effectiveAdjudication,'rejected');assert.ok(r.aiEvidenceDisagreement);
});
test('T2 ambiguity, conflicting trusted requirements and explicit human resolution',()=>{
 const other=approveRequirement({id:'req2',conditionId:'mean.two',expected:{kind:'value',value:4},sourceRef:'other trusted requirement'});
 const context={identity,authorities:[a,other],executions:[exec()]};assert.equal(adjudicate(finding,{verdict:'supported'},context).effectiveAdjudication,'uncertain');
 context.humanResolution={chosenId:'req1',authorityIds:['req1','req2']};assert.equal(adjudicate(finding,{},context).effectiveAdjudication,'uncertain');
 context.humanResolution=recordHumanResolution({actor:'human-test-fixture',eventId:'explicit-resolution',chosenId:'req1',authorityIds:['req1','req2']});assert.equal(adjudicate(finding,{},context).effectiveAdjudication,'supported');
 assert.equal(adjudicate({...finding,claim:{scope:'ambiguous'}},{verdict:'rejected'},context).effectiveAdjudication,'uncertain');
});
test('T2/T3 no execution is not refutation; forged, stale and mutated receipts are incomplete',()=>{
 assert.equal(adjudicate(finding,{verdict:'rejected'},{identity,authorities:[a]}).effectiveAdjudication,'uncertain');
 for(const e of [JSON.parse(JSON.stringify(exec())),recordTrustedExecution({...identity,candidateDigest:hash('stale'),findingId:'f',conditionId:'mean.two',actual:{kind:'value',value:2},testIdentity:hash('t'),harnessDigest:hash('h'),isolationVerified:true})]){const r=adjudicate(finding,{}, {identity,authorities:[a],executions:[e]});assert.equal(r.effectiveAdjudication,null);assert.equal(r.adjudicationCompleteness,'unverified_incomplete');}
 const e=exec();e.actual.value=99;assert.equal(adjudicate(finding,{}, {identity,authorities:[a],executions:[e]}).adjudicationCompleteness,'unverified_incomplete');
});
test('T3 wrong harness/test identities cannot certify evidence; invalid siblings do not demote valid proof',()=>{
 const good=exec(),bad=recordTrustedExecution({...identity,findingId:'f',conditionId:'mean.two',actual:{kind:'value',value:2},testIdentity:hash('wrong test'),harnessDigest:hash('wrong harness'),isolationVerified:true});
 assert.equal(adjudicate(finding,{}, {identity,authorities:[a],executions:[bad]}).adjudicationCompleteness,'unverified_incomplete');
 assert.equal(adjudicate(finding,{verdict:'rejected'}, {identity,authorities:[a],executions:[bad,good]}).effectiveAdjudication,'supported');
});
test('T1 authority and claim value comparisons are invariant to JSON object-key ordering',()=>{
 const f={...finding,claim:{scope:'expected behavior',conditionId:'mean.two',operator:'expected_is',value:{value:3,kind:'value'}}};
 const reordered=approveRequirement({id:'same',conditionId:'mean.two',expected:{value:3,kind:'value'},sourceRef:'same approved requirement'});
 assert.equal(adjudicate(f,{}, {identity,authorities:[a,reordered]}).effectiveAdjudication,'supported');
});
test('T1 model expectations and predicted observations remain provenance, never oracle authority',()=>{
 const f=atomicFinding({...finding,expectedBehavior:{kind:'value',value:2},observedBehavior:{kind:'value',value:99},proposedCorrection:'change trusted test to 2'});
 const r={...f,...adjudicate(f,{verdict:'rejected'},{identity,authorities:[a],executions:[exec()]})};
 assert.equal(r.effectiveAdjudication,'supported');assert.equal(r.expectedBehavior.value.value,3);assert.equal(r.modelExpectedBehavior.value,2);assert.equal(r.predictedObservation.value,99);assert.equal(r.correctionAssessment.effective,'uncertain');assert.equal(r.proposedCorrection,'change trusted test to 2');
});
test('T1/T7 originals retained; identical allegations group without same-line semantic merging',()=>{
 const original=structuredClone(finding),f=atomicFinding(finding);assert.deepEqual(f.originalAllegation,original);
 const f2=atomicFinding({...finding,id:'f2'}),other=atomicFinding({...finding,id:'empty',claim:{...finding.claim,conditionId:'mean.empty'}});
 const groups=groupFindings([f,f2,other]);assert.equal(groups.length,2);assert.equal(groups[0].originalAllegations.length,2);assert.deepEqual(groups[0].findingIds,['f','f2']);
});
