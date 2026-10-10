import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { BOOKS_SCRIPT } from "../worker/books-ui.js";

const source = await readFile(new URL("../worker/index.js", import.meta.url), "utf8");
function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, "interaction handler is available");
  return source.slice(from, to);
}
function context(values) { return vm.createContext(values); }
function run(code, values) { vm.runInContext(code, values); }

// Run the actual navigation function: a fresh user must reach the visible form.
const routes = [];
const routing = context({currentMatchingState:null, currentAgentRun:null, selectAppTab:(...args) => routes.push(args)});
run(section("function navigateWorkspace(", 'document.querySelectorAll("[data-workspace-destination]")'), routing);
run('navigateWorkspace("plan")', routing);
assert.deepEqual(routes.pop(), ["profile", "nav-profile", "matching-form"]);
routing.currentMatchingState = {profile:{role:"Sales"}, team:{status:"active"}};
run('navigateWorkspace("plan")', routing);
assert.deepEqual(routes.pop(), ["matching", "nav-plan", "matching-task-section"]);

// Repeated poll renders must keep the same DOM buttons, including focused ones.
let replacements = 0;
const actionHost = {dataset:{}, buttons:new Map(), querySelector(selector){return this.buttons.get(selector.slice(1));}, querySelectorAll(){return [...this.buttons.values()];}};
Object.defineProperty(actionHost, "innerHTML", {set(html){replacements++;this.buttons=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],{id:m[1],disabled:false,textContent:""}]));}});
const rendering = context({$:()=>actionHost, matchingActionBusy:false, matchingMessageBusy:false, matchingTaskBusy:false});
run(section("function renderMatchingActions(", "async function refreshMatching("), rendering);
rendering.team = {id:"local-team", status:"forming", yourInvitationStatus:"invited"};
run("renderMatchingActions(team)", rendering);
const accept = actionHost.buttons.get("matching-accept");
run("renderMatchingActions(team)", rendering);
assert.equal(actionHost.buttons.get("matching-accept"), accept);
assert.equal(replacements, 1);
rendering.matchingActionBusy = true;
run("renderMatchingActions(team)", rendering);
assert.equal(actionHost.buttons.get("matching-accept"), accept);
assert.equal(accept.disabled, true);
rendering.team.yourInvitationStatus = "accepted";
rendering.matchingActionBusy = false;
run("renderMatchingActions(team)", rendering);
const cancel = actionHost.buttons.get("matching-cancel");
rendering.team.status = "active";
run("renderMatchingActions(team)", rendering);
assert.equal(actionHost.buttons.get("matching-cancel"), cancel);
assert.equal(cancel.textContent, "Cancel team");

// Cancelling the confirmation must not make any mutation request.
let actionListener;
let confirmResult = false;
const mutations = [];
const cancelling = context({$:()=>({addEventListener:(type,fn)=>{actionListener=fn;}}), currentMatchingState:{team:{id:"local-team",status:"active"}}, matchingActionBusy:false, matchingMessageBusy:false, matchingTaskBusy:false, deviceId:"local-device", window:{confirm:()=>confirmResult}, runMatchingAction:(...args)=>mutations.push(args)});
run(section('$("#matching-team-actions").addEventListener', "function renderPersonalTasks("), cancelling);
const cancelEvent = {target:{closest:selector=>selector==="#matching-cancel"}};
actionListener(cancelEvent);
assert.equal(mutations.length, 0);
confirmResult = true;
actionListener(cancelEvent);
assert.equal(mutations[0][0], "/api/matching/cancel");
assert.equal(mutations[0][1].teamId, "local-team");

// Resolve the old send after a new draft has been typed, even with identical text.
const chatEvents = {}, inputEvents = {};
const chatForm = {elements:{message:{value:"First message", addEventListener:(type,fn)=>{inputEvents[type]=fn;}}}, reportValidity:()=>true, addEventListener:(type,fn)=>{chatEvents[type]=fn;}};
const sendButton = {};
let resolveSend;
const chat = context({$:selector=>selector==="#matching-chat-form"?chatForm:selector==="#matching-chat-send"?sendButton:{addEventListener(){}}, FormData:class{constructor(form){this.form=form;}get(){return this.form.elements.message.value;}}, matchingMessageBusy:false, matchingTaskBusy:false, matchingActionBusy:false, matchingMessageDraftVersion:0, matchingStateEpoch:0, deviceId:"local-device", currentMatchingState:null, renderMatching(){}, showError(){}, matchingRequest:()=>new Promise(resolve=>{resolveSend=resolve;})});
run(section('$("#matching-chat-form").elements.message.addEventListener', '$("#matching-refresh").addEventListener'), chat);
const event = {preventDefault(){},currentTarget:chatForm};
let sending = chatEvents.submit(event);
chatForm.elements.message.value = "Next unsent draft";
inputEvents.input();
resolveSend({team:{id:"local-team"}});
await sending;
assert.equal(chatForm.elements.message.value, "Next unsent draft");
sending = chatEvents.submit(event);
inputEvents.input(); // Editing and restoring the same text still creates a new draft.
resolveSend({team:{id:"local-team"}});
await sending;
assert.equal(chatForm.elements.message.value, "Next unsent draft");
sending = chatEvents.submit(event);
resolveSend({team:{id:"local-team"}});
await sending;
assert.equal(chatForm.elements.message.value, "");

