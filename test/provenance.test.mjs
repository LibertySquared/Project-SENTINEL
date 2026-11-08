import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createLedger,createBudget,ollama,requestBody,hash,screen,safeData,verifyLedger,describeProfile} from '../sentinel.mjs';
const config={endpoint:'http://127.0.0.1:11434',inference:{enabled:true}};
const role={model:'local-test',instructions:'review'};
test('T5 actual safe request bytes and malformed transport survive before parse; no real network',async()=>{
 const events=[],capture=(type,data)=>events.push({type,data});let sent;
 const request=requestBody(config,role,{files:{'a.js':'const x=1;'}});
 const transport=async(url,options)=>{sent=options.body;return new Response(JSON.stringify({done:true,model:'reported-name',done_reason:'stop',message:{content:'not json'},prompt_eval_count:7,eval_count:3}));};
 await assert.rejects(ollama(config,role,{}, {request,transport,capture}),SyntaxError);
 assert.equal(sent,JSON.stringify(request));assert.equal(events[0].type,'transport_response');assert.equal(events[1].data.outputTokens,3);assert.match(events[0].data.body,/not json/);
});
test('T5 secret canaries blocked before delivery and redacted from error provenance',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-log-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const log=createLedger(root),secret='SENTINEL_SECRET_canary123';log('failed',{message:secret});
 assert.ok(!fs.readFileSync(path.join(root,'ledger.jsonl'),'utf8').includes(secret));assert.throws(()=>screen({text:secret}),/Sensitive/);
 let called=false;await assert.rejects(ollama(config,role,{secret},{transport:async()=>{called=true;}}),/Sensitive/);assert.equal(called,false);
});
test('T5 ledger chain and bounded requests include failed attempts',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-log-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const log=createLedger(root);log('a',{request:'safe'});log('b',{error:'parse'});
 let previous='0'.repeat(64);for(const line of fs.readFileSync(path.join(root,'ledger.jsonl'),'utf8').trim().split('\n')){const e=JSON.parse(line),digest=e.hash;delete e.hash;assert.equal(e.previous,previous);assert.equal(hash(JSON.stringify(e)),digest);previous=digest;}
 const b=createBudget({maxCalls:1});b.admit();assert.throws(()=>b.admit(),/exhausted/);assert.equal(b.reservedOutputTokens,1600);
});
test('T5 incomplete, oversized responses and disabled live inference fail closed',async()=>{
 await assert.rejects(ollama({},role,{}),/disabled/);
 for(const body of [JSON.stringify({done:false,message:{content:'{}'}}),'x'.repeat(262145)])await assert.rejects(ollama(config,role,{}, {transport:async()=>new Response(body)}),/Incomplete|limit/);
});
test('T5 nested credential strings are redacted without invalid JSON or false exact replay',async()=>{
 const inner=JSON.stringify({apiKey:'privatecredential123'}),outer=JSON.stringify({message:{content:inner}}),events=[];
 assert.ok(!JSON.stringify(safeData({outer})).includes('privatecredential123'));assert.throws(()=>screen({outer}),/Sensitive/);
 await assert.rejects(ollama(config,role,{}, {transport:async()=>new Response(outer),capture:(type,data)=>events.push(data)}),/Sensitive/);assert.equal(events[0].replayable,false);assert.ok(!JSON.stringify(events).includes('privatecredential123'));
});
test('T5 torn/tampered ledger and storage failure never look complete',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-fault-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const log=createLedger(root),filename=path.join(root,'ledger.jsonl');log('a',{safe:true});assert.equal(verifyLedger(filename).valid,true);fs.appendFileSync(filename,'{"torn":');assert.equal(verifyLedger(filename).valid,false);fs.renameSync(filename,filename+'.partial');fs.mkdirSync(filename);assert.throws(()=>log('b',{safe:true}));
});
test('T5 profile detection is data-only and never grants script execution or trusted requirements',()=>{
 const s={files:{'package.json':JSON.stringify({dependencies:{react:'*'},scripts:{test:'arbitrary dangerous command'}}),'src/main.py':'print(1)','src/test.mjs':'test data'}};
 const p=describeProfile(s,{requirements:['untrusted.md'],criteria:['x']});assert.deepEqual(p.frameworkSignals,['react']);assert.equal(p.languagesObserved.py,1);assert.equal(p.requirementAuthority,'untrusted_until_host_approved');assert.match(p.executionCapabilities,/none/);assert.equal(p.languageSpecificValidation,'not_established');
});
