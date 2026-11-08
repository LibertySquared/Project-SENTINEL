import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import * as E from '../sentinel.mjs';
import * as D from '../demo.mjs';
const numeric={variants:[{kind:'value',valueType:'number',encodedNonFinite:true},{kind:'exception',valueType:'string'}]};
const identity={sourceDigest:E.hash('base'),candidateDigest:E.hash('candidate'),harnessDigest:E.hash('harness'),testIdentities:[E.hash('A'),E.hash('B')],conditions:Object.fromEntries(['A','B'].map(id=>[id,{testIdentity:E.hash(id),harnessDigest:E.hash('harness'),candidateDigest:E.hash('candidate'),category:'runtime_observation',verificationMethod:'approved-test-v1',scope:'behavior',observationSchema:numeric}]))};
const finding={id:'f',claim:{conditionId:'A',scope:'behavior',operator:'violates_requirement'}};
const authorities=['A','B'].map((conditionId,i)=>E.approveRequirement({id:conditionId,conditionId,sourceRef:'approved oracle',expected:{kind:'value',value:i?7:3}}));
const execution=(overrides={})=>E.recordTrustedExecution({...identity,findingId:'f',conditionId:'A',testIdentity:E.hash('A'),actual:{kind:'value',value:2},executionStatus:'completed',verificationStatus:'verified',verificationMethod:'approved-test-v1',scope:'behavior',category:'runtime_observation',isolationVerified:true,...overrides});
const assess=executions=>E.adjudicate(finding,{verdict:'rejected'},{identity,authorities,executions});
function temp(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-3a-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
test('F1 malformed or incomplete authenticated observations cannot prove or disprove behavior',()=>{
 for(const actual of [{},{kind:'value'},{kind:'value',value:'bad'},{kind:'exception',value:17},{kind:'presence',value:true},[],{kind:'value',value:undefined},{kind:'value',value:2,extra:1}]){
  let r;try{r=assess([execution({actual})]);}catch{continue;}assert.equal(r.effectiveAdjudication,null);assert.equal(r.adjudicationCompleteness,'unverified_incomplete');
 }
 for(const executionStatus of [undefined,'failed','timeout','cancelled','incomplete','not_run']){let r;try{r=assess([execution({executionStatus,exitCode:0})]);}catch{continue;}assert.equal(r.effectiveAdjudication,null);}
 const r=assess([execution({actual:{}}),execution()]);assert.equal(r.effectiveAdjudication,'supported');assert.equal(r.reproduced,true);
});
test('F2 swapped approved test identities are rejected for both conditions; correct siblings survive',()=>{
 for(const [conditionId,wrong] of [['A','B'],['B','A']]){
  const f={...finding,claim:{...finding.claim,conditionId}},bad=execution({conditionId,testIdentity:E.hash(wrong)}),good=execution({conditionId,testIdentity:E.hash(conditionId)});
  const context={identity,authorities,executions:[bad]};assert.equal(E.adjudicate(f,{},context).adjudicationCompleteness,'unverified_incomplete');
  context.executions=[bad,good];assert.equal(E.adjudicate(f,{},context).effectiveAdjudication,'supported');
 }
});
test('F3 static/test inspection support is retained without runtime reproduction',()=>{
 const root=fileURLToPath(new URL('../artifacts/validation/planted-repo/',import.meta.url));
 for(const conditionId of ['test.empty.exists','empty.divisor','two.divisor']){
  const f={id:'static',claim:{conditionId,scope:conditionId==='test.empty.exists'?'suite coverage':'source fact',operator:conditionId==='test.empty.exists'?'absent':'equals',value:{kind:'value',value:0}}};
  const context=D.fixtureEvidence(root,f),r=E.adjudicate(f,{},context);
  assert.equal(r.reproduced,false);assert.notEqual(r.actualBehavior.kind,'executed');assert.equal(r.effectiveAdjudication,'rejected');
 }
 const f={id:'runtime',claim:{scope:'behavior',conditionId:'mean.two',operator:'violates_requirement'}},context=D.fixtureEvidence(root,f);assert.equal(E.adjudicate(f,{},context).reproduced,true);
});
test('F4 reviewer timeout, invalid response and budget exhaustion retain distinct execution states',async t=>{
 const base=temp(t),root=path.join(base,'repo');D.fixture(root);const c=JSON.parse(fs.readFileSync(new URL('../config.example.json',import.meta.url)));
 const timeout=()=>{const e=Error('deadline');e.name='TimeoutError';throw e;};
 for(const [name,infer,config] of [['timeout',timeout,c],['invalid_response',async()=>({findings:'bad'}),c],['budget_exhausted',async()=>({findings:[]}),{...c,budget:{maxCalls:0}}]]){
  const r=await E.review(root,config,path.join(base,name),infer);assert.ok(r.reports.every(x=>x.executionStatus===name));assert.equal(r.humanApproval,'pending');assert.equal(E.executionSucceeded(r),false);
 }
});
const config={endpoint:'http://127.0.0.1:11434',inference:{enabled:true,approvedSourceDigest:E.hash('selection')}};
const role={model:'fake-local',instructions:'read-only'},payload={files:{'a.js':'const x=1;'}};
const request=()=>E.requestBody(config,role,payload);
function authorization(body=request()){return E.authorizePayload?.({actor:'explicit-test-human',approvalId:'reviewed-safe-payload',request:body,destination:config.endpoint+'/api/chat',selection:{sourceDigest:E.hash('selection'),files:['a.js']}});}
test('F5 source digest and screening alone do not authorize a transport; exact payload approval does',async()=>{
 let called=0;const transport=async()=>{called++;return new Response(JSON.stringify({done:true,message:{content:'{"findings":[]}'}}));};
 await assert.rejects(E.ollama(config,role,payload,{transport}),/authoriz|approval/i);assert.equal(called,0);
 const auth=authorization();await E.ollama(config,role,payload,{transport,authorization:auth});assert.equal(called,1);
 await assert.rejects(E.ollama(config,role,{files:{'a.js':'const x=2;'}},{transport,authorization:auth}),/authoriz|approval/i);
 await assert.rejects(E.ollama({...config,endpoint:'http://127.0.0.1:11435'},role,payload,{transport,authorization:auth}),/authoriz|approval/i);assert.equal(called,1);
});
test('F6 junction alias cannot create evaluator output in protected disposable evidence',async t=>{
 const root=temp(t),moduleRoot=path.join(root,'module');fs.mkdirSync(moduleRoot);
 for(const f of ['sentinel.mjs','demo.mjs'])fs.copyFileSync(new URL((process.env.SENTINEL_3A_REPRO_SOURCE==='stage3'?'../../../milestone-2-stage-3/implementation/':'../')+f,import.meta.url),path.join(moduleRoot,f));
 for(const name of ['validation','strict-model-review','numbered-model-review','final-repair-validation','milestone-2-stage-1','milestone-2-stage-2'])fs.mkdirSync(path.join(moduleRoot,'artifacts',name),{recursive:true});
 const protectedDir=path.join(moduleRoot,'artifacts','validation'),alias=path.join(root,'alias');fs.writeFileSync(path.join(protectedDir,'preserved.txt'),'unchanged');fs.symlinkSync(protectedDir,alias,process.platform==='win32'?'junction':'dir');
 const local=await import(pathToFileURL(path.join(moduleRoot,'demo.mjs')).href);try{local.archivedBenchmark(path.join(alias,'new-output'));}catch{}
 assert.equal(fs.existsSync(path.join(protectedDir,'new-output')),false);assert.equal(fs.readFileSync(path.join(protectedDir,'preserved.txt'),'utf8'),'unchanged');
});
test('F7 canonical grouping ignores property order but never merges distinct same-line conditions',()=>{
 const f={id:'1',path:'a.js',line:2,sourceDigest:E.hash('source'),claim:{scope:'behavior',conditionId:'A',operator:'equals',value:{kind:'value',value:3}}};
 const second={...f,id:'2',claim:{...f.claim,value:{value:3,kind:'value'}}},other={...f,id:'3',claim:{...f.claim,conditionId:'B'}};
 const groups=E.groupFindings([f,second,other]);assert.equal(groups.length,2);assert.deepEqual(groups[0].findingIds,['1','2']);
});
test('F8 successful, failed and timed-out fake requests have precise monotonic lifecycle records',async()=>{
 for(const status of ['completed','failed','timeout','cancelled','invalid_response','incomplete']){
  let now=10;const events=[],clock={mono:()=>now,wall:()=>new Date(1000+now).toISOString(),kind:'injected_test_clock'};
  const responseExpected=['completed','invalid_response','incomplete'].includes(status);
  const transport=async()=>{now+=7;if(!responseExpected){const e=Error('simulated');e.name=status==='timeout'?'TimeoutError':status==='cancelled'?'AbortError':'Error';throw e;}return new Response(JSON.stringify({done:status!=='incomplete',message:{content:status==='invalid_response'?'bad json':'{}'}}));};
  try{await E.ollama(config,role,payload,{authorization:authorization(),transport,clock,capture:(type,data)=>events.push({type,...data})});}catch(e){if(status==='completed')throw e;}
  const times=events.filter(e=>e.type==='request_timing');assert.ok(times.some(e=>e.stage==='admission'));assert.ok(times.some(e=>e.stage==='dispatch'));const end=times.find(e=>e.stage==='finished');assert.equal(end.status,status);assert.equal(end.elapsedMs,7);assert.equal(end.clockKind,'injected_test_clock');assert.ok(times.every(e=>typeof e.wallTime==='string'&&Number.isFinite(e.monotonicMs)));assert.equal(times.some(e=>e.stage==='response_completion'),responseExpected);
 }
});
test('F1 authenticity, completeness, binding and assertion outcome are independent',()=>{
 const r=assess([execution({executionStatus:'failed',actual:{kind:'value',value:3},exitCode:0})]);
 assert.equal(r.effectiveAdjudication,null);assert.equal(r.evidenceChecks[0].authenticity,'authenticated');assert.equal(r.evidenceChecks[0].executionCompleteness,'incomplete');assert.equal(r.evidenceChecks[0].observation,'valid');assert.equal(r.evidenceChecks[0].binding,'valid');
 assert.equal(assess([execution({actual:{kind:'value',value:3}})]).effectiveAdjudication,'rejected');assert.equal(assess([execution({actual:{kind:'exception',value:'RangeError'}})]).effectiveAdjudication,'supported');
});
test('F3 reusable static receipts establish source facts without execution or model authority',()=>{
 const id={...identity,conditions:{X:{candidateDigest:identity.candidateDigest,harnessDigest:E.hash('inspector'),inspectionIdentity:E.hash('inspection X'),category:'source_fact',verificationMethod:'approved-generic-inspection',scope:'source fact',observationSchema:{variants:[{kind:'value',valueType:'number'}]}}}};
 const f={id:'static-domain',claim:{conditionId:'X',scope:'source fact',operator:'equals',value:{kind:'value',value:5}}};
 const record=E.recordVerifiedInspection({...id,...id.conditions.X,findingId:f.id,conditionId:'X',actual:{kind:'value',value:5},inspectionStatus:'completed'});
 const r=E.adjudicate(f,{}, {identity:id,inspections:[record]});assert.equal(r.effectiveAdjudication,'supported');assert.equal(r.reproduced,false);assert.equal(r.supportingFacts[0].category,'source_fact');assert.equal(r.supportingFacts[0].verificationStatus,'verified');
 const prediction=JSON.parse(JSON.stringify(record));prediction.category='model_prediction';assert.equal(E.adjudicate(f,{}, {identity:id,inspections:[prediction]}).effectiveAdjudication,null);
});
test('F4 judge failure categories, unexecuted budget tasks and original responses are explicit',async t=>{
 const base=temp(t),root=path.join(base,'repo');D.fixture(root);const c=JSON.parse(fs.readFileSync(new URL('../config.example.json',import.meta.url)));
 const good={title:'defect',path:'math.mjs',line:2,quote:'values.length + 1',reason:'wrong divisor',claim:{conditionId:'mean.two',scope:'behavior',operator:'violates_requirement'}};
 for(const status of ['timeout','cancelled','invalid_response','incomplete','budget_exhausted']){
  const fake=async(c,r,p)=>{if(!p.finding)return {findings:[good]};if(status==='invalid_response')return {verdict:'rejected',reason:'malformed without reproduction'};const e=Error(status==='incomplete'?'Incomplete inference response':'simulated');e.name=status==='timeout'?'TimeoutError':status==='cancelled'?'AbortError':'Error';throw e;};
  const r=await E.review(root,status==='budget_exhausted'?{...c,budget:{maxCalls:2}}:c,path.join(base,status),fake,{evidenceProvider:(f,s)=>D.fixtureEvidence(root,f,s.digest)});
  for(const f of r.findings){assert.equal(f.judgeExecution.status,status);assert.equal(f.judgeExecution.taskState,status==='budget_exhausted'?'not_run':'finished');assert.equal(f.effectiveAdjudication,'supported');if(status==='invalid_response')assert.equal(f.originalAiVerdict.verdict,'rejected');else assert.equal(f.originalAiVerdict,null);}
  assert.equal(E.executionSucceeded(r),false);assert.equal(r.humanApproval,'pending');
 }
});
test('F6 canonical safe sibling output works; protected and existing outputs fail closed',t=>{
 const root=temp(t),protectedDir=path.join(root,'protected');fs.mkdirSync(protectedDir);const safe=path.join(root,'protected-sibling');
 assert.equal(E.prepareNewOutput(safe,[protectedDir]),fs.realpathSync(safe));assert.throws(()=>E.prepareNewOutput(safe,[protectedDir]),/existing|new/);assert.throws(()=>E.prepareNewOutput(path.join(protectedDir,'bad'),[protectedDir]),/historical/);assert.equal(fs.existsSync(path.join(protectedDir,'bad')),false);
});
test('F5/F8 forged or stale approvals and pre-dispatch cancellation never send a payload',async()=>{
 let calls=0;const transport=async()=>{calls++;return new Response('{}');},auth=authorization();
 for(const [c,r,a]of [[config,role,JSON.parse(JSON.stringify(auth))],[{...config,inference:{...config.inference,approvedSourceDigest:E.hash('other-selection')}},role,auth],[config,{...role,instructions:'changed'},auth]])await assert.rejects(E.ollama(c,r,payload,{authorization:a,transport}),/authoriz/i);
 const controller=new AbortController();controller.abort('user cancellation');const events=[];
 await assert.rejects(E.ollama(config,role,payload,{authorization:auth,transport,signal:controller.signal,capture:(type,data)=>events.push({type,...data})}),e=>e.name==='AbortError');
 assert.equal(calls,0);const end=events.find(e=>e.stage==='finished');assert.equal(end.status,'cancelled');assert.equal(end.dispatched,false);assert.equal(end.responseCompleted,false);
});
test('F8 capture-limit failure does not claim a complete response',async()=>{
 const events=[];await assert.rejects(E.ollama(config,role,payload,{authorization:authorization(),transport:async()=>new Response('x'.repeat(262145)),capture:(type,data)=>events.push({type,...data})}),/limit/);
 const end=events.find(e=>e.stage==='finished');assert.equal(end.status,'incomplete');assert.equal(end.responseCompleted,false);assert.ok(Number.isFinite(end.elapsedMs));
});
test('F1 null or unscoped malformed siblings do not crash or erase independent valid evidence',()=>{
 for(const bad of [null,{},'malformed']){assert.equal(assess([bad,execution()]).effectiveAdjudication,'supported');const r=assess([bad]);assert.equal(r.effectiveAdjudication,null);assert.equal(r.adjudicationCompleteness,'unverified_incomplete');}
});
