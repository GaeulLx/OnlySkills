import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../worker/index.js", import.meta.url), "utf8");
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from);
  return source.slice(from, to);
}
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// Execute the real approval controller; no requests touch the deployed backend.
function approvalHarness(approved) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {hidden:false,innerHTML:"",classList:{remove(){}},focus(){this.focused=true;}});
    return nodes.get(id);
  };
  const requests = [], routes = [], errors = [];
  let resolveRequest, rejectRequest;
  const run = {runId:"local-run",recommendation:{actionId:"local-action"},statusData:{status:"awaiting_approval"},decisionRecorded:false};
  const context = vm.createContext({currentAgentRun:run,agentDecisionBusy:false,profileOnboardingPending:true,$:node,escapeHTML,
    displayApiValue:value=>value??"Not returned by backend",renderApiFields:()=>"",renderAgentRun(){},
    showError:(...args)=>errors.push(args),apiURL:path=>"https://onlyskills.onrender.com"+path,
    selectAppTab:(...args)=>routes.push(args),requestAgentJSON:(url,options)=>{requests.push({url,...options});return new Promise((resolve,reject)=>{resolveRequest=resolve;rejectRequest=reject;});}});
  vm.runInContext(section("async function recordRecommendationDecision(", '$("#approve-recommendation").addEventListener'), context);
  const task = vm.runInContext("recordRecommendationDecision("+approved+")",context);
  return {nodes,node,requests,routes,errors,run,context,task,resolve:value=>resolveRequest(value),reject:err=>rejectRequest(err)};
}
let h = approvalHarness(true);
assert.equal(h.routes.length,0,"approval does not navigate before backend acknowledgement");
assert.equal(h.node("#decision-loading").hidden,false);
assert.equal(h.requests[0].url,"https://onlyskills.onrender.com/api/approve");
assert.equal(h.requests[0].method,"POST");
assert.deepEqual(JSON.parse(h.requests[0].body),{runId:"local-run",actionId:"local-action",approved:true});
await vm.runInContext("recordRecommendationDecision(true)",h.context);
assert.equal(h.requests.length,1,"duplicate click during save is ignored");
h.resolve({status:"approved",message:"Recorded <decision> & saved"});
await h.task;
assert.deepEqual(h.routes,[['matching','tab-matching','matching-goal-approved']]);
assert.equal(h.run.decisionRecorded,true);
assert.equal(h.context.profileOnboardingPending,false);
assert.equal(h.node("#tab-matching").focused,true);
assert.match(h.node("#matching-goal-approved").innerHTML,/Recorded &lt;decision&gt; &amp; saved/);
assert.equal(h.node("#matching-goal-approved").hidden,false);
assert.equal(h.node("#decision-loading").hidden,true);
await vm.runInContext("recordRecommendationDecision(true)",h.context);
assert.equal(h.requests.length,1,"a recorded decision is not submitted twice");

h=approvalHarness(true);
h.reject(new Error("Backend returned HTTP 503"));
await h.task;
assert.equal(h.routes.length,0,"failed approval stays in AI Workspace");
assert.equal(h.run.decisionRecorded,false);
assert.ok(h.errors.some(([id,text])=>id==="decision-error"&&text.includes("503")));
assert.equal(h.context.agentDecisionBusy,false);

h=approvalHarness(false);
h.resolve({status:"rejected",message:"Rejection recorded"});
await h.task;
assert.equal(JSON.parse(h.requests[0].body).approved,false);
assert.equal(h.routes.length,0,"Reject keeps the results available for review");

h=approvalHarness(true);
h.context.currentAgentRun={runId:"different-run"};
h.resolve({status:"approved",message:"Recorded"});
await h.task;
assert.equal(h.routes.length,0,"a stale approval cannot redirect a newer workflow");
h=approvalHarness(true);
h.node("#agent-page").hidden=true;
h.resolve({status:"approved",message:"Recorded"});
await h.task;
assert.equal(h.routes.length,0,"leaving the page during a slow save does not hijack navigation");