// Focus recovery moves an obscured field below the measured mobile navigation.
const scrolls = [];
let mobile = true;
const focus = context({window:{matchMedia:()=>({matches:mobile}),innerHeight:844,scrollBy:options=>scrolls.push(options)},workspaceSidebar:{getBoundingClientRect:()=>({bottom:232})}});
run(section("function keepWorkspaceFocusVisible(", "    updateWorkspaceScrollOffset();"), focus);
focus.target={closest:()=>true,getClientRects:()=>[{}],getBoundingClientRect:()=>({top:169,bottom:215})};
run("keepWorkspaceFocusVisible(target)", focus);
assert.equal(scrolls[0].top, -75);
mobile=false;
run("keepWorkspaceFocusVisible(target)", focus);
assert.equal(scrolls.length, 1);

// Execute the full bookkeeping UI with a local fake DOM and deterministic OCR.
// It never calls the hosted service and does not upload a real file.
class Node {
  constructor(){this.value="";this.hidden=false;this.disabled=false;this.checked=false;this.textContent="";this.events={};this.files=[];}
  addEventListener(type,fn){this.events[type]=fn;}
}
const nodes = new Map();
const node = id => {if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
const booksForm=node("#books-form");
booksForm.elements=Object.fromEntries(["date","merchant","amount","note","reviewed","kind","currency","category"].map(name=>[name,new Node()]));
booksForm.reset=()=>{for(const input of Object.values(booksForm.elements)){input.value="";input.checked=false;}booksForm.elements.kind.value="expense";booksForm.elements.currency.value="MYR";booksForm.elements.category.value="Other";node("#books-file").value="";};
node("#books-language").value="eng";
const books=context({document:{querySelector:node,addEventListener(){}},deviceId:"local-device",crypto:{randomUUID:()=>"local-request"},Date,URL:{createObjectURL:()=>"blob:local-test",revokeObjectURL(){}},setTimeout,clearTimeout,confirm:()=>confirmResult,window:{Tesseract:true},Tesseract:{createWorker:async()=>({recognize:async()=>({data:{text:""}}),terminate:async()=>{}})}});
run(BOOKS_SCRIPT,books);
const oversized={type:"application/pdf",size:9*1024*1024,name:"oversized-local-test.pdf"};
booksForm.elements.merchant.value="Manual shop";
booksForm.elements.amount.value="25.50";
node("#books-file").files=[oversized];
await node("#books-file").events.change();
assert.equal(booksForm.elements.merchant.value,"Manual shop");
assert.equal(booksForm.elements.amount.value,"25.50");
assert.equal(node("#books-selected-file").hidden,true);
assert.equal(node("#books-scan").hidden,true);
assert.match(node("#books-form-error").textContent,/not attached/);
confirmResult=true;
node("#books-file").files=[{type:"image/png",size:512,name:"valid-local-test.png"}];
await node("#books-file").events.change();
assert.match(node("#books-selected-file").textContent,/valid-local-test.png/);
assert.equal(node("#books-scan").hidden,false);
node("#books-file").files=[oversized];
await node("#books-file").events.change();
assert.match(node("#books-selected-file").textContent,/valid-local-test.png/);
assert.equal(booksForm.elements.merchant.value,"Manual shop");
confirmResult=false;
node("#books-new").events.click();
assert.equal(booksForm.elements.amount.value,"25.50");
assert.match(node("#books-selected-file").textContent,/valid-local-test.png/);
confirmResult=true;
node("#books-new").events.click();
assert.equal(booksForm.elements.amount.value,"");
assert.equal(node("#books-selected-file").hidden,true);
assert.equal(node("#books-scan").hidden,true);

console.log("Interaction regressions passed: fresh-user routing, stable action buttons, cancel confirmation, slow-send draft protection, mobile focus recovery, invalid attachments and draft confirmation.");