// Execute the shared renderer against isolated hosts to test disclosure and data fidelity.
let focused=null;
function resultsHost(){
  const host={html:"",writes:0,details:[],contains:node=>node?.host===host,querySelectorAll(selector){return selector==="details[open]"?this.details.filter(d=>d.open):this.details;}};
  Object.defineProperty(host,"innerHTML",{get(){return this.html;},set(html){this.html=html;this.writes++;this.details=[...html.matchAll(/<details[^>]*data-agent-key="([^"]+)"([^>]*)>/g)].map(([,key,attributes])=>({dataset:{agentKey:key},open:attributes.includes("open"),querySelector(){return{focus(){focused=key;}};}}));}});
  return host;
}
const hosts={"#agent-results":resultsHost(),"#workbuddy-agent-results":resultsHost()};
const document={activeElement:null};
const context=vm.createContext({$:id=>hosts[id],escapeHTML,document});
vm.runInContext(section("function displayApiValue(","function matchingAgentInArray("),context);
context.entries=[{key:"businessAnalyst",status:"completed",value:{status:"completed",summary:"A returned summary <not markup>",market:{segment:"Campus",numbers:[0,false,null]},unusualField:"Keep this exact field"}},{key:"feedback",value:undefined}];
vm.runInContext('renderAgentResults("agent-results",entries,"No result returned yet.")',context);
const host=hosts["#agent-results"];
assert.equal(host.details.length,2);
assert.ok(host.details.every(d=>!d.open),"results start compact without discarding fields");
for(const value of ["Business analyst","completed","A returned summary &lt;not markup&gt;","segment","Campus","unusualField","Keep this exact field","false","null","No result returned yet.","Awaiting result"])assert.ok(host.html.includes(value),value);
assert.doesNotMatch(host.html,/<not markup>/);
host.details[0].open=true;
document.activeElement={host,closest:()=>host.details[0]};
vm.runInContext('renderAgentResults("agent-results",entries,"No result returned yet.")',context);
assert.equal(host.writes,1,"an unchanged poll preserves the actual disclosure DOM");
context.entries[0].status="reviewed";
vm.runInContext('renderAgentResults("agent-results",entries,"No result returned yet.")',context);
assert.equal(host.details[0].open,true,"changed results preserve the user's expanded agent");
assert.equal(focused,"businessAnalyst","changed results restore disclosure keyboard focus");
vm.runInContext('renderAgentResults("workbuddy-agent-results",entries,"No result returned yet.")',context);
assert.equal(hosts["#workbuddy-agent-results"].writes,1,"lookup has its own disclosure state");
assert.equal(hosts["#workbuddy-agent-results"].details[0].open,false);

// The deployed WorkBuddy results have actual fields but no per-agent status.
// Availability labels must not claim that a missing execution status is "completed".
for(const value of [undefined,null,"","   ",[],{}]){
  context.resultValue=value;
  assert.equal(vm.runInContext('agentResultStatusText(undefined,resultValue)',context),"Awaiting result");
}
for(const value of [{summary:"Returned plan"},["Returned task"],"Returned plan",0,false]){
  context.resultValue=value;
  assert.equal(vm.runInContext('agentResultStatusText(undefined,resultValue)',context),"Result received");
}
context.resultValue={summary:"Returned plan"};
for(const status of [undefined,null,"","   "]){
  context.resultStatus=status;
  assert.equal(vm.runInContext('agentResultStatusText(resultStatus,resultValue)',context),"Result received");
}
for(const status of ["completed","running","failed","cancelled","custom_backend_status"]){
  context.resultStatus=status;
  assert.equal(vm.runInContext('agentResultStatusText(resultStatus,resultValue)',context),status,"explicit backend statuses are preserved");
}
context.entries=[
  {key:"businessAnalyst",value:{budgetCurrency:"MYR",withinBudget:false}},
  {key:"growth",value:{contentCalendar:["QA-only task"]}},
  {key:"teamBuilder",value:{identifiedNeeds:["Sales"]}},
  {key:"operations",value:{orders:0}},
  {key:"feedback",value:{requiresApproval:true,actionId:"qa-only-action"}}
];
for(const containerId of ["agent-results","workbuddy-agent-results"]){
  context.containerId=containerId;
  vm.runInContext('renderAgentResults(containerId,entries,"No result returned yet.")',context);
  const rendered=hosts["#"+containerId].html;
  assert.equal((rendered.match(/>Result received<\/span>/g)||[]).length,5,"all returned agents show result availability");
  assert.doesNotMatch(rendered,/Status not returned by backend|>completed<\/span>/);
  assert.ok(rendered.includes("withinBudget")&&rendered.includes("false")&&rendered.includes("orders")&&rendered.includes(">0</span>"),"actual result fields remain unchanged");
}
context.entries[4].value=undefined;
vm.runInContext('renderAgentResults("agent-results",entries,"No result returned yet.")',context);
assert.equal((host.html.match(/>Result received<\/span>/g)||[]).length,4);
assert.equal((host.html.match(/>Awaiting result<\/span>/g)||[]).length,1,"a missing agent is not shown as received");
assert.doesNotMatch(source,/Status not returned by backend/);
assert.ok(source.includes('renderAgentResults("agent-results", AGENT_KEYS.map'));
assert.ok(source.includes('renderAgentResults("workbuddy-agent-results", AGENT_KEYS.map'));
assert.match(source,/const AGENT_KEYS = \["businessAnalyst", "growth", "teamBuilder", "operations", "feedback"\]/,"all existing agents are retained");

console.log("Approval navigation, failure/reject/stale states, actual-result availability statuses and disclosure preservation passed.");
