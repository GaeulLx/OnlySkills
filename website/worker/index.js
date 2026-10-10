import { handleMatchingRoute } from "./matching.js";
import { handleBookkeepingRoute } from "./bookkeeping.js";
import { BOOKS_CSS, BOOKS_HTML, BOOKS_SCRIPT } from "./books-ui.js";
import { serveBooksVendor } from "./books-vendor.js";
import { CHECKLIST_SCRIPT } from "./checklist.js";
import { lookupWorkBuddyResults } from "./workbuddy-results.js";

const ROLES = ["Product Creator", "Marketing", "Sales"];
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_AGENT_API_BASE_URL = "https://onlyskills.onrender.com";

const TASKS = {
  "Product Creator": {
    title: "Prepare the product test batch",
    steps: ["Prepare three sample units", "Check quality and packaging", "Share the confirmed unit cost with the team"],
  },
  Marketing: {
    title: "Create and test one launch post",
    steps: ["Write a short caption and make one visual", "Show it to five students", "Record their reactions and suggestions"],
  },
  Sales: {
    title: "Talk to five potential customers",
    steps: ["Explain the product and price", "Record questions and feedback", "Track real orders separately from interest"],
  },
};

const PAGE = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#ebe5dc">
  <meta name="description" content="Join a three-person student venture team and get clear role-based tasks.">
  <title>OnlySkills — Venture workspace</title>
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#173c36;background:#f5f6f0;font-synthesis:none;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;--green:#173c36;--muted:#64736e;--line:#dce3dc;--peach:#ffb38e;--cream:#fffefa;--soft:#e9f1ec}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 10% 0%,#e7eee6 0,transparent 42%),#f5f6f0}button,input{font:inherit}button{cursor:pointer}button:disabled{cursor:not-allowed;opacity:.52}.topbar{height:70px;max-width:1080px;margin:auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.05rem}.brand-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;background:var(--green);color:var(--peach);font-size:1.1rem}.top-tag,.eyebrow{font-size:.68rem;letter-spacing:.12em;font-weight:800;color:#64736e}.top-tag{border:1px solid var(--line);border-radius:999px;padding:8px 11px}.container{max-width:860px;margin:0 auto;padding:24px 24px 64px}.hero{padding:30px 0 24px}.hero .eyebrow{color:#648073}.hero h1{font-family:Georgia,serif;font-size:clamp(2.4rem,7vw,4rem);line-height:.98;letter-spacing:-.045em;margin:14px 0 14px;max-width:670px}.hero p{color:var(--muted);font-size:1rem;line-height:1.55;max-width:540px;margin:0}.progress-card{padding:16px 18px;background:#edf1e9;border:1px solid #dfe7dc;border-radius:16px;margin:0 0 16px}.progress-line{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:.82rem;font-weight:700}.progress-line span:last-child{color:var(--muted);font-size:.74rem}.progress-track{height:6px;border-radius:99px;background:#d9e2d8;margin-top:11px;overflow:hidden}.progress-fill{height:100%;background:#56816f;border-radius:inherit;transition:width .25s}.card{border:1px solid var(--line);background:var(--cream);border-radius:20px;padding:22px;box-shadow:0 12px 35px rgba(29,57,47,.045)}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px}.field{display:block}.field-wide{grid-column:1/-1}.field>span,.field-label{display:block;font-size:.78rem;font-weight:750;margin-bottom:7px}.field input{width:100%;height:46px;border:1px solid #ccd8cf;border-radius:11px;background:#fff;padding:0 12px;color:var(--green);outline:none}.field input:focus{border-color:#55816f;box-shadow:0 0 0 3px rgba(85,129,111,.12)}.role-label{font-size:.78rem;font-weight:750;margin:20px 0 9px}.role-options{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.role-option{min-height:110px;text-align:left;padding:12px;border:1px solid var(--line);border-radius:13px;background:#fff;color:var(--green);transition:.15s}.role-option:hover:not(:disabled){transform:translateY(-2px);border-color:#8fa99a}.role-option.selected{border:2px solid #376d5b;background:#f0f6f1;padding:11px}.role-option .symbol{font-size:1.05rem;color:#729280}.role-option strong,.role-option small{display:block}.role-option strong{font-size:.78rem;margin:8px 0 4px}.role-option small{font-size:.68rem;color:var(--muted);line-height:1.35}.role-option .slot-state{font-size:.63rem;color:#789083;margin-top:7px;font-weight:700}.product-field{margin-top:16px}.join-actions{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:18px}.primary,.secondary{border:0;border-radius:12px;padding:12px 16px;font-weight:750}.primary{background:var(--green);color:white}.primary:hover:not(:disabled){background:#235348}.secondary{background:#edf2ed;color:var(--green)}.fine-print{font-size:.7rem;color:var(--muted);line-height:1.5;max-width:420px}.notice{border:1px solid #e3e8dd;background:#f0f2e9;border-radius:14px;padding:13px 15px;color:#586a62;font-size:.73rem;line-height:1.5;margin-top:16px}.notice strong{color:var(--green)}.status-box{display:flex;align-items:flex-start;gap:12px;background:#edf4ef;border:1px solid #d5e4d8;border-radius:16px;padding:16px;margin-top:16px}.status-icon{width:31px;height:31px;display:grid;place-items:center;border-radius:10px;background:#dbeadf;font-weight:800}.status-box h2{font-size:.95rem;margin:0 0 4px}.status-box p{margin:0;color:var(--muted);font-size:.78rem;line-height:1.45}.member-slots{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:16px}.slot{border:1px solid var(--line);background:#fff;border-radius:12px;padding:12px}.slot small,.slot strong{display:block}.slot small{font-size:.63rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:800}.slot strong{font-size:.78rem;margin-top:6px}.slot.waiting strong{color:#87938b;font-weight:600}.matched-head{display:flex;align-items:flex-start;gap:13px;margin-bottom:18px}.matched-check{width:38px;height:38px;display:grid;place-items:center;flex:none;border-radius:13px;background:#dff0e2;color:#296648;font-weight:900}.matched-head h2{font-family:Georgia,serif;font-size:1.8rem;line-height:1.05;margin:0 0 6px}.matched-head p{color:var(--muted);margin:0;font-size:.82rem}.matched-product{background:#f4f2e8;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:.78rem}.matched-product strong{display:block;font-size:.62rem;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:4px}.member-list{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:21px}.member{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fff}.member small{font-size:.64rem;color:#668175;font-weight:800;text-transform:uppercase}.member strong{display:block;font-size:.84rem;margin-top:6px}.task-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:10px}.task-heading h3{font-size:1rem;margin:0}.task-heading span{font-size:.67rem;color:var(--muted)}.task-list{display:grid;gap:9px}.task{border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px}.task-top{display:flex;gap:10px;align-items:flex-start}.task-check{width:22px;height:22px;flex:none;display:grid;place-items:center;border:1.5px solid #b7c9bd;border-radius:7px;color:#628371;font-size:.7rem}.task h4{margin:1px 0 5px;font-size:.82rem}.task-owner{font-size:.67rem;color:#668175;font-weight:750}.task ol{padding-left:32px;margin:10px 0 0;color:var(--muted);font-size:.72rem;line-height:1.65}.result-actions{display:flex;justify-content:flex-end;margin-top:16px}.error{display:none;padding:11px 13px;background:#fff0eb;color:#9c4a30;border-radius:11px;font-size:.77rem;margin-top:13px}.loading{padding:24px 0;color:var(--muted);font-size:.85rem}.footer-note{text-align:center;color:#849189;font-size:.67rem;margin-top:24px}.spinner{width:14px;height:14px;border:2px solid #c8d7cb;border-top-color:#3c745e;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle;margin-right:7px}@keyframes spin{to{transform:rotate(360deg)}}[hidden]{display:none!important}
    @media(max-width:620px){.container{padding:16px 16px 48px}.topbar{height:60px;padding:0 16px}.hero{padding-top:24px}.hero h1{font-size:2.6rem}.card{padding:17px;border-radius:17px}.role-options,.member-list,.member-slots{grid-template-columns:1fr}.role-option{min-height:0;display:grid;grid-template-columns:24px 1fr;column-gap:8px;align-items:center;padding:11px}.role-option.selected{padding:10px}.role-option .symbol{grid-row:span 2}.role-option strong{margin:0 0 3px}.role-option small{grid-column:2}.role-option .slot-state{grid-column:2;margin-top:5px}.form-grid{grid-template-columns:1fr}.field-wide{grid-column:auto}.join-actions{align-items:flex-start;flex-direction:column}.join-actions .primary{width:100%}.member-slots{gap:7px}.slot{display:flex;align-items:center;justify-content:space-between}.slot strong{margin:0}.top-tag{font-size:.59rem;padding:7px 8px}.matched-head h2{font-size:1.55rem}}
    __BOOKS_CSS__
  </style>
  <style>
    .app-tabs{display:flex;gap:8px;padding:5px;margin:0 0 18px;border:1px solid var(--line);border-radius:14px;background:#edf1e9}
    .app-tab{flex:1;border:0;border-radius:10px;padding:11px 14px;background:transparent;color:var(--muted);font-size:.82rem;font-weight:750}
    .app-tab[aria-selected="true"]{background:#fffefa;color:var(--green);box-shadow:0 2px 8px rgba(29,57,47,.08)}
    .agent-hero{padding-top:16px}
    .agent-backend-card{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 14px;padding:15px 18px;border:1px solid var(--line);border-radius:16px;background:#fffefa}
    .agent-backend-card strong,.agent-backend-card p{display:block;margin:4px 0 0}
    .agent-backend-card p{color:var(--muted);font-size:.74rem;line-height:1.45}
    .agent-backend-card code{font-size:.68rem;overflow-wrap:anywhere;color:#668175}
    .backend-status{display:inline-flex;align-items:center;gap:7px;font-size:.8rem;font-weight:800}
    .backend-status::before{content:"";width:9px;height:9px;border-radius:50%;background:#a7b1aa}
    .backend-status.online::before{background:#4b9a67}
    .backend-status.offline::before{background:#c35c45}
    .agent-demo-note{margin:0 0 16px;padding:13px 15px;border:1px solid #e3e8dd;border-radius:14px;background:#f0f2e9;color:#586a62;font-size:.75rem;line-height:1.55}
    .agent-form textarea{width:100%;resize:vertical;border:1px solid #ccd8cf;border-radius:11px;background:#fff;padding:11px 12px;color:var(--green);font:inherit;outline:none}
    .agent-form textarea:focus,.agent-form input:focus{border-color:#55816f;box-shadow:0 0 0 3px rgba(85,129,111,.12)}
    .agent-form .field input{margin:0}
    .agent-submit-copy{font-size:.72rem;color:var(--muted);line-height:1.45;max-width:380px}
    .agent-run-panel{display:grid;gap:16px;margin-top:18px}
    .agent-run-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}
    .agent-run-heading h2,.agent-section-heading h3{margin:0;font-family:Georgia,serif}
    .agent-run-heading h2{font-size:1.55rem}
    .agent-section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:0 0 10px}
    .agent-section-heading span,.agent-meta-label{font-size:.68rem;color:var(--muted)}
    .agent-meta{display:grid;grid-template-columns:1fr 2fr;gap:8px 14px;margin:0}
    .agent-meta dt{font-size:.7rem;font-weight:800;color:#668175}
    .agent-meta dd{margin:0;min-width:0;font-size:.76rem;line-height:1.5;overflow-wrap:anywhere}
    .agent-results{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .agent-progress-events{display:grid;gap:9px;padding:0;margin:12px 0 0;list-style:none}
    .agent-progress-events li:not(.agent-empty){display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:8px;border-top:1px solid var(--line);padding-top:9px;color:#42574d;font-size:.74rem;line-height:1.45}
    .agent-progress-events li strong{font-size:.66rem;color:#668175}
    .agent-progress-events li time{color:var(--muted);font-size:.65rem;white-space:nowrap}
    .agent-result{min-width:0;border:1px solid var(--line);border-radius:14px;background:#fffefa;padding:14px}
    .agent-result h4{margin:0;font-size:.84rem;overflow-wrap:anywhere}
    .agent-result-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}
    .agent-status-pill{flex:none;max-width:58%;padding:5px 8px;border-radius:999px;background:#edf1e9;color:#586a62;font-size:.63rem;font-weight:800;overflow-wrap:anywhere}
    .agent-fields{display:grid;gap:9px;margin:0}
    .agent-fields>div{min-width:0}
    .agent-fields dt{margin-bottom:3px;color:#668175;font-size:.64rem;font-weight:800;overflow-wrap:anywhere}
    .agent-fields dd{margin:0;color:#42574d;font-size:.74rem;line-height:1.5;overflow-wrap:anywhere;white-space:pre-wrap}
    .agent-nested{padding-left:10px;border-left:2px solid #e4ebe4}
    .agent-empty{margin:0;color:var(--muted);font-size:.74rem;line-height:1.5}
    .agent-refresh-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px}
    .agent-decision-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
    .agent-decision-result{margin-top:12px;padding:12px 14px;border-radius:12px;background:#edf4ef;color:#42574d;font-size:.75rem;line-height:1.5;overflow-wrap:anywhere}
    .agent-decision-result.error-result{background:#fff0eb;color:#9c4a30}
    .agent-cors-hint{margin-top:8px;font-size:.69rem;line-height:1.45}
    .agent-retry{margin-top:9px}
    .workbuddy-lookup{margin-top:18px}
    .workbuddy-lookup-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end}
    .workbuddy-lookup-form .field{min-width:0}
    .workbuddy-results-panel{display:grid;gap:13px;margin-top:16px}
    .workbuddy-artifacts{display:grid;gap:9px}
    .workbuddy-artifact{border:1px solid var(--line);border-radius:12px;background:#fffefa;padding:13px}
    .workbuddy-artifact h4{margin:0 0 8px;font-size:.8rem;overflow-wrap:anywhere}
    .workbuddy-lookup-status{font-size:.72rem;color:var(--muted);margin:9px 0 0;min-height:1em}
    .matching-form{display:grid;gap:16px}
    .matching-form textarea,.matching-form select{width:100%;border:1px solid #ccd8cf;border-radius:11px;background:#fff;padding:11px 12px;color:var(--green);font:inherit;outline:none}
    .matching-form textarea:focus,.matching-form select:focus{border-color:#55816f;box-shadow:0 0 0 3px rgba(85,129,111,.12)}
    .matching-note{margin:0 0 16px;padding:13px 15px;border:1px solid #e3e8dd;border-radius:14px;background:#f0f2e9;color:#586a62;font-size:.75rem;line-height:1.55}
    .matching-counts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .matching-count{padding:6px 9px;border-radius:99px;background:#edf1e9;color:#586a62;font-size:.66rem;font-weight:800}
    .matching-team{display:grid;gap:15px;margin-top:16px}
    .matching-team-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .matching-team-head h2{margin:0 0 4px;font-family:Georgia,serif;font-size:1.5rem}
    .matching-team-head p{margin:0;color:var(--muted);font-size:.75rem;line-height:1.45}
    .matching-score{flex:none;padding:7px 10px;border-radius:999px;background:#e2f0e5;color:#286245;font-size:.75rem;font-weight:850}
    .matching-breakdown{display:flex;gap:7px;flex-wrap:wrap}
    .matching-person{border:1px solid var(--line);border-radius:13px;background:#fff;padding:12px;min-width:0}
    .matching-person strong,.matching-person small{display:block;overflow-wrap:anywhere}
    .matching-person strong{font-size:.82rem;margin:5px 0}
    .matching-person small{font-size:.66rem;color:var(--muted);line-height:1.5}
    .matching-person .person-status{color:#547762;font-weight:800}
    .matching-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
    .matching-task{display:flex;gap:11px;align-items:flex-start;border:1px solid var(--line);border-radius:13px;background:#fff;padding:13px}
    .matching-task input{margin:3px 0 0;accent-color:#376d5b;width:18px;height:18px;flex:none}
    .matching-task strong{display:block;font-size:.8rem;margin-bottom:4px}
    .matching-task p{margin:0;color:var(--muted);font-size:.72rem;line-height:1.5;white-space:pre-wrap}
    .task-plan-note{margin-bottom:12px}.task-save-status{min-height:24px;color:#547762;font-size:.75rem;margin:6px 0}
    #matching-task-bar{display:block;width:100%;height:9px;accent-color:#56816f;border:0;border-radius:99px;overflow:hidden}
    #matching-task-bar::-webkit-progress-bar{background:#e2e9e1}#matching-task-bar::-webkit-progress-value{background:#56816f}#matching-task-bar::-moz-progress-bar{background:#56816f}
    .matching-phase{border:1px solid var(--line);border-radius:14px;background:#fff;overflow:hidden}
    .matching-phase summary{display:flex;gap:11px;align-items:center;padding:15px;cursor:pointer;list-style:none;min-height:60px}
    .matching-phase summary::-webkit-details-marker{display:none}.matching-phase summary::after{content:"+";margin-left:auto;font-weight:800;font-size:1.15rem;color:#668175}
    .matching-phase[open] summary::after{content:"−"}.matching-phase summary:focus-visible{outline:3px solid #729d88;outline-offset:-3px}
    .phase-number{display:grid;place-items:center;flex:none;width:29px;height:29px;background:#edf2ed;border-radius:9px;font-size:.75rem;font-weight:800}
    .phase-label{min-width:0;flex:1}.phase-label strong{display:block;font-size:.85rem}.phase-label small{display:block;color:var(--muted);font-size:.69rem;margin-top:4px}
    .phase-complete{color:#296648;background:#dff0e2}.phase-description{padding:0 15px 12px;margin:0;color:var(--muted);font-size:.76rem;line-height:1.5;overflow-wrap:anywhere}
    .phase-steps{display:grid;gap:8px;padding:0 10px 10px}.phase-steps .matching-task{background:#fafbf7;border-radius:11px;padding:12px;min-height:46px}
    .phase-steps .matching-task strong{font-size:.83rem;line-height:1.45}.phase-steps .matching-task p{font-size:.78rem;line-height:1.6;margin:5px 0;overflow-wrap:anywhere}
    .phase-steps .matching-task input{width:21px;height:21px;margin-top:2px}.phase-steps .matching-task input:focus-visible{outline:3px solid #729d88;outline-offset:3px}
    .matching-task.is-complete{background:#f0f6f0}.matching-task.is-complete strong{color:#547762}.step-output{border-left:2px solid #d5e4d8;padding-left:9px}.step-output b{font-weight:750;color:#547762}
    #matching-task-retry{margin-top:10px}
    .matching-empty{margin:0;color:var(--muted);font-size:.77rem;line-height:1.5}
    .matching-group{display:grid;gap:9px;padding-top:2px}
    .matching-chat-messages{display:grid;gap:8px;max-height:320px;overflow:auto;padding:12px;border:1px solid var(--line);border-radius:14px;background:#f5f7f2;overscroll-behavior:contain}
    .matching-chat-message{max-width:88%;padding:9px 11px;border:1px solid var(--line);border-radius:13px 13px 13px 4px;background:#fff;overflow-wrap:anywhere}
    .matching-chat-message.mine{justify-self:end;border-color:#d5e4d8;border-radius:13px 13px 4px 13px;background:#eaf3eb}
    .matching-chat-meta{display:flex;justify-content:space-between;gap:14px;align-items:center;font-size:.66rem;color:var(--muted)}
    .matching-chat-meta strong{color:var(--green);font-size:.7rem}
    .matching-chat-message p{margin:5px 0 0;font-size:.76rem;line-height:1.45;white-space:pre-wrap;word-break:break-word}
    .matching-chat-form{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}
    .matching-chat-form textarea{width:100%;min-height:48px;resize:vertical;border:1px solid #ccd8cf;border-radius:11px;background:#fff;padding:10px 12px;color:var(--green);font:inherit;outline:none}
    .matching-chat-form textarea:focus{border-color:#55816f;box-shadow:0 0 0 3px rgba(85,129,111,.12)}
    @media(max-width:620px){.matching-team-head{flex-direction:column}.matching-actions{flex-direction:column}.matching-actions button{width:100%}.matching-chat-form{grid-template-columns:1fr}.matching-chat-form button{width:100%}.matching-chat-message{max-width:96%}}
    @media(max-width:620px){.app-tab{padding:10px 8px;font-size:.72rem}.agent-backend-card{align-items:flex-start;flex-direction:column}.agent-backend-card .secondary{width:100%}.agent-results{grid-template-columns:1fr}.agent-meta{grid-template-columns:1fr;gap:4px}.agent-meta dd{margin-bottom:8px}.agent-refresh-row{align-items:flex-start;flex-direction:column}.agent-refresh-row .secondary{width:100%}.agent-decision-actions{flex-direction:column}.agent-decision-actions button{width:100%}.agent-run-heading h2{font-size:1.35rem}.workbuddy-lookup-form{grid-template-columns:1fr}.workbuddy-lookup-form button{width:100%}}
  </style>
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#302d29;background:#f4f1eb;font-synthesis:none;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;--green:#302d29;--muted:#777168;--line:#ddd6cd;--peach:#bc3e2b;--cream:#fffdf8;--soft:#f5e5df;--ink:#302d29;--brand:#bc3e2b;--brand-dark:#a23222;--brand-soft:#f5e5df;--nav-bg:#ebe5dc;--page:#f4f1eb;--paper:#fffdf8}
    body{background:var(--page);color:var(--ink)}.workspace-shell{min-height:100vh;display:grid;grid-template-columns:248px minmax(0,1fr)}.workspace-sidebar{position:sticky;top:0;height:100vh;overflow:auto;padding:23px 15px;background:var(--nav-bg);border-right:1px solid var(--line)}
    .workspace-brand{display:flex;align-items:center;gap:10px;padding:0 10px 25px;color:var(--ink);text-decoration:none}.workspace-brand-mark{width:30px;height:30px;display:grid;place-items:center;background:var(--brand);color:#fff;font-family:Georgia,serif;font-weight:800;font-size:1rem}.workspace-brand strong{font-size:.91rem;letter-spacing:.015em}.workspace-brand small{display:block;margin-top:2px;color:var(--muted);font-size:.59rem;font-weight:750;letter-spacing:.11em}
    .workspace-nav{display:grid;gap:19px}.workspace-nav-group{display:grid;gap:3px}.workspace-nav-group-label{padding:0 11px 6px;color:#8b8379;font-size:.59rem;font-weight:850;letter-spacing:.13em}.workspace-nav-link{width:100%;display:flex;align-items:center;gap:10px;border:0;border-radius:3px;padding:10px 11px;background:transparent;color:#5c5851;text-align:left;font-size:.78rem;font-weight:650;line-height:1.25}.workspace-nav-link:hover{background:rgba(255,253,248,.65);color:var(--ink)}.workspace-nav-link.active,.workspace-nav-link[aria-selected="true"]{background:var(--paper);color:var(--brand);font-weight:800}.workspace-nav-icon{width:16px;flex:none;text-align:center;color:#91887e;font-size:.9rem}.workspace-nav-link.active .workspace-nav-icon{color:var(--brand)}
    .workspace-main{min-width:0}.workspace-topbar{height:58px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 clamp(20px,4vw,58px);border-bottom:1px solid var(--line);background:rgba(255,253,248,.64)}.workspace-crumb{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:.71rem}.workspace-crumb strong{color:var(--ink);font-weight:750}.workspace-identity{max-width:42vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:.7rem}.container{width:100%;max-width:1220px;margin:0 auto;padding:31px clamp(20px,4vw,58px) 64px}.topbar{display:none}.hero{padding:12px 0 22px}.hero .eyebrow{color:var(--brand);font-size:.61rem;letter-spacing:.15em}.hero h1{max-width:790px;margin:10px 0 12px;color:var(--ink);font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;font-size:clamp(2.45rem,5vw,4.35rem);font-stretch:condensed;font-weight:850;line-height:.93;letter-spacing:-.035em}.hero p{max-width:660px;color:#706a62;font-size:.89rem}
    .card,.agent-backend-card,.agent-result,.workbuddy-artifact,.books-stat,.books-member-card,.matching-person,.matching-phase,.matching-task,.task,.slot,.member,.status-box{border-color:var(--line);border-radius:4px;box-shadow:none;background:var(--paper)}.status-box,.matching-note,.agent-demo-note,.notice{border-radius:4px;background:#f1ece4;border-color:var(--line);color:#635d55}.status-icon{border-radius:3px;background:#f5e5df;color:var(--brand)}.primary{border-radius:3px;background:var(--brand);color:#fff}.primary:hover:not(:disabled){background:var(--brand-dark)}.secondary{border-radius:3px;background:#ebe5dc;color:var(--ink)}
    .app-tabs{display:contents}.app-tab{flex:initial;min-width:0;margin:0;padding:0;border-radius:0;background:transparent;color:inherit;font-size:inherit;font-weight:inherit}.app-tab[aria-selected="true"]{background:transparent;color:inherit;box-shadow:none}
    .role-picker{min-width:0;border:0;padding:0;margin:0}.role-picker legend{display:block;margin-bottom:8px;font-size:.78rem;font-weight:750}.role-choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.role-choice{position:relative;display:flex;min-height:112px;flex-direction:column;align-items:flex-start;justify-content:space-between;border:1px solid var(--line);border-radius:3px;padding:13px;background:var(--paper);cursor:pointer;transition:border-color .15s,background .15s}.role-choice:hover{border-color:#bc8c7f}.role-choice input{position:absolute;top:11px;right:11px;width:18px;height:18px;margin:0;accent-color:var(--brand)}.role-choice:has(input:checked){border:2px solid var(--brand);padding:12px;background:#fbf0eb}.role-choice:focus-within{outline:2px solid var(--brand);outline-offset:2px}.role-choice .role-step{color:var(--brand);font-size:.59rem;font-weight:850;letter-spacing:.11em}.role-choice strong{margin-top:18px;color:var(--ink);font-size:.8rem}.role-choice small{max-width:95%;margin-top:4px;color:var(--muted);font-size:.67rem;line-height:1.4}
    .overview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:8px 0 20px}.overview-card{min-width:0;border:1px solid var(--line);padding:16px;background:var(--paper)}.overview-card-label{color:var(--muted);font-size:.61rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.overview-card strong{display:block;margin-top:9px;color:var(--ink);font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;font-size:1.55rem;line-height:1.05}.overview-card p{margin:8px 0 0;color:var(--muted);font-size:.71rem;line-height:1.45;overflow-wrap:anywhere}.overview-section{border:1px solid var(--line);padding:17px;background:var(--paper)}.overview-section h2{margin:0 0 12px;font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;font-size:1.3rem}.overview-members{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.overview-member{min-width:0;border:1px solid var(--line);padding:11px}.overview-member small,.overview-member strong{display:block;overflow-wrap:anywhere}.overview-member small{color:var(--brand);font-size:.58rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.overview-member strong{margin-top:6px;font-size:.76rem}.overview-empty{color:var(--muted);font-size:.75rem;line-height:1.5}.overview-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}.overview-actions button{font-size:.7rem}
    .agent-run-heading h2,.agent-section-heading h3,.matching-team-head h2,.matched-head h2{color:var(--ink);font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;letter-spacing:-.015em}.books-scope-display,.field input,.matching-form textarea,.matching-form select,.agent-form textarea,.matching-chat-form textarea{border-radius:3px}.footer-note{color:#8a837a}
    @media(max-width:760px){.workspace-shell{display:block}.workspace-sidebar{position:sticky;z-index:20;top:0;width:100%;height:auto;overflow:visible;padding:11px 12px 8px;border-right:0;border-bottom:1px solid var(--line)}.workspace-brand{padding:0 5px 9px}.workspace-brand-mark{width:26px;height:26px}.workspace-brand strong{font-size:.8rem}.workspace-brand small{font-size:.52rem}.workspace-nav{display:flex;gap:5px;overflow-x:auto;padding:0 0 3px;scrollbar-width:thin}.workspace-nav-group{display:contents}.workspace-nav-group-label{display:none}.workspace-nav-link{width:auto;flex:none;min-height:34px;padding:8px 9px;white-space:nowrap;font-size:.67rem}.workspace-nav-icon{width:auto}.workspace-topbar{height:46px;padding:0 17px}.workspace-identity{max-width:45vw}.container{padding:22px 17px 48px}.hero h1{font-size:clamp(2.4rem,11vw,3.5rem)}.overview-grid,.overview-members,.role-choice-grid{grid-template-columns:1fr}.role-choice{min-height:75px;padding:11px 38px 11px 12px}.role-choice:has(input:checked){padding:10px 37px 10px 11px}.role-choice strong{margin-top:8px}.role-choice small{max-width:100%}}
    @media(min-width:761px) and (max-width:980px){.workspace-shell{grid-template-columns:205px minmax(0,1fr)}.workspace-sidebar{padding:19px 10px}.container{padding-left:26px;padding-right:26px}.overview-grid,.role-choice-grid{grid-template-columns:1fr}}
    @media(max-width:620px){.agent-backend-card{align-items:flex-start}.agent-results{grid-template-columns:1fr}.agent-meta{grid-template-columns:1fr;gap:4px}.agent-meta dd{margin-bottom:8px}.agent-refresh-row{align-items:flex-start;flex-direction:column}.agent-refresh-row .secondary{width:100%}.agent-decision-actions{flex-direction:column}.agent-decision-actions button{width:100%}.agent-run-heading h2{font-size:1.35rem}.workbuddy-lookup-form{grid-template-columns:1fr}.workbuddy-lookup-form button{width:100%}}
  </style>
  <style>
    @media(max-width:760px){.workspace-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;overflow:visible;padding:0}.workspace-nav-link{width:100%;min-width:0;min-height:38px;flex:none;justify-content:center;gap:4px;padding:7px 3px;white-space:normal;text-align:center;font-size:.62rem}.workspace-nav-icon{font-size:.78rem}}
  </style>
  <style id="constellation-theme">
    body.constellation-theme{--role-product:#b73927;--role-marketing:#17675d;--role-sales:#3455b4;--page:#f8f4ef;--paper:#fffaf5;--ink:#302d29;--muted:#706861;--line:#e8ded4;--brand:#b73927;--brand-dark:#912a1b;--brand-soft:#f6e2d9;--nav-bg:#f1ebe4;min-width:0;overflow-x:clip;background:var(--page);color:var(--ink);font-size:14px}
    body.constellation-theme .workspace-shell{grid-template-columns:232px minmax(0,1fr);background:var(--page)}
    body.constellation-theme .workspace-sidebar{padding:26px 14px 18px;background:rgba(241,235,228,.92);border-right:1px solid #e5dbd1}
    body.constellation-theme .workspace-brand{gap:9px;padding:0 9px 28px}
    body.constellation-theme .workspace-brand-mark{width:34px;height:34px;border-radius:48% 38% 49% 35%;background:var(--ink);transform:rotate(-8deg)}
    body.constellation-theme .workspace-brand strong{font-size:1.1rem;font-weight:650;letter-spacing:-.035em}
    body.constellation-theme .workspace-brand small{font-size:.55rem;font-weight:500;letter-spacing:.09em;color:#81766d}
    body.constellation-theme .workspace-nav{gap:18px}
    body.constellation-theme .workspace-nav-group{gap:4px}
    body.constellation-theme .workspace-nav-group-label{padding:0 11px 7px;color:#8a7d73;font-size:.57rem;font-weight:650;letter-spacing:.11em}
    body.constellation-theme .workspace-nav-link{min-height:41px;border-radius:999px;padding:9px 11px;color:#655d55;font-size:.74rem;font-weight:500;transition:background-color .18s,color .18s,transform .18s}
    body.constellation-theme .workspace-nav-link:hover{background:rgba(255,250,245,.8);color:var(--ink);transform:translateX(2px)}
    body.constellation-theme .workspace-nav-link.active,body.constellation-theme .workspace-nav-link[aria-selected="true"]{background:var(--paper);color:var(--brand-dark);font-weight:650}
    body.constellation-theme .workspace-nav-icon{width:21px;height:21px;display:grid;place-items:center;border-radius:50%;background:#eee6df;color:#86786d;font-size:.78rem}
    body.constellation-theme .workspace-nav-link.active .workspace-nav-icon{background:var(--brand-soft);color:var(--brand-dark)}
    body.constellation-theme .workspace-topbar{height:68px;border:0;background:transparent}
    body.constellation-theme .workspace-crumb{font-size:.69rem;color:#887d74}
    body.constellation-theme .workspace-crumb strong{font-weight:600;color:var(--ink)}
    body.constellation-theme .workspace-identity{font-size:.67rem;color:#887d74}
    body.constellation-theme .container{max-width:1530px;padding-top:24px;padding-bottom:42px}
    body.constellation-theme .hero{padding:12px 0 25px}
    body.constellation-theme .hero .eyebrow{color:var(--brand);font:500 .62rem/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.1em}
    body.constellation-theme .hero h1{max-width:820px;margin:10px 0 13px;font:600 clamp(2.7rem,5vw,4.25rem)/.99 "Arial Narrow","Roboto Condensed",Impact,sans-serif;letter-spacing:-.045em;text-transform:none;text-wrap:balance}
    body.constellation-theme .hero p{max-width:68ch;color:#716961;font-size:.9rem;line-height:1.75}
    body.constellation-theme :is(.card,.overview-section,.overview-card,.agent-backend-card,.agent-result,.workbuddy-artifact,.books-stat,.books-member-card,.matching-person,.matching-phase,.matching-task,.task,.slot,.member,.status-box){border:1px solid rgba(209,190,173,.58);border-radius:24px 16px 25px 17px;background:rgba(255,250,245,.94);box-shadow:none}
    body.constellation-theme .card{padding:22px}
    body.constellation-theme :is(.status-box,.matching-note,.agent-demo-note,.notice){border-radius:16px 10px 15px 10px;background:#f0e9e2;border-color:#e6dbd0;color:#665e56}
    body.constellation-theme .primary,body.constellation-theme .secondary{min-height:42px;border-radius:999px;padding-inline:16px;font-size:.76rem;font-weight:650}
    body.constellation-theme .primary{background:var(--brand);color:#fffaf5}
    body.constellation-theme .primary:hover:not(:disabled){background:var(--brand-dark)}
    body.constellation-theme .secondary{border:1px solid #e5dbd2;background:#f2ece6;color:#514b45}
    body.constellation-theme .role-choice-grid{gap:11px}
    body.constellation-theme .role-choice{--choice-color:var(--role-product);--choice-wash:#f2dfd7;min-height:130px;justify-content:flex-end;overflow:hidden;border:1px solid #e6d8ce;border-radius:24px 15px 24px 17px;padding:15px;background:var(--paper);transition:border-color .18s,background .18s,transform .18s}
    body.constellation-theme .role-choice:nth-child(2){--choice-color:var(--role-marketing);--choice-wash:#e1ece4;border-radius:16px 27px 17px 25px}
    body.constellation-theme .role-choice:nth-child(3){--choice-color:var(--role-sales);--choice-wash:#e4e8f4;border-radius:28px 18px 26px 15px}
    body.constellation-theme .role-choice::before{content:"";position:absolute;z-index:0;top:16px;right:20px;width:48px;height:48px;border:1px solid rgba(183,57,39,.28);border-radius:43% 57% 53% 47%;background:var(--choice-wash);transform:rotate(-12deg)}
    body.constellation-theme .role-choice:nth-child(2)::before{border-color:rgba(23,103,93,.28);border-radius:53% 47% 34% 66%;transform:rotate(12deg)}
    body.constellation-theme .role-choice:nth-child(3)::before{border-color:rgba(52,85,180,.28);border-radius:39% 61% 61% 39%;transform:rotate(21deg)}
    body.constellation-theme .role-choice>*{position:relative;z-index:1}
    body.constellation-theme .role-choice .role-step{color:var(--choice-color);font:500 .58rem/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.08em}
    body.constellation-theme .role-choice strong{margin-top:15px;font-size:.84rem;font-weight:650}
    body.constellation-theme .role-choice small{font-size:.69rem;line-height:1.5}
    body.constellation-theme .role-choice input{accent-color:var(--choice-color)}
    body.constellation-theme .role-choice:has(input:checked){border:2px solid var(--choice-color);padding:14px;background:var(--choice-wash)}
    body.constellation-theme .role-choice:focus-within{outline:2px solid var(--choice-color);outline-offset:3px}
    body.constellation-theme .overview-card{padding:18px 17px;border-radius:24px 14px 22px 15px}
    body.constellation-theme .overview-card-label,.workspace-nav-group-label{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
    body.constellation-theme .overview-card strong{font-size:1.75rem;font-weight:600}
    body.constellation-theme .overview-section{padding:20px;border-radius:26px 16px 25px 17px}
    body.constellation-theme .overview-section h2,body.constellation-theme .task-heading h3,body.constellation-theme .matching-team-head h2,body.constellation-theme .agent-run-heading h2{font-family:"Arial Narrow","Roboto Condensed",Impact,sans-serif;letter-spacing:-.015em}
    body.constellation-theme .matching-count{border-radius:999px;background:#eee8e1;color:#655b52}
    body.constellation-theme .matching-score{border-radius:999px;background:#e3eee6;color:#376a54}
    body.constellation-theme .constellation-panel{position:relative;container-type:inline-size;margin:22px 0 16px;padding:22px 24px 18px;border:1px solid rgba(209,190,173,.58);border-radius:30px 18px 29px 19px;background:radial-gradient(ellipse at 14% 18%,rgba(243,204,180,.19),transparent 36%),radial-gradient(ellipse at 87% 80%,rgba(183,205,190,.19),transparent 33%),rgba(255,250,245,.78);overflow:hidden}
    body.constellation-theme .constellation-panel::before{content:"";position:absolute;top:-122px;left:41%;width:300px;height:240px;border:1px solid rgba(179,156,136,.17);border-radius:47% 53% 44% 56%;transform:rotate(-21deg);pointer-events:none}
    body.constellation-theme .constellation-panel::after{content:"";position:absolute;right:14%;bottom:5%;width:12px;height:12px;border-radius:50%;background:rgba(90,151,133,.18);box-shadow:0 0 0 11px rgba(90,151,133,.045),0 0 36px 10px rgba(90,151,133,.12);pointer-events:none}
    body.constellation-theme .constellation-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:10px}
    body.constellation-theme .visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    body.constellation-theme .constellation-heading .eyebrow{color:#87796d;font:500 .6rem/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.12em}
    body.constellation-theme .constellation-heading p{max-width:48ch;margin:0;color:#7b7168;font-size:.7rem;line-height:1.5;text-align:right}
    body.constellation-theme .constellation-map{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,.85fr) minmax(0,1fr);grid-template-rows:minmax(170px,1fr) minmax(170px,1fr);gap:8px;min-height:405px;isolation:isolate}
    body.constellation-theme .constellation-lines{position:absolute;inset:0;width:100%;height:100%;z-index:-1;overflow:visible;pointer-events:none}
    body.constellation-theme .constellation-lines path{fill:none;stroke-width:1.6;stroke-linecap:round;opacity:.78;transition:stroke-width .25s,opacity .25s}
    body.constellation-theme .constellation-lines .constellation-orbit-trace{stroke:#9b8c7e;stroke-width:1;stroke-dasharray:2 9;opacity:.48;animation:constellation-orbit 42s linear infinite}
    body.constellation-theme .constellation-line-product{stroke:var(--role-product)}
    body.constellation-theme .constellation-line-marketing{stroke:var(--role-marketing)}
    body.constellation-theme .constellation-line-sales{stroke:var(--role-sales)}
    body.constellation-theme .constellation-idea{grid-column:2;grid-row:1 / span 2;align-self:center;justify-self:center;z-index:1;display:flex;width:min(100%,260px);min-height:224px;flex-direction:column;align-items:center;justify-content:center;padding:23px 21px;border:1px solid #c8a990;border-radius:46% 44% 42% 39% / 39% 41% 46% 48%;background:#ead9c8;text-align:center;box-shadow:0 12px 34px rgba(96,67,44,.07)}
    body.constellation-theme .constellation-idea-mark{position:relative;width:42px;height:42px;margin-bottom:8px;border:1px solid #1b776e;border-radius:50%;color:#1b776e}
    body.constellation-theme .constellation-idea-mark::before,body.constellation-theme .constellation-idea-mark::after{content:"";position:absolute;inset:5px;border:1px solid currentColor;border-radius:50%;transform:rotate(58deg) scaleX(.56)}
    body.constellation-theme .constellation-idea-mark::after{transform:rotate(-58deg) scaleX(.56)}
    body.constellation-theme .constellation-idea-mark span{position:absolute;left:50%;top:50%;width:7px;height:7px;border-radius:50%;background:currentColor;transform:translate(-50%,-50%)}
    body.constellation-theme .constellation-idea .eyebrow{color:#78604e;font:500 .55rem/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.1em}
    body.constellation-theme .constellation-idea strong{max-width:22ch;margin:8px 0;color:#352f29;font:600 1.08rem/1.25 Georgia,serif;overflow-wrap:anywhere}
    body.constellation-theme .constellation-idea p{margin:0;color:#756252;font-size:.65rem;line-height:1.45}
    body.constellation-theme .constellation-map::after{content:"";position:absolute;left:48%;top:9%;width:13px;height:13px;border:1px solid rgba(88,143,128,.46);border-radius:50%;box-shadow:0 0 0 9px rgba(88,143,128,.035);pointer-events:none;animation:constellation-drift 7s ease-in-out infinite}
    body.constellation-theme .constellation-branch{display:grid;grid-template-columns:minmax(112px,.9fr) minmax(120px,1fr);align-items:center;gap:10px;min-width:0;z-index:1;transition:transform .28s cubic-bezier(.2,.75,.25,1),filter .28s}
    body.constellation-theme .constellation-branch[data-role="Product Creator"]{grid-column:1;grid-row:1;align-self:end;transform:translateY(8px) rotate(-1deg)}
    body.constellation-theme .constellation-branch[data-role="Marketing"]{grid-column:3;grid-row:1;align-self:end;transform:translateY(-7px) rotate(1.3deg)}
    body.constellation-theme .constellation-branch[data-role="Sales"]{grid-column:3;grid-row:2;align-self:start;transform:translateY(8px) rotate(-1.1deg)}
    body.constellation-theme .constellation-branch[data-role="Product Creator"]:hover,body.constellation-theme .constellation-branch[data-role="Product Creator"]:focus-within{transform:translate(2px,-4px) rotate(-.25deg);filter:drop-shadow(0 8px 12px rgba(141,83,65,.1))}
    body.constellation-theme .constellation-branch[data-role="Marketing"]:hover,body.constellation-theme .constellation-branch[data-role="Marketing"]:focus-within{transform:translate(-2px,-2px) rotate(.3deg);filter:drop-shadow(0 8px 12px rgba(58,117,104,.11))}
    body.constellation-theme .constellation-branch[data-role="Sales"]:hover,body.constellation-theme .constellation-branch[data-role="Sales"]:focus-within{transform:translate(-2px,-4px) rotate(-.3deg);filter:drop-shadow(0 8px 12px rgba(66,90,166,.11))}
    body.constellation-theme .constellation-orb{--orbit-color:var(--role-product);--orbit-wash:#f4e2da;position:relative;display:flex;min-height:130px;flex-direction:column;align-items:center;justify-content:center;padding:14px 10px;border:1px solid rgba(255,255,255,.42);border-radius:43% 49% 41% 46% / 40% 44% 47% 52%;background:radial-gradient(circle at var(--orb-x,50%) var(--orb-y,30%),rgba(255,255,255,.58),transparent 50%),var(--orbit-wash);color:var(--orbit-color);text-align:center;transition:border-radius .35s,transform .35s,box-shadow .35s;box-shadow:0 8px 25px rgba(90,69,52,.04)}
    body.constellation-theme .constellation-orb:hover{border-radius:51% 43% 48% 41% / 45% 52% 40% 48%;transform:scale(1.04);box-shadow:0 12px 32px color-mix(in srgb,var(--orbit-color) 14%,transparent)}
    body.constellation-theme .constellation-branch[data-role="Marketing"] .constellation-orb{--orbit-color:var(--role-marketing);--orbit-wash:#e5ece3;border-radius:47% 41% 46% 43% / 44% 40% 51% 48%}
    body.constellation-theme .constellation-branch[data-role="Sales"] .constellation-orb{--orbit-color:var(--role-sales);--orbit-wash:#e7e8f1;border-radius:42% 49% 44% 46% / 48% 45% 39% 51%}
    body.constellation-theme .constellation-symbol{position:relative;width:34px;height:34px;margin-bottom:6px;border:1px solid currentColor;border-radius:50%;opacity:.88}
    body.constellation-theme .constellation-symbol::before,body.constellation-theme .constellation-symbol::after{content:"";position:absolute;inset:4px;border:1px solid currentColor;border-radius:50%;transform:rotate(55deg) scaleX(.55)}
    body.constellation-theme .constellation-symbol::after{transform:rotate(-55deg) scaleX(.55)}
    body.constellation-theme .constellation-symbol span{position:absolute;left:50%;top:50%;width:6px;height:6px;border-radius:50%;background:currentColor;transform:translate(-50%,-50%)}
    body.constellation-theme .constellation-orb strong{font:600 .89rem/1.2 "Arial Narrow","Roboto Condensed",Impact,sans-serif}
    body.constellation-theme .constellation-orb small{margin-top:5px;color:#746b62;font-size:.57rem;line-height:1.4}
    body.constellation-theme .constellation-member{min-width:0;padding:12px 11px;border:1px solid rgba(209,190,173,.7);border-radius:20px 13px 19px 14px;background:radial-gradient(130px circle at var(--card-x,50%) var(--card-y,0%),rgba(255,255,255,.9),transparent 85%),rgba(255,251,247,.96);transition:transform .22s,border-radius .22s,border-color .22s}
    body.constellation-theme .constellation-member:hover{transform:translateY(-2px) rotate(.25deg);border-radius:16px 20px 13px 22px;border-color:#c4ab99}
    body.constellation-theme .constellation-member small,body.constellation-theme .constellation-member strong{display:block;overflow-wrap:anywhere}
    body.constellation-theme .constellation-member small{color:#887c71;font:500 .53rem/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.055em;text-transform:uppercase}
    body.constellation-theme .constellation-member strong{margin:5px 0 3px;color:#39332d;font-size:.75rem;font-weight:650;line-height:1.3}
    body.constellation-theme .constellation-member p{margin:0;color:#7d736a;font-size:.59rem;line-height:1.45}
    body.constellation-theme .constellation-branch[data-role="Product Creator"] .constellation-member{border-left:2px solid var(--role-product)}
    body.constellation-theme .constellation-branch[data-role="Marketing"] .constellation-member{border-left:2px solid var(--role-marketing)}
    body.constellation-theme .constellation-branch[data-role="Sales"] .constellation-member{border-left:2px solid var(--role-sales)}
    @container(max-width:760px){body.constellation-theme .constellation-panel{padding:19px 17px 16px}body.constellation-theme .constellation-heading{align-items:flex-start;flex-direction:column;gap:4px}body.constellation-theme .constellation-heading p{text-align:left}body.constellation-theme .constellation-map{grid-template-columns:1fr;grid-template-rows:auto;gap:9px;min-height:0;padding-left:16px}body.constellation-theme .constellation-lines{display:none}body.constellation-theme .constellation-map::before{content:"";position:absolute;left:5px;top:34px;bottom:34px;border-left:1px solid #cdb9a7}body.constellation-theme .constellation-idea{grid-column:1;grid-row:1;width:100%;min-height:132px;flex-direction:row;justify-content:flex-start;gap:13px;padding:16px;border-radius:20px 13px 19px 14px;text-align:left}body.constellation-theme .constellation-idea-mark{flex:none;margin:0}body.constellation-theme .constellation-idea strong{margin:5px 0;font-size:.95rem}body.constellation-theme .constellation-idea p{font-size:.62rem}body.constellation-theme .constellation-branch{grid-column:1!important;grid-row:auto!important;grid-template-columns:96px minmax(0,1fr);gap:10px;padding:2px 0}body.constellation-theme .constellation-orb{min-height:94px;padding:10px 8px}body.constellation-theme .constellation-symbol{width:28px;height:28px;margin-bottom:4px}body.constellation-theme .constellation-orb strong{font-size:.78rem}body.constellation-theme .constellation-member{padding:11px}}
    @container(max-width:410px){body.constellation-theme .constellation-panel{padding:16px 13px 13px}body.constellation-theme .constellation-branch{grid-template-columns:82px minmax(0,1fr);gap:7px}body.constellation-theme .constellation-orb{min-height:86px}body.constellation-theme .constellation-member strong{font-size:.7rem}}
    @container(max-width:760px){body.constellation-theme .constellation-map::after{left:auto;right:9%;top:13px}body.constellation-theme .constellation-branch{transform:none!important}}
    @keyframes constellation-orbit{to{stroke-dashoffset:-88}}
    @keyframes constellation-drift{0%,100%{transform:translate(0,0) scale(.9);opacity:.48}50%{transform:translate(13px,11px) scale(1.12);opacity:.9}}
    @media(prefers-reduced-motion:reduce){body.constellation-theme .constellation-lines .constellation-orbit-trace,body.constellation-theme .constellation-map::after{animation:none}}
    #cursor-glow{position:fixed;z-index:1000;inset:0;pointer-events:none;opacity:0;background:radial-gradient(260px circle at var(--pointer-x,-1000px) var(--pointer-y,-1000px),rgba(247,188,146,.16),rgba(153,198,183,.075) 39%,transparent 73%);mix-blend-mode:soft-light;transition:opacity .28s ease}
    #cursor-glow.is-visible{opacity:.92}
    @media(hover:none),(pointer:coarse){#cursor-glow{display:none}}
    @media(prefers-reduced-motion:reduce){#cursor-glow{transition:none}}
    body.constellation-theme .matching-person{padding:15px;border-radius:22px 14px 22px 15px}
    body.constellation-theme .matching-person[data-role="Product Creator"]{border-top:3px solid var(--role-product)}
    body.constellation-theme .matching-person[data-role="Marketing"]{border-top:3px solid var(--role-marketing)}
    body.constellation-theme .matching-person[data-role="Sales"]{border-top:3px solid var(--role-sales)}
    body.constellation-theme .matching-person .person-status{color:var(--role-marketing)}
    body.constellation-theme .matching-task,body.constellation-theme .matching-phase{border-radius:18px 12px 19px 13px}
    body.constellation-theme .matching-task.is-complete{background:#edf3ed}
    body.constellation-theme .matching-phase summary{min-height:62px}
    body.constellation-theme .matching-chat-messages{border-radius:20px 12px 20px 12px;background:#f2ece6}
    body.constellation-theme .matching-chat-message{border-radius:17px 12px 17px 5px;background:var(--paper)}
    body.constellation-theme .matching-chat-message.mine{border-radius:17px 17px 5px 17px;background:#f6e6df}
    body.constellation-theme :is(.agent-form textarea,.matching-form textarea,.matching-form select,.matching-chat-form textarea,.books-form select,.books-form textarea,.books-toolbar select,.books-scope-display,.field input,.workbuddy-lookup-form input){border-radius:14px;border-color:#e1d6cd;background:#fffdf9;color:var(--ink)}
    body.constellation-theme :is(.agent-form textarea,.matching-form textarea,.matching-form select,.matching-chat-form textarea,.books-form select,.books-form textarea,.books-toolbar select,.field input,.workbuddy-lookup-form input):focus{border-color:#bd8272;box-shadow:0 0 0 3px rgba(183,57,39,.1)}
    body.constellation-theme .agent-result{border-radius:20px 13px 20px 14px;padding:16px}
    body.constellation-theme .agent-status-pill{border-radius:999px;background:#e9eee8;color:#526658}
    body.constellation-theme .agent-decision-result,body.constellation-theme .books-success{border-radius:18px 11px 18px 12px;background:#e8f0e8}
    body.constellation-theme .books-upload{border:1px dashed #c8ad9d;border-radius:22px 13px 22px 14px;background:#f5eee8}
    body.constellation-theme .books-stat{padding:17px;border-radius:22px 13px 21px 14px}
    body.constellation-theme .books-stat strong{font:600 1.7rem/1.1 "Arial Narrow","Roboto Condensed",Impact,sans-serif}
    body.constellation-theme .books-member-card{border-radius:20px 13px 20px 14px}
    body.constellation-theme .books-owner{color:var(--role-marketing)}
    body.constellation-theme .footer-note{border-color:var(--line);color:#897e74;font:10px/1.8 ui-monospace,SFMono-Regular,Consolas,monospace}
    @media(max-width:980px){body.constellation-theme .workspace-shell{grid-template-columns:205px minmax(0,1fr)}body.constellation-theme .workspace-sidebar{padding-inline:10px}}
    @media(max-width:760px){body.constellation-theme .workspace-shell{display:block}body.constellation-theme .workspace-sidebar{padding:11px 12px 8px;border:0;border-bottom:1px solid var(--line);background:rgba(241,235,228,.97)}body.constellation-theme .workspace-brand{padding:0 5px 9px}body.constellation-theme .workspace-nav{gap:5px}body.constellation-theme .workspace-nav-link{min-height:38px;border-radius:999px;padding:7px 3px}body.constellation-theme .workspace-topbar{height:46px}body.constellation-theme .container{padding:22px 17px 48px}body.constellation-theme .hero h1{font-size:clamp(2.45rem,10vw,3.7rem)}body.constellation-theme .role-choice{min-height:92px;border-radius:18px 13px 18px 14px;padding:12px 38px 12px 14px}body.constellation-theme .role-choice:has(input:checked){padding:11px 37px 11px 13px}body.constellation-theme .role-choice strong{margin-top:7px}body.constellation-theme .role-choice::before{top:20px;right:34px;width:42px;height:42px}body.constellation-theme .card{padding:18px}}
    @media(max-width:620px){body.constellation-theme .agent-decision-actions,body.constellation-theme .matching-actions{gap:9px}body.constellation-theme .agent-decision-actions button,body.constellation-theme .matching-actions button{min-height:44px}body.constellation-theme .books-summary{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){body.constellation-theme *,body.constellation-theme *::before,body.constellation-theme *::after{scroll-behavior:auto;transition:none!important}}
  </style>
  <style id="constellation-interaction-refinement">
    body.constellation-theme .constellation-idea>div{width:100%;min-width:0}
    body.constellation-theme .constellation-idea .eyebrow,body.constellation-theme .constellation-idea strong,body.constellation-theme .constellation-idea p{display:block}
    body.constellation-theme .constellation-idea strong{margin:5px 0 4px}
    body.constellation-theme .constellation-idea{background:radial-gradient(ellipse at var(--idea-x,50%) var(--idea-y,35%),rgba(255,250,245,.78),transparent 48%),#ead9c8;box-shadow:0 16px 42px rgba(96,67,44,.1),inset 0 1px rgba(255,255,255,.48);transition:border-radius .42s cubic-bezier(.2,.75,.25,1),box-shadow .32s}
    body.constellation-theme .constellation-idea:hover{border-radius:42% 48% 39% 46% / 44% 38% 51% 46%;box-shadow:0 19px 48px rgba(96,67,44,.13),inset 0 1px rgba(255,255,255,.58)}
    body.constellation-theme .constellation-branch[data-role="Product Creator"]{--branch-color:var(--role-product)}
    body.constellation-theme .constellation-branch[data-role="Marketing"]{--branch-color:var(--role-marketing)}
    body.constellation-theme .constellation-branch[data-role="Sales"]{--branch-color:var(--role-sales)}
    body.constellation-theme .constellation-member{background:radial-gradient(150px circle at var(--card-x,50%) var(--card-y,0%),color-mix(in srgb,var(--branch-color) 12%,white),transparent 82%),rgba(255,251,247,.96);transition:transform .22s,border-radius .22s,border-color .22s,box-shadow .22s}
    body.constellation-theme .constellation-member:hover{box-shadow:0 10px 26px rgba(77,63,50,.08),0 0 24px color-mix(in srgb,var(--branch-color) 11%,transparent)}
    body.constellation-theme .constellation-map:has(.constellation-branch[data-role="Product Creator"]:hover,.constellation-branch[data-role="Product Creator"]:focus-within) .constellation-line-product,body.constellation-theme .constellation-map:has(.constellation-branch[data-role="Marketing"]:hover,.constellation-branch[data-role="Marketing"]:focus-within) .constellation-line-marketing,body.constellation-theme .constellation-map:has(.constellation-branch[data-role="Sales"]:hover,.constellation-branch[data-role="Sales"]:focus-within) .constellation-line-sales{stroke-width:3;opacity:1}
    body.constellation-theme .constellation-map:has(.constellation-branch[data-role="Product Creator"]:hover,.constellation-branch[data-role="Product Creator"]:focus-within) .constellation-line-product{filter:drop-shadow(0 0 4px rgba(183,57,39,.42))}
    body.constellation-theme .constellation-map:has(.constellation-branch[data-role="Marketing"]:hover,.constellation-branch[data-role="Marketing"]:focus-within) .constellation-line-marketing{filter:drop-shadow(0 0 4px rgba(23,103,93,.42))}
    body.constellation-theme .constellation-map:has(.constellation-branch[data-role="Sales"]:hover,.constellation-branch[data-role="Sales"]:focus-within) .constellation-line-sales{filter:drop-shadow(0 0 4px rgba(52,85,180,.4))}
    #cursor-glow{background:radial-gradient(340px circle at var(--pointer-x,-1000px) var(--pointer-y,-1000px),rgba(247,174,139,.23),rgba(153,198,183,.14) 34%,rgba(120,145,203,.055) 57%,transparent 78%);mix-blend-mode:soft-light;transition:opacity .2s ease}
    #cursor-glow.is-visible{opacity:1}
    @media(prefers-reduced-motion:reduce){body.constellation-theme .constellation-idea,body.constellation-theme .constellation-member{transition:none!important}}
  </style>
</head>
<body class="constellation-theme">
  <div class="workspace-shell">
    <aside class="workspace-sidebar" aria-label="Workspace navigation">
      <a class="workspace-brand" href="#matching-page"><span class="workspace-brand-mark">O</span><span><strong>OnlySkills</strong><small>A SPACE FOR POSSIBILITY</small></span></a>
      <nav class="workspace-nav" aria-label="OnlySkills workspace">
        <div class="workspace-nav-group">
          <span class="workspace-nav-group-label">WORKSPACE</span>
          <button id="tab-overview" class="workspace-nav-link app-tab" type="button" aria-controls="overview-page"><span class="workspace-nav-icon" aria-hidden="true">⌂</span>Overview</button>
        </div>
        <div class="workspace-nav-group">
          <span class="workspace-nav-group-label">PROJECT</span>
          <button id="tab-agent" class="workspace-nav-link app-tab" type="button" aria-controls="agent-page"><span class="workspace-nav-icon" aria-hidden="true">✳</span>AI Workspace</button>
          <button id="tab-matching" class="workspace-nav-link app-tab active" type="button" aria-current="page" aria-controls="matching-page"><span class="workspace-nav-icon" aria-hidden="true">◎</span>Teammates</button>
          <button id="nav-plan" class="workspace-nav-link" type="button" data-workspace-destination="plan"><span class="workspace-nav-icon" aria-hidden="true">☷</span>My plan</button>
        </div>
        <div class="workspace-nav-group">
          <span class="workspace-nav-group-label">OUTPUTS</span>
          <button id="nav-agent-team" class="workspace-nav-link" type="button" data-workspace-destination="agent-team"><span class="workspace-nav-icon" aria-hidden="true">◈</span>Agent team</button>
          <button id="nav-deliverables" class="workspace-nav-link" type="button" data-workspace-destination="deliverables"><span class="workspace-nav-icon" aria-hidden="true">▤</span>Deliverables</button>
          <button id="tab-books" class="workspace-nav-link app-tab" type="button" aria-controls="books-page"><span class="workspace-nav-icon" aria-hidden="true">▧</span>Bookkeeping</button>
        </div>
      </nav>
    </aside>
    <div class="workspace-main">
      <header class="workspace-topbar"><div class="workspace-crumb"><span>OnlySkills</span><span aria-hidden="true">/</span><strong id="workspace-current-page">Teammates</strong></div><span id="workspace-identity" class="workspace-identity">Your venture workspace</span></header>
      <main class="container">
    <section id="overview-page" class="app-page" aria-labelledby="tab-overview" hidden>
      <section class="hero"><div class="eyebrow">YOUR WORKSPACE</div><h1>Build something together.</h1><p>A clear view of your real team, your assigned work, and the goal workflow. Team and task details come from your current device profile.</p></section>
      <div class="overview-grid">
        <article class="overview-card"><span class="overview-card-label">Team status</span><strong id="overview-team-status">Loading</strong><p id="overview-team-note">Checking your matching profile.</p></article>
        <article class="overview-card"><span class="overview-card-label">Your position</span><strong id="overview-role">—</strong><p id="overview-identity-note">No saved profile loaded.</p></article>
        <article class="overview-card"><span class="overview-card-label">Your plan</span><strong id="overview-task-progress">—</strong><p id="overview-next-task">Your assigned task progress appears here.</p></article>
      </div>
      <section class="overview-section"><h2>Your team</h2><div id="overview-team-members" class="overview-members"><p class="overview-empty">No team details are loaded yet.</p></div><div class="overview-actions"><button class="primary" type="button" data-workspace-destination="matching">Open matching</button><button class="secondary" type="button" data-workspace-destination="plan">Open my plan</button><button class="secondary" type="button" data-workspace-destination="agent">Open AI Workspace</button></div></section>
      <section class="overview-section" style="margin-top:12px"><h2>Goal workflow connection</h2><p id="overview-backend-status" class="overview-empty">Backend status is being checked.</p><p class="overview-empty">Goal results may use deterministic mock agents. Approving a recommendation only records your decision.</p><div class="overview-actions"><button class="primary" type="button" data-workspace-destination="agent">Open AI Workspace</button><button class="secondary" type="button" data-workspace-destination="deliverables">Look up existing results</button><button class="secondary" type="button" data-workspace-destination="books">Open shared bookkeeping</button></div></section>
    </section>
    <section id="matching-page" class="app-page" aria-labelledby="tab-matching">
      <section class="hero agent-hero"><div class="eyebrow">ONLYSKILLS TEAM MATCHING</div><h1>Find your venture team.</h1><p>Share your role, skills, interests, goal, and availability. When a strong three-role team is found, everyone can review and accept the invitation.</p></section>
      <div class="matching-note"><strong>How this demo works:</strong> matching uses a profile-based scoring algorithm (skills, shared interests and goals, and availability), not a live AI model. Names and profiles are visible to visitors using this public link. One browser/device ID is one demo user; switching devices creates another identity.</div>
      <div id="matching-loading" class="loading"><span class="spinner"></span>Checking your matching profile…</div>
      <section id="matching-constellation-panel" class="constellation-panel" aria-labelledby="matching-constellation-title" hidden>
        <header class="constellation-heading"><div><span class="eyebrow">YOUR TEAM CONSTELLATION</span><h2 id="matching-constellation-title" class="visually-hidden">Your venture team map</h2></div><p id="matching-constellation-caption">A live view of your profile, open roles, and confirmed teammates.</p></header>
        <div id="matching-constellation" class="constellation-map" aria-live="polite"></div>
      </section>
      <form id="matching-form" class="card matching-form" hidden>
        <div class="task-heading"><h3>Your matching profile</h3><span>All fields are required</span></div>
        <div class="form-grid">
          <label class="field"><span>Name</span><input name="displayName" maxlength="40" required autocomplete="given-name" placeholder="e.g. Amina"></label>
          <fieldset class="field field-wide role-picker"><legend>Choose your position</legend><div class="role-choice-grid">
            <label class="role-choice"><input type="radio" name="role" value="Product Creator" required><span class="role-step">01 · MAKE</span><strong>Product Creator</strong><small>I have a product or making skills.</small></label>
            <label class="role-choice"><input type="radio" name="role" value="Marketing" required><span class="role-step">02 · AMPLIFY</span><strong>Marketing</strong><small>I can promote ideas and attract customers.</small></label>
            <label class="role-choice"><input type="radio" name="role" value="Sales" required><span class="role-step">03 · CONNECT</span><strong>Sales</strong><small>I can sell and talk with customers.</small></label>
          </div></fieldset>
          <label class="field field-wide"><span>Your skills (comma separated)</span><input name="skills" maxlength="400" required placeholder="e.g. baking, recipe testing, packaging"></label>
          <label class="field field-wide"><span>Your interests (comma separated)</span><input name="interests" maxlength="400" required placeholder="e.g. food, student life, small business"></label>
          <label class="field field-wide"><span>What business goal do you want to work on?</span><textarea name="businessGoal" rows="3" maxlength="300" required placeholder="e.g. Sell homemade chili sauce to university students"></textarea></label>
          <label class="field"><span>Hours available per week</span><input name="availabilityHours" type="number" min="1" max="80" step="1" required value="5"></label>
          <label class="field"><span>When are you available?</span><input name="availabilitySlots" maxlength="240" required placeholder="e.g. weekday evenings, weekends"></label>
        </div>
        <div class="join-actions"><button id="matching-submit" class="primary" type="submit">Find my team</button><span class="fine-print">You can update your profile while you are waiting. You cannot change roles after a team invitation is sent.</span></div>
        <div id="matching-form-error" class="error" role="alert"></div>
      </form>
      <section id="matching-waiting" class="card" hidden><div class="status-box"><span class="status-icon">…</span><div><h2 id="matching-waiting-title">Looking for teammates</h2><p id="matching-waiting-copy">Your profile is saved. This page checks automatically for a suitable team.</p></div></div><div id="matching-counts" class="matching-counts"></div><div class="matching-actions" style="margin-top:14px"><button id="matching-refresh" class="secondary" type="button">Check again</button></div></section>
      <section id="matching-team" class="card matching-team" hidden>
        <div class="matching-team-head"><div><span class="eyebrow" id="matching-team-state">TEAM INVITATION</span><h2 id="matching-team-title">A possible team was found</h2><p id="matching-team-copy"></p></div><span id="matching-score" class="matching-score"></span></div>
        <div id="matching-breakdown" class="matching-breakdown"></div>
        <div id="matching-members" class="member-list"></div>
        <div id="matching-team-actions" class="matching-actions"></div>
 <section id="matching-task-section" hidden aria-labelledby="matching-task-title"><div class="task-heading"><div><span id="matching-task-owner" class="eyebrow"></span><h3 id="matching-task-title">My to-do list</h3></div><span id="matching-task-progress"></span></div><p class="matching-empty task-plan-note">Only your assigned work appears here. Expand a phase to follow its steps. These are role-based starter checklists; confirm product details with your team.</p><progress id="matching-task-bar" max="1" value="0" aria-label="Your completed task steps"></progress><div id="matching-task-save-status" class="task-save-status" role="status" aria-live="polite"></div><div id="matching-tasks" class="task-list"></div><div id="matching-task-error" class="error" role="alert"></div><button id="matching-task-retry" class="secondary" type="button" hidden>Retry saving step</button></section>
        <section id="matching-group-section" class="matching-group" hidden aria-labelledby="matching-group-title">
          <div class="task-heading"><h3 id="matching-group-title">Your 3-person group</h3><span>Shared by your team</span></div>
          <div id="matching-chat-messages" class="matching-chat-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>
          <form id="matching-chat-form" class="matching-chat-form">
            <textarea name="message" maxlength="1000" rows="2" required aria-label="Message your team" placeholder="Say hello to your teammates…"></textarea>
            <button id="matching-chat-send" class="primary" type="submit">Send message</button>
          </form>
          <div id="matching-chat-error" class="error" role="alert"></div>
        </section>
        <div id="matching-team-error" class="error" role="alert"></div>
      </section>
      <div id="matching-error" class="error" role="alert"></div>
      <p class="footer-note">Every formal team is enforced by the backend: exactly three accepted people, one per required position.</p>
    </section>
    <section id="agent-page" class="app-page" aria-labelledby="tab-agent" hidden>
      <section class="hero agent-hero"><div class="eyebrow">ONLYSKILLS GOAL WORKFLOW</div><h1>Turn a goal into a plan.</h1><p>Send a goal to the OnlySkills backend, review the returned agent results, then record whether you approve the recommendation.</p></section>
      <section class="agent-backend-card" aria-live="polite"><div><span class="field-label">Backend connection</span><strong id="health-status" class="backend-status">Checking…</strong><p id="health-message">Checking the backend. Its free service may need time to wake.</p><p>API base: <code id="agent-api-base"></code></p></div><button id="health-retry" class="secondary" type="button">Check again</button></section>
      <div class="agent-demo-note"><strong>WorkBuddy workflow:</strong> Goals are queued for a connected WorkBuddy Desktop worker. The worker must be online to claim them. Creator profiles and sales/KPI figures may be synthetic demo data. Approval only records your decision; it does not perform an external action.</div>
      <form id="goal-form" class="card agent-form">
        <div class="task-heading"><h3>Describe your goal</h3><span>Goal is required</span></div>
        <div class="form-grid">
          <label class="field field-wide"><span>Goal</span><textarea name="goal" rows="3" maxlength="500" required placeholder="Describe the outcome you want to achieve"></textarea></label>
          <label class="field"><span>Budget</span><input name="budget" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Optional"></label>
          <label class="field"><span>Currency</span><input name="currency" maxlength="12" placeholder="e.g. MYR"></label>
          <label class="field field-wide"><span>Product description</span><textarea name="productDescription" rows="2" maxlength="500" placeholder="Optional"></textarea></label>
          <label class="field field-wide"><span>Target customer</span><input name="targetCustomer" maxlength="300" placeholder="Optional"></label>
        </div>
        <div class="join-actions"><button id="goal-submit" class="primary" type="submit">Run goal workflow</button><span class="agent-submit-copy">Your goal is queued immediately. WorkBuddy Desktop must be connected and running its worker task to process it.</span></div>
        <div id="goal-error" class="error" role="alert"></div>
        <button id="goal-retry" class="secondary agent-retry" type="button" hidden>Retry goal request</button>
      </form>
      <section id="agent-run-panel" class="agent-run-panel" hidden aria-live="polite">
        <section class="card">
          <div class="agent-run-heading"><div><span class="eyebrow">BACKEND RUN</span><h2>Run <span id="run-id"></span></h2></div><span id="run-status" class="agent-status-pill">Status not returned yet</span></div>
          <dl class="agent-meta"><dt>Provider</dt><dd id="run-provider">Not returned by backend</dd><dt>Provider note</dt><dd id="run-provider-note">Not returned by backend</dd></dl>
          <div class="agent-refresh-row"><span id="run-refresh-message" class="agent-meta-label">Updates appear automatically while this page is open.</span><button id="refresh-agent-run" class="secondary" type="button">Refresh status</button></div>
          <div id="run-error" class="error" role="alert"></div>
        </section>
        <section class="card" aria-live="polite"><div class="agent-section-heading"><h3>WorkBuddy progress</h3><span>Updates from the worker</span></div><p id="run-worker-hint" class="agent-meta-label">OnlySkills will show progress after WorkBuddy claims the goal.</p><ol id="run-progress-events" class="agent-progress-events"><li class="agent-empty">Waiting for the first update.</li></ol></section>
        <section>
          <div class="agent-section-heading"><h3>Agent results</h3><span>Fields shown exactly as returned</span></div>
          <div id="agent-results" class="agent-results"></div>
        </section>
        <section id="recommendation-card" class="card">
          <div class="agent-section-heading"><h3>Recommendation</h3><span>Review before recording a decision</span></div>
          <div id="recommendation-content"><p class="agent-empty">No recommendation has been returned yet.</p></div>
          <p class="agent-meta-label">Approving or rejecting only records your decision. It will not execute an external action.</p>
          <div class="agent-decision-actions"><button id="approve-recommendation" class="primary" type="button" disabled>Approve</button><button id="reject-recommendation" class="secondary" type="button" disabled>Reject</button></div>
          <p id="decision-loading" class="agent-meta-label" hidden>Saving your decision…</p>
          <div id="decision-result" class="agent-decision-result" hidden></div>
          <div id="decision-error" class="error" role="alert"></div>
        </section>
      </section>
      <section class="card workbuddy-lookup">
        <div class="agent-section-heading"><div><span class="eyebrow">EXISTING RUN</span><h3>View WorkBuddy results</h3></div></div>
        <p class="agent-meta-label">Look up a run that already exists. This does not start a new goal workflow.</p>
        <form id="workbuddy-lookup-form" class="workbuddy-lookup-form">
          <label class="field"><span>Run ID</span><input name="runId" type="text" maxlength="200" autocomplete="off" required placeholder="Paste a WorkBuddy runId"></label>
          <button id="workbuddy-lookup-submit" class="primary" type="submit">Look up results</button>
        </form>
        <p id="workbuddy-lookup-status" class="workbuddy-lookup-status" role="status" aria-live="polite"></p>
        <div id="workbuddy-lookup-error" class="error" role="alert"></div>
        <section id="workbuddy-results-panel" class="workbuddy-results-panel" hidden aria-live="polite">
          <section class="card"><div class="agent-run-heading"><div><span class="eyebrow">WORKBUDDY RUN</span><h2><span id="workbuddy-run-id"></span></h2></div><span id="workbuddy-run-status" class="agent-status-pill">Not returned by backend</span></div><div class="agent-section-heading"><h3>Goal</h3></div><div id="workbuddy-run-goal"></div></section>
          <section><div class="agent-section-heading"><h3>Agent results</h3><span>Returned data</span></div><div id="workbuddy-agent-results" class="agent-results"></div></section>
          <section class="card"><div class="agent-section-heading"><h3>Recommendation</h3></div><div id="workbuddy-recommendation"></div></section>
          <section class="card"><div class="agent-section-heading"><h3>Artifacts</h3><span>Titles and locations</span></div><div id="workbuddy-artifacts" class="workbuddy-artifacts"></div></section>
          <section class="card"><div class="agent-section-heading"><h3>Validation status</h3></div><div id="workbuddy-validation"></div></section>
        </section>
      </section>
    </section>
    __BOOKS_HTML__
      </main>
    </div>
  </div>
  <div id="cursor-glow" aria-hidden="true"></div>
  <script>
    const AGENT_API_BASE_URL = __AGENT_API_BASE_URL_JSON__;
    const lookupWorkBuddyResults = __WORKBUDDY_LOOKUP_FUNCTION__;
    __CHECKLIST_SCRIPT__
    const ROLES = ["Product Creator", "Marketing", "Sales"];
    const $ = (selector) => document.querySelector(selector);
    const escapeHTML = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
    if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const cursorGlow = $("#cursor-glow");
      let pendingPointer = null;
      let pointerFrame = 0;
      window.addEventListener("pointermove", (event) => {
        pendingPointer = event;
        if (pointerFrame) return;
        pointerFrame = window.requestAnimationFrame(() => {
          if (pendingPointer) {
            cursorGlow.style.setProperty("--pointer-x", pendingPointer.clientX + "px");
            cursorGlow.style.setProperty("--pointer-y", pendingPointer.clientY + "px");
            cursorGlow.classList.add("is-visible");
            const surface = pendingPointer.target instanceof Element ? pendingPointer.target.closest(".constellation-orb,.constellation-member,.constellation-idea") : null;
            const constellation = $("#matching-constellation");
            if (surface && constellation?.contains(surface)) {
              const rect = surface.getBoundingClientRect();
              const x = Math.round(((pendingPointer.clientX - rect.left) / rect.width) * 100) + "%";
              const y = Math.round(((pendingPointer.clientY - rect.top) / rect.height) * 100) + "%";
              const spotlight = surface.classList.contains("constellation-orb") ? "--orb-" : surface.classList.contains("constellation-member") ? "--card-" : "--idea-";
              surface.style.setProperty(spotlight + "x", x);
              surface.style.setProperty(spotlight + "y", y);
            }
          }
          pointerFrame = 0;
        });
      }, { passive: true });
      document.documentElement.addEventListener("pointerleave", () => cursorGlow.classList.remove("is-visible"));
      window.addEventListener("blur", () => cursorGlow.classList.remove("is-visible"));
    }
    const AGENT_KEYS = ["businessAnalyst", "growth", "teamBuilder", "operations", "feedback"];
    const AGENT_REQUEST_TIMEOUT_MS = 120000;
    let currentAgentRun = null;
    let lastGoalPayload = null;
    let goalSubmitBusy = false;
    let workBuddyLookupBusy = false;
    let agentRefreshBusy = false;
    let agentDecisionBusy = false;
    let agentPollTimer = null;
    const AGENT_POLL_INTERVAL_MS = 2500;
    const TERMINAL_AGENT_STATUSES = new Set(["awaiting_approval", "approved", "rejected", "failed"]);

    function apiURL(path) {
      const base = new URL(AGENT_API_BASE_URL);
      const target = new URL(path, base.href.endsWith("/") ? base.href : base.href + "/");
      if (target.origin !== base.origin) throw new Error("The backend returned a URL outside its configured origin.");
      return target.href;
    }
    async function requestAgentJSON(url, options = {}) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AGENT_REQUEST_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(url, {...options, signal:controller.signal, cache:"no-store"});
      } catch (error) {
        if (controller.signal.aborted || error?.name === "AbortError") {
          throw new Error("The request timed out after two minutes. Render may still be waking; you can retry.");
        }
        if (error instanceof TypeError) {
          const origin = window.location.origin;
          throw new Error("The browser could not reach the backend. If DevTools reports a CORS error, set FRONTEND_ORIGIN=" + origin + " in Render. The deployed frontend origin is https://onlyskill-student-ventures.li895.chatgpt.site. This app calls Render directly; no proxy is used.");
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
      const raw = await response.text();
      let payload = null;
      if (raw) {
        try { payload = JSON.parse(raw); } catch (_) { payload = { message: raw.slice(0, 600) }; }
      }
      if (!response.ok) {
        const detail = payload && typeof payload === "object" ? payload.message || payload.error || payload.detail : "";
        throw Object.assign(new Error("Backend returned HTTP " + response.status + (detail ? ": " + String(detail).slice(0, 600) : "")), {status:response.status});
      }
      return payload;
    }
    function displayApiValue(value) {
      if (value === undefined || value === null) return "Not returned by backend";
      return typeof value === "string" ? value : JSON.stringify(value, null, 2);
    }
    function renderApiValue(value) {
      if (value === null) return "<span>null</span>";
      if (Array.isArray(value)) {
        if (!value.length) return "<span>[]</span>";
        return "<ol class=\"agent-fields agent-nested\">" + value.map((item) => "<li>" + renderApiValue(item) + "</li>").join("") + "</ol>";
      }
      if (value && typeof value === "object") {
        const entries = Object.entries(value);
        if (!entries.length) return "<span>{}</span>";
        return "<dl class=\"agent-fields agent-nested\">" + entries.map(([key, child]) => "<div><dt>" + escapeHTML(key) + "</dt><dd>" + renderApiValue(child) + "</dd></div>").join("") + "</dl>";
      }
      return "<span>" + escapeHTML(String(value)) + "</span>";
    }
    function renderApiFields(value, emptyMessage) {
      if (value === undefined) return "<p class=\"agent-empty\">" + escapeHTML(emptyMessage || "No fields were returned by the backend.") + "</p>";
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const entries = Object.entries(value);
        if (!entries.length) return renderApiValue(value);
        return "<dl class=\"agent-fields\">" + entries.map(([key, child]) => "<div><dt>" + escapeHTML(key) + "</dt><dd>" + renderApiValue(child) + "</dd></div>").join("") + "</dl>";
      }
      return "<div class=\"agent-fields\"><div><dt>Result</dt><dd>" + renderApiValue(value) + "</dd></div></div>";
    }
    function matchingAgentInArray(array, key) {
      if (!Array.isArray(array)) return undefined;
      const wanted = key.toLowerCase();
      return array.find((entry) => entry && typeof entry === "object" && [entry.key, entry.agent, entry.name, entry.id, entry.type].some((value) => typeof value === "string" && value.toLowerCase().replace(/[^a-z0-9]/g, "") === wanted));
    }
    function agentValueFrom(documentData, key) {
      if (!documentData || typeof documentData !== "object") return undefined;
      const containers = [documentData, documentData.results, documentData.agents, documentData.agentResults, documentData.data, documentData.data?.results, documentData.data?.agents, documentData.results?.agents, documentData.result?.agents];
      for (const container of containers) {
        if (container && !Array.isArray(container) && Object.prototype.hasOwnProperty.call(container, key)) return container[key];
      }
      for (const array of [documentData.agents, documentData.agentResults, documentData.results, documentData.results?.agents, documentData.data?.agents, documentData.data?.results, documentData.data?.results?.agents]) {
        const match = matchingAgentInArray(array, key);
        if (match) return match;
      }
      return undefined;
    }
    function agentStatusFrom(documents, key, resultValue) {
      for (const documentData of documents) {
        if (!documentData || typeof documentData !== "object") continue;
        const containers = [documentData.agentStatuses, documentData.agentStatus, documentData.statuses, documentData.agents, documentData.data?.agentStatuses, documentData.data?.agents, documentData.results?.agents];
        for (const container of containers) {
          let candidate;
          if (Array.isArray(container)) candidate = matchingAgentInArray(container, key);
          else if (container && Object.prototype.hasOwnProperty.call(container, key)) candidate = container[key];
          if (typeof candidate === "string") return candidate;
          if (candidate && typeof candidate === "object" && candidate.status !== undefined && candidate.status !== null) return candidate.status;
        }
      }
      if (resultValue && typeof resultValue === "object" && !Array.isArray(resultValue) && resultValue.status !== undefined && resultValue.status !== null) return resultValue.status;
      return undefined;
    }
    function firstReturnedField(documents, key) {
      for (const documentData of documents) {
        if (documentData && Object.prototype.hasOwnProperty.call(documentData, key) && documentData[key] !== undefined && documentData[key] !== null) return documentData[key];
      }
      return undefined;
    }
    let deviceId = "";
    try { deviceId = localStorage.getItem("onlyskill-device") || ""; } catch (_) {}
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => { const rand = Math.random() * 16 | 0; return (char === "x" ? rand : rand & 3 | 8).toString(16); });
      try { localStorage.setItem("onlyskill-device", deviceId); } catch (_) {}
    }
    function showError(id, message) { const node = document.getElementById(id); node.textContent = message || ""; node.style.display = message ? "block" : "none"; }

    let currentMatchingState = null;
    let matchingRefreshBusy = false;
    let matchingSubmitBusy = false;
    let matchingActionBusy = false;
    let matchingMessageBusy = false;
    let matchingTaskBusy = false;
    let failedTaskUpdate = null;
    let matchingTaskSignature = "";
    let matchingStateEpoch = 0;
    let lastFocusedStep = "";
    const matchingPhaseOpen = new Map();
    let matchingFormLoaded = false;
    async function requestMatchingJSON(path, options = {}) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(path, {...options, signal:controller.signal, cache:"no-store"});
        const raw = await response.text();
        let payload = null;
        if (raw) { try { payload = JSON.parse(raw); } catch (_) { payload = {message:raw.slice(0, 400)}; } }
        if (!response.ok) throw new Error(payload?.error || payload?.message || "Matching request failed (HTTP " + response.status + ").");
        return payload;
      } catch (error) {
        if (controller.signal.aborted || error?.name === "AbortError") throw new Error("The matching request timed out. Check your connection and retry.");
        throw error;
      } finally { clearTimeout(timeout); }
    }
    function matchingRequest(path, body) {
      return requestMatchingJSON(path, {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    }
    function matchingStatusLabel(status) {
      return ({invited:"Invitation waiting",accepted:"Accepted",rejected:"Rejected",cancelled:"Cancelled"})[status] || status || "Status unavailable";
    }
    function renderMatchingConstellation(state) {
      const panel = $("#matching-constellation-panel");
      const host = $("#matching-constellation");
      const profile = state.profile || null;
      const team = state.team || null;
      const members = Array.isArray(team?.members) ? team.members : [];
      const counts = state.availableCounts || {};
      const creatorGoal = members.find((member) => member.role === "Product Creator")?.businessGoal;
      const idea = profile?.businessGoal || creatorGoal || members.find((member) => member.businessGoal)?.businessGoal || "";
      const teamIsActive = team?.status === "active";
      const caption = teamIsActive
        ? "Three members have accepted: one Product Creator, one Marketing member, and one Sales member."
        : team
          ? "A possible team is connected. It becomes active after every member accepts the invitation."
          : profile
            ? "Your profile is saved. Open-position counts reflect profiles currently available for matching."
            : "Choose a position and add your venture goal to begin matching.";
      $("#matching-constellation-caption").textContent = caption;
      const roles = [
        { role: "Product Creator", code: "MAKE", short: "Build the product" },
        { role: "Marketing", code: "AMPLIFY", short: "Reach customers" },
        { role: "Sales", code: "CONNECT", short: "Talk with customers" },
      ];
      const branches = roles.map(({ role, code, short }) => {
        const member = members.find((candidate) => candidate.role === role) || null;
        const isYou = Boolean(profile && profile.role === role);
        const ownProfileOnly = !team && isYou ? profile : null;
        const visibleProfile = member || ownProfileOnly;
        const available = Math.max(0, Number(counts[role]) || 0);
        const name = visibleProfile?.name || (available ? available + " profile" + (available === 1 ? "" : "s") + " available" : "Open position");
        const status = visibleProfile
          ? (isYou ? (team ? "YOUR POSITION" : "YOUR SAVED PROFILE") : matchingStatusLabel(visibleProfile.invitationStatus))
          : (available ? "MATCHING POOL" : "WAITING FOR A MATCH");
        const detail = visibleProfile
          ? (isYou && profile ? ((profile.skills || []).slice(0, 3).join(" · ") || short) + (profile.availabilityHours ? " · " + profile.availabilityHours + " hrs/week" : "") : "Real profile linked to this " + (team ? "team match." : "role."))
          : (available ? "Potential profiles only; no teammate is named until a match is formed." : "No available profile is listed for this position yet.");
        return '<article class="constellation-branch" data-role="' + escapeHTML(role) + '">' +
          '<div class="constellation-orb"><span class="constellation-symbol" aria-hidden="true"><span></span></span><strong>' + escapeHTML(role) + '</strong><small>' + escapeHTML(code) + '</small></div>' +
          '<div class="constellation-member"><small>' + escapeHTML(status) + '</small><strong>' + escapeHTML(name) + '</strong><p>' + escapeHTML(detail) + '</p></div>' +
          '</article>';
      }).join("");
      const ideaContent = idea ? escapeHTML(idea) : "Your venture idea will appear here after you save a matching profile.";
      const ideaNote = idea ? "The goal connecting this team." : "Add your business goal to show it here.";
      host.innerHTML = '<svg class="constellation-lines" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><path class="constellation-line-product" d="M 180 140 C 300 145, 370 235, 500 300"/><path class="constellation-line-marketing" d="M 820 140 C 700 145, 630 235, 500 300"/><path class="constellation-line-sales" d="M 820 465 C 700 455, 640 365, 500 300"/><path class="constellation-orbit-trace" d="M 42 492 C 110 85, 703 26, 958 358"/></svg>' +
        '<div class="constellation-idea"><span class="constellation-idea-mark" aria-hidden="true"><span></span></span><div><span class="eyebrow">YOUR VENTURE IDEA</span><strong>' + ideaContent + '</strong><p>' + escapeHTML(ideaNote) + '</p></div></div>' + branches;
      panel.hidden = false;
    }
    function loadMatchingForm(profile) {
      if (!profile || matchingFormLoaded) return;
      const form = $("#matching-form");
      form.elements.displayName.value = profile.name || "";
      form.elements.role.value = profile.role || "";
      form.elements.skills.value = (profile.skills || []).join(", ");
      form.elements.interests.value = (profile.interests || []).join(", ");
      form.elements.businessGoal.value = profile.businessGoal || "";
      form.elements.availabilityHours.value = profile.availabilityHours || 5;
      form.elements.availabilitySlots.value = (profile.availabilitySlots || []).join(", ");
      $("#matching-submit").textContent = "Update profile and keep matching";
      matchingFormLoaded = true;
    }
    function renderOverview() {
      const state = currentMatchingState;
      const profile = state?.profile;
      const team = state?.team;
      const activeTeam = team?.status === "active";
      const matchEnded = Boolean(profile && (profile.matchOptIn === false || state?.lastMatch?.teamStatus === "cancelled"));
      const members = Array.isArray(team?.members) ? team.members : [];
      if (!state) {
        const matchingError = $("#matching-error").textContent.trim();
        $("#overview-team-status").textContent = matchingError ? "Unavailable" : "Loading";
        $("#overview-team-note").textContent = matchingError || "Checking your matching profile.";
        $("#overview-role").textContent = "—";
        $("#overview-identity-note").textContent = "No saved profile loaded.";
        $("#overview-task-progress").textContent = "—";
        $("#overview-next-task").textContent = "Your assigned task progress appears here.";
        $("#overview-team-members").innerHTML = '<p class="overview-empty">No team details are loaded yet.</p>';
        $("#workspace-identity").textContent = "Your venture workspace";
        return;
      }
      $("#overview-team-status").textContent = activeTeam ? "Team active" : team ? "Invitation pending" : matchEnded ? "Match ended" : profile ? "Matching" : "Get started";
      $("#overview-team-note").textContent = activeTeam ? "All three roles are together. Your shared group is ready." : team ? "Review the team invitation in Teammates." : matchEnded ? "Your previous team ended. Review or resubmit your profile in Teammates when you are ready." : profile ? "Your saved profile is looking for the other two roles." : "Create a profile to join a three-role team.";
      $("#overview-role").textContent = profile?.role || "Not set";
      $("#overview-identity-note").textContent = profile?.name ? "Profile for " + profile.name : "Choose a position and create your profile.";
      $("#workspace-identity").textContent = profile?.name ? profile.name + (profile.role ? " · " + profile.role : "") : "Your venture workspace";
      const tasks = activeTeam ? (Array.isArray(team.tasks) ? team.tasks : []).filter(task => task.canUpdate && task.role === profile?.role) : [];
      const steps = tasks.flatMap(task => Array.isArray(task.steps) ? task.steps : []);
      const done = steps.filter(step => step.completed).length;
      const nextStep = steps.find(step => !step.completed);
      $("#overview-task-progress").textContent = activeTeam ? done + " / " + steps.length : "Not active";
      $("#overview-next-task").textContent = activeTeam ? nextStep?.title || (steps.length ? "Your personal checklist is complete." : "Your personal checklist is not available yet.") : "Your role-specific checklist appears after the team is active.";
      $("#overview-team-members").innerHTML = members.length ? members.map(member => '<article class="overview-member"><small>' + escapeHTML(member.role) + '</small><strong>' + escapeHTML(member.name) + '</strong></article>').join("") : '<p class="overview-empty">' + (team ? "Team member details are not available yet." : "A confirmed three-person team will appear here.") + '</p>';
      const health = $("#health-status");
      if (health) $("#overview-backend-status").textContent = "Agent backend: " + health.textContent + ". " + $("#health-message").textContent;
    }
    function renderMatching() {
      const state = currentMatchingState;
      renderOverview();
      if (!state) return;
      $("#matching-loading").hidden = true;
      loadMatchingForm(state.profile);
      const team = state.team;
      renderMatchingConstellation(state);
      $("#matching-form").hidden = Boolean(team);
      $("#matching-waiting").hidden = Boolean(team) || !state.profile;
      $("#matching-team").hidden = !team;
      const counts = state.availableCounts || {};
      $("#matching-counts").innerHTML = ROLES.map((role) => '<span class="matching-count">' + escapeHTML(role) + ': ' + escapeHTML(counts[role] || 0) + ' available profiles</span>').join("");
      if (!team) {
        $("#matching-group-section").hidden = true;
        if (state.profile) {
          const last = state.lastMatch;
          $("#matching-waiting-title").textContent = last?.teamStatus === "cancelled" ? "Your previous match ended" : "Looking for teammates";
          $("#matching-waiting-copy").textContent = state.profile.matchOptIn === false
            ? "Your previous match was cancelled. Update or resubmit your profile when you are ready to match again."
            : "Your profile is saved. It will be matched with one Product Creator, one Marketing member, and one Sales member.";
        }
        return;
      }
      const isActive = team.status === "active";
      $("#matching-group-section").hidden = !isActive;
      const ownStatus = team.yourInvitationStatus;
      $("#matching-team-state").textContent = isActive ? "TEAM CONFIRMED" : "TEAM INVITATION";
      $("#matching-team-title").textContent = isActive ? "Your team is ready." : "A possible team was found";
      $("#matching-team-copy").textContent = isActive
        ? "All three members accepted. Your assigned tasks are saved below."
        : ownStatus === "accepted" ? "You accepted. The team becomes active after everyone accepts." : "Review the people and match score, then accept or reject this invitation.";
      $("#matching-score").textContent = String(team.matchScore) + "% match";
      const breakdown = team.scoreBreakdown || {};
      const badges = ["skills","interests","businessGoals","availability"].map((key) => {
        const value = breakdown[key];
        return value === undefined ? "" : '<span class="matching-count">' + escapeHTML(key.replace(/[A-Z]/g, (letter) => " " + letter.toLowerCase())) + ': ' + escapeHTML(value) + '%</span>';
      }).join("");
      const roleReasons = Array.isArray(breakdown.skillRoleFit) ? breakdown.skillRoleFit.map((fit) => {
        const keywords = Array.isArray(fit.matchedKeywords) && fit.matchedKeywords.length ? ": " + fit.matchedKeywords.join(", ") : ": no role keywords matched";
        return '<span class="matching-count">' + escapeHTML(fit.role) + ' skill fit ' + escapeHTML(fit.score) + '%' + escapeHTML(keywords) + '</span>';
      }).join("") : "";
      const overlaps = [
        Array.isArray(breakdown.commonInterestTerms) && breakdown.commonInterestTerms.length ? "Shared interests: " + breakdown.commonInterestTerms.join(", ") : "",
        Array.isArray(breakdown.commonGoalTerms) && breakdown.commonGoalTerms.length ? "Shared goal terms: " + breakdown.commonGoalTerms.join(", ") : "",
        Array.isArray(breakdown.commonTimeSlots) && breakdown.commonTimeSlots.length ? "Shared availability: " + breakdown.commonTimeSlots.join(", ") : "",
        breakdown.hoursRange ? "Hours per week: " + breakdown.hoursRange.min + "–" + breakdown.hoursRange.max : "",
      ].filter(Boolean);
      $("#matching-breakdown").innerHTML = badges + roleReasons + overlaps.map((reason) => '<span class="matching-count">' + escapeHTML(reason) + '</span>').join("") + (breakdown.explanation ? '<p class="matching-empty">' + escapeHTML(breakdown.explanation) + '</p>' : "");
      $("#matching-members").innerHTML = (team.members || []).map((member) => '<article class="matching-person" data-role="' + escapeHTML(member.role) + '"><small>' + escapeHTML(member.role) + ' · <span class="person-status">' + escapeHTML(matchingStatusLabel(member.invitationStatus)) + '</span></small><strong>' + escapeHTML(member.name) + '</strong><small>Skills: ' + escapeHTML((member.skills || []).join(", ")) + '</small><small>Goal: ' + escapeHTML(member.businessGoal) + '</small><small>Availability: ' + escapeHTML(member.availabilityHours) + ' hrs/week · ' + escapeHTML((member.availabilitySlots || []).join(", ")) + '</small></article>').join("");
      const actions = $("#matching-team-actions");
      if (!isActive && ownStatus === "invited") {
        actions.innerHTML = '<button id="matching-reject" class="secondary" type="button" ' + (matchingActionBusy || matchingMessageBusy || matchingTaskBusy ? "disabled" : "") + '>Reject invitation</button><button id="matching-accept" class="primary" type="button" ' + (matchingActionBusy || matchingMessageBusy || matchingTaskBusy ? "disabled" : "") + '>Accept invitation</button>';
      } else {
        actions.innerHTML = '<button id="matching-cancel" class="secondary" type="button" ' + (matchingActionBusy || matchingMessageBusy || matchingTaskBusy ? "disabled" : "") + '>' + (isActive ? "Cancel team" : "Cancel match") + '</button>';
      }
      $("#matching-task-section").hidden = !isActive;
      $("#matching-chat-send").disabled = matchingMessageBusy || matchingTaskBusy || matchingActionBusy;
      if (isActive) {
        const chatPane = $("#matching-chat-messages");
        const wasAtBottom = chatPane.scrollHeight - chatPane.scrollTop - chatPane.clientHeight < 56;
        const messages = Array.isArray(team.messages) ? team.messages : [];
        chatPane.innerHTML = messages.length ? messages.map((message) => {
          const timestamp = new Date(Number(message.createdAt));
          const timeLabel = Number.isNaN(timestamp.getTime()) ? "" : timestamp.toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
          const text = escapeHTML(message.body || "").replace(/\n/g, "<br>");
          return '<article class="matching-chat-message' + (message.isMine ? " mine" : "") + '"><div class="matching-chat-meta"><strong>' + escapeHTML(message.name || "Teammate") + '</strong><span>' + escapeHTML(timeLabel) + '</span></div><p>' + text + '</p></article>';
        }).join("") : '<p class="matching-empty">Your group is ready. Say hello to your teammates.</p>';
        if (wasAtBottom) chatPane.scrollTop = chatPane.scrollHeight;
        renderPersonalTasks(team, state.profile);
      }
    }
    async function refreshMatching() {
      if (matchingRefreshBusy || matchingActionBusy || matchingSubmitBusy || matchingMessageBusy || matchingTaskBusy) return;
      matchingRefreshBusy = true;
      const epoch = matchingStateEpoch;
      try {
        const received = await requestMatchingJSON("/api/matching/state?device=" + encodeURIComponent(deviceId));
        if (epoch !== matchingStateEpoch) return;
        currentMatchingState = received;
        showError("matching-error", "");
        renderMatching();
      } catch (error) {
        if (epoch !== matchingStateEpoch) return;
        $("#matching-loading").hidden = true;
        showError("matching-error", (error.message || "Could not load matching state.") + " Use Check again to retry.");
        $("#matching-form").hidden = false;
      } finally { matchingRefreshBusy = false; }
    }
    $("#matching-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity() || matchingSubmitBusy) return;
      const values = new FormData(form);
      const split = (value) => String(value || "").split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
      const payload = {
        deviceId,
        displayName:String(values.get("displayName") || "").trim(),
        role:String(values.get("role") || ""),
        skills:split(values.get("skills")),
        interests:split(values.get("interests")),
        businessGoal:String(values.get("businessGoal") || "").trim(),
        availabilityHours:Number(values.get("availabilityHours")),
        availabilitySlots:split(values.get("availabilitySlots")),
      };
      matchingSubmitBusy = true;
      matchingStateEpoch++;
      $("#matching-submit").disabled = true;
      $("#matching-submit").innerHTML = '<span class="spinner"></span>Finding your team…';
      showError("matching-form-error", "");
      try {
        currentMatchingState = await matchingRequest("/api/matching/profile", payload);
        matchingFormLoaded = true;
        showError("matching-error", "");
        renderMatching();
      } catch (error) { showError("matching-form-error", error.message || "Could not save your profile."); }
      finally {
        matchingSubmitBusy = false;
        $("#matching-submit").disabled = false;
        $("#matching-submit").textContent = currentMatchingState?.profile ? "Update profile and keep matching" : "Find my team";
      }
    });
    async function runMatchingAction(path, body) {
      if (matchingActionBusy || matchingTaskBusy) return;
      matchingActionBusy = true;
      matchingStateEpoch++;
      showError("matching-team-error", "");
      renderMatching();
      try {
        currentMatchingState = await matchingRequest(path, body);
        showError("matching-error", "");
        renderMatching();
      } catch (error) {
        showError("matching-team-error", error.message || "Could not update this match.");
      } finally { matchingActionBusy = false; renderMatching(); }
    }
    $("#matching-team-actions").addEventListener("click", (event) => {
      const teamId = currentMatchingState?.team?.id;
      if (!teamId) return;
      if (event.target.closest("#matching-accept")) runMatchingAction("/api/matching/decision", {deviceId,teamId,action:"accept"});
      else if (event.target.closest("#matching-reject")) runMatchingAction("/api/matching/decision", {deviceId,teamId,action:"reject"});
      else if (event.target.closest("#matching-cancel")) runMatchingAction("/api/matching/cancel", {deviceId,teamId});
    });
    function renderPersonalTasks(team, profile) {
      const tasks = (Array.isArray(team.tasks) ? team.tasks : []).filter(task => task.canUpdate && task.role === profile?.role);
      const steps = tasks.flatMap(task => Array.isArray(task.steps) ? task.steps : []);
      const done = steps.filter(step => step.completed).length;
      $("#matching-task-owner").textContent = (profile?.role || "My work") + (profile?.name ? " · " + profile.name : "");
      $("#matching-task-progress").textContent = done + " / " + steps.length + " steps done";
      $("#matching-task-bar").max = Math.max(1, steps.length);
      $("#matching-task-bar").value = done;
      $("#matching-tasks").setAttribute("aria-busy", String(matchingTaskBusy));
      const signature = JSON.stringify([team.id, tasks, matchingTaskBusy, matchingActionBusy, matchingMessageBusy]);
      if (signature === matchingTaskSignature) return;
      matchingTaskSignature = signature;
      const focusedStep = document.activeElement?.dataset?.matchingStep || lastFocusedStep;
      const firstTodo = tasks.find(task => !task.completed) || tasks[0];
      $("#matching-tasks").innerHTML = tasks.map((task, index) => {
        const phaseSteps = Array.isArray(task.steps) ? task.steps : [];
        const completed = phaseSteps.filter(step => step.completed).length;
        const open = matchingPhaseOpen.has(task.id) ? matchingPhaseOpen.get(task.id) : task.id === firstTodo?.id;
        return '<details class="matching-phase" data-phase-id="' + escapeHTML(task.id) + '" ' + (open ? "open" : "") + '><summary><span class="phase-number' + (task.completed ? " phase-complete" : "") + '">' + (task.completed ? "✓" : index + 1) + '</span><span class="phase-label"><strong>' + escapeHTML(task.title) + '</strong><small>' + completed + ' / ' + phaseSteps.length + ' steps completed</small></span></summary><p class="phase-description">' + escapeHTML(task.detail) + '</p><div class="phase-steps">' + phaseSteps.map((step, stepIndex) => '<label class="matching-task' + (step.completed ? " is-complete" : "") + '"><input type="checkbox" data-matching-step="' + escapeHTML(step.id) + '" ' + (step.completed ? "checked " : "") + (matchingTaskBusy || matchingActionBusy || matchingMessageBusy ? "disabled" : "") + '><span><strong>' + (stepIndex + 1) + '. ' + escapeHTML(step.title) + '</strong><p>' + escapeHTML(step.detail) + '</p><p class="step-output"><b>Done when:</b> ' + escapeHTML(step.output) + '</p>' + (step.estimatedMinutes ? '<small class="agent-meta-label">Suggested effort: about ' + escapeHTML(step.estimatedMinutes) + ' min</small>' : "") + '</span></label>').join("") + '</div></details>';
      }).join("") || '<p class="matching-empty">Your personal task plan is not available yet. Use Check again to retry.</p>';
      if (focusedStep && !matchingTaskBusy) {
        const input = Array.from($("#matching-tasks").querySelectorAll("[data-matching-step]")).find(node => node.dataset.matchingStep === focusedStep);
        input?.focus({preventScroll:true});
        lastFocusedStep = "";
      }
    }
    $("#matching-tasks").addEventListener("toggle", event => {
      if (event.target.matches("details[data-phase-id]")) matchingPhaseOpen.set(event.target.dataset.phaseId, event.target.open);
    }, true);
    async function saveMatchingStep(payload) {
      if (matchingTaskBusy || matchingActionBusy || matchingMessageBusy) { renderMatching(); return; }
      matchingTaskBusy = true;
      matchingStateEpoch++;
      lastFocusedStep = payload.stepId;
      failedTaskUpdate = null;
      showError("matching-task-error", "");
      $("#matching-task-retry").hidden = true;
      $("#matching-task-save-status").textContent = "Saving your step…";
      renderMatching();
      try {
        currentMatchingState = await matchingRequest("/api/matching/task-step", payload);
        $("#matching-task-save-status").textContent = "Step saved. Your progress is up to date.";
      } catch (error) {
        failedTaskUpdate = payload;
        $("#matching-task-save-status").textContent = "Step not saved.";
        showError("matching-task-error", error.message || "Could not save this step. Retry when connected.");
        $("#matching-task-retry").hidden = false;
      } finally { matchingTaskBusy = false; renderMatching(); }
    }
    delegateChecklist($("#matching-tasks"), "input[data-matching-step]", "change", function () {
      if (this.disabled) return;
      saveMatchingStep({deviceId,stepId:this.dataset.matchingStep,completed:this.checked});
    });
    $("#matching-task-retry").addEventListener("click", () => { if (failedTaskUpdate) saveMatchingStep(failedTaskUpdate); });
    $("#matching-chat-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity() || matchingMessageBusy || matchingTaskBusy || matchingActionBusy) return;
      const message = String(new FormData(form).get("message") || "").trim();
      if (!message) return;
      matchingMessageBusy = true;
      matchingStateEpoch++;
      const button = $("#matching-chat-send");
      button.disabled = true;
      button.innerHTML = '<span class="spinner"></span>Sending…';
      showError("matching-chat-error", "");
      renderMatching();
      try {
        currentMatchingState = await matchingRequest("/api/matching/message", {deviceId,message});
        form.elements.message.value = "";
        renderMatching();
      } catch (error) {
        showError("matching-chat-error", error.message || "Could not send your message.");
      } finally {
        matchingMessageBusy = false;
        button.disabled = false;
        button.textContent = "Send message";
        renderMatching();
      }
    });
    $("#matching-refresh").addEventListener("click", refreshMatching);

    function selectAppTab(tabName, navId = "", scrollTargetId = "") {
      const matchingSelected = tabName === "matching";
      const overviewSelected = tabName === "overview";
      $("#overview-page").hidden = !overviewSelected;
      $("#matching-page").hidden = !matchingSelected;
      $("#agent-page").hidden = tabName !== "agent";
      $("#books-page").hidden = tabName !== "books";
      document.querySelectorAll(".workspace-nav-link").forEach(link => { link.classList.remove("active"); link.removeAttribute("aria-current"); });
      const activeNav = $("#" + (navId || ({overview:"tab-overview",matching:"tab-matching",agent:"tab-agent",books:"tab-books"})[tabName]));
      if (activeNav) { activeNav.classList.add("active"); activeNav.setAttribute("aria-current", "page"); }
      const label = activeNav?.textContent.trim() || ({overview:"Overview",matching:"Teammates",agent:"AI Workspace",books:"Bookkeeping"})[tabName];
      $("#workspace-current-page").textContent = label;
      if (matchingSelected) refreshMatching();
      if (tabName === "agent" && currentAgentRun) refreshAgentRun({automatic:true});
      else clearAgentPoll();
      if (tabName === "books") document.dispatchEvent(new Event("books-open"));
      if (scrollTargetId) setTimeout(() => {
        const target = $("#" + scrollTargetId);
        if (target && !target.hidden) target.scrollIntoView({behavior:"smooth",block:"start"});
      }, 120);
    }
    $("#tab-overview").addEventListener("click", () => selectAppTab("overview"));
    $("#tab-matching").addEventListener("click", () => selectAppTab("matching"));
    $("#tab-agent").addEventListener("click", () => selectAppTab("agent"));
    $("#tab-books").addEventListener("click", () => selectAppTab("books"));
    function navigateWorkspace(destination, sourceId = "") {
      if (destination === "overview") return selectAppTab("overview", sourceId || "tab-overview");
      if (destination === "matching") return selectAppTab("matching", sourceId || "tab-matching");
      if (destination === "plan") {
        const state = currentMatchingState;
        const target = state?.team?.status === "active" ? "matching-task-section" : state?.team ? "matching-team" : state?.profile ? "matching-waiting" : "matching-form";
        return selectAppTab("matching", sourceId || "nav-plan", target);
      }
      if (destination === "agent-team") return selectAppTab("agent", sourceId || "nav-agent-team", currentAgentRun ? "agent-run-panel" : "goal-form");
      if (destination === "deliverables") return selectAppTab("agent", sourceId || "nav-deliverables", "workbuddy-lookup-form");
      if (destination === "agent") return selectAppTab("agent", sourceId || "tab-agent", "goal-form");
      if (destination === "books") return selectAppTab("books", sourceId || "tab-books");
    }
    document.querySelectorAll("[data-workspace-destination]").forEach(button => button.addEventListener("click", () => navigateWorkspace(button.dataset.workspaceDestination, button.id)));

    async function checkAgentBackend() {
      const button = $("#health-retry");
      const status = $("#health-status");
      button.disabled = true;
      status.className = "backend-status";
      status.textContent = "Checking…";
      $("#health-message").textContent = "Checking the backend. Its free service may need time to wake.";
      try {
        await requestAgentJSON(apiURL("/api/health"));
        status.className = "backend-status online";
        status.textContent = "Reachable";
        $("#health-message").textContent = "GET /api/health returned successfully.";
      } catch (error) {
        status.className = "backend-status offline";
        status.textContent = "Not reachable";
        $("#health-message").textContent = error.message || "Could not reach the backend. Check again or retry later.";
      } finally {
        button.disabled = false;
        renderOverview();
      }
    }
    $("#agent-api-base").textContent = AGENT_API_BASE_URL;
    $("#health-retry").addEventListener("click", checkAgentBackend);

    function renderAgentRun() {
      const run = currentAgentRun;
      if (!run) return;
      $("#agent-run-panel").hidden = false;
      $("#run-id").textContent = String(run.runId);
      const documents = [run.resultsData, run.statusData, run.goalResponse];
      const overallStatus = firstReturnedField([run.statusData, run.goalResponse, run.resultsData], "status");
      $("#run-status").textContent = displayApiValue(overallStatus);
      $("#run-provider").textContent = displayApiValue(firstReturnedField(documents, "provider"));
      $("#run-provider-note").textContent = displayApiValue(firstReturnedField(documents, "providerNote"));
      $("#agent-results").innerHTML = AGENT_KEYS.map((key) => {
        let value = agentValueFrom(run.resultsData, key);
        if (value === undefined) value = agentValueFrom(run.statusData, key);
        if (value === undefined) value = agentValueFrom(run.goalResponse, key);
        const statusValue = agentStatusFrom([run.statusData, run.resultsData, run.goalResponse], key, value);
        const statusText = statusValue === undefined ? "Status not returned by backend" : displayApiValue(statusValue);
        return "<article class=\"agent-result\"><div class=\"agent-result-head\"><h4>" + escapeHTML(key) + "</h4><span class=\"agent-status-pill\">" + escapeHTML(statusText) + "</span></div>" + renderApiFields(value, "No result returned for this agent yet.") + "</article>";
      }).join("");

      const recommendation = firstReturnedField([run.resultsData, run.statusData, run.goalResponse], "recommendation");
      if (recommendation !== undefined) run.recommendation = recommendation;
      $("#recommendation-content").innerHTML = renderApiFields(run.recommendation, "No recommendation has been returned yet.");
      const events = Array.isArray(run.statusData?.events) ? run.statusData.events : [];
      const eventList = $("#run-progress-events");
      eventList.innerHTML = events.length ? events.map((entry) => {
        const source = entry?.source === "workbuddy" ? "WorkBuddy" : "OnlySkills";
        const detail = entry?.detail || entry?.step || "Progress update";
        const when = entry?.at ? new Date(entry.at).toLocaleTimeString() : "";
        return '<li><strong>' + escapeHTML(source) + '</strong><span>' + escapeHTML(entry?.step || "Update") + ': ' + escapeHTML(detail) + '</span>' + (when ? '<time>' + escapeHTML(when) + '</time>' : '') + '</li>';
      }).join("") : '<li class="agent-empty">Waiting for the first update.</li>';
      const normalizedStatus = String(overallStatus || "").toLowerCase();
      const hints = {
        queued: "Your goal is in the queue. WorkBuddy will start when its worker is connected and waiting.",
        running: "WorkBuddy has claimed the goal. This page checks for progress automatically.",
        awaiting_approval: "WorkBuddy has submitted results. Review them below and choose Approve or Reject.",
        approved: "You approved the recommendation.",
        rejected: "You rejected the recommendation.",
        failed: "The workflow stopped before completion. See the error above and submit again if needed."
      };
      $("#run-worker-hint").textContent = hints[normalizedStatus] || "OnlySkills will show progress after WorkBuddy claims the goal.";
      const actionId = run.recommendation && typeof run.recommendation === "object" ? run.recommendation.actionId : undefined;
      const canDecide = actionId !== undefined && actionId !== null && String(actionId).length > 0 && !run.decisionRecorded;
      $("#approve-recommendation").disabled = !canDecide || agentDecisionBusy;
      $("#reject-recommendation").disabled = !canDecide || agentDecisionBusy;
      $("#refresh-agent-run").disabled = agentRefreshBusy;
    }

    function clearAgentPoll() {
      if (agentPollTimer) clearTimeout(agentPollTimer);
      agentPollTimer = null;
    }
    function scheduleAgentPoll(run) {
      clearAgentPoll();
      if (!run || run !== currentAgentRun || $("#agent-page").hidden) return;
      const status = String(run.statusData?.status || run.goalResponse?.status || "").toLowerCase();
      if (TERMINAL_AGENT_STATUSES.has(status)) return;
      agentPollTimer = setTimeout(() => refreshAgentRun({automatic:true}), AGENT_POLL_INTERVAL_MS);
    }
    async function refreshAgentRun(options = {}) {
      if (!currentAgentRun || agentRefreshBusy) return;
      const run = currentAgentRun;
      if (!run.statusUrl) {
        showError("run-error", "The backend did not return a status URL for this goal.");
        return;
      }
      clearAgentPoll();
      agentRefreshBusy = true;
      if (!options.automatic) $("#run-refresh-message").textContent = "Checking the queue…";
      showError("run-error", "");
      renderAgentRun();
      try {
        run.statusData = await requestAgentJSON(apiURL(run.statusUrl));
        run.resultsData = run.statusData?.result || null;
        if (run.statusData?.recommendation) run.recommendation = run.statusData.recommendation;
        renderAgentRun();
        const status = String(run.statusData?.status || "").toLowerCase();
        $("#run-refresh-message").textContent = status === "queued"
          ? "Goal queued in OnlySkills. Waiting for the WorkBuddy worker."
          : status === "running"
            ? "WorkBuddy is working. Checking for the next update automatically."
            : "Latest run update received at " + new Date().toLocaleTimeString() + ".";
        if (status === "failed") showError("run-error", run.statusData.error || "The workflow failed before producing results.");
      } catch (error) {
        showError("run-error", error.message || "Could not refresh this run. The page will retry automatically.");
        $("#run-refresh-message").textContent = "Could not reach the run status. Retrying automatically while this page stays open.";
      } finally {
        agentRefreshBusy = false;
        renderAgentRun();
        scheduleAgentPoll(run);
      }
    }
    $("#refresh-agent-run").addEventListener("click", refreshAgentRun);

    function workBuddyDocuments(data) {
      const documents = [];
      const pending = [{value:data, depth:0}];
      const visited = new Set();
      while (pending.length) {
        const {value, depth} = pending.shift();
        if (!value || typeof value !== "object" || Array.isArray(value) || visited.has(value)) continue;
        visited.add(value);
        documents.push(value);
        if (depth >= 4) continue;
        for (const key of ["data", "result", "results", "run", "output", "payload"]) {
          if (value[key] && typeof value[key] === "object" && !Array.isArray(value[key])) pending.push({value:value[key], depth:depth + 1});
        }
      }
      return documents;
    }
    function workBuddyField(documents, keys) {
      for (const documentData of documents) {
        for (const key of keys) {
          if (Object.prototype.hasOwnProperty.call(documentData, key) && documentData[key] !== undefined && documentData[key] !== null) return documentData[key];
        }
      }
      return undefined;
    }
    function renderWorkBuddyArtifacts(value) {
      if (value === undefined) return renderApiFields(undefined, "No artifacts were returned by the backend.");
      const artifacts = Array.isArray(value) ? value : [value];
      if (!artifacts.length) return '<p class="agent-empty">No artifacts were returned by the backend.</p>';
      return artifacts.map((artifact, index) => {
        if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) return '<article class="workbuddy-artifact">' + renderApiValue(artifact) + '</article>';
        const title = workBuddyField([artifact], ["title", "artifactTitle", "name"]);
        const location = workBuddyField([artifact], ["location", "artifactLocation", "path", "url", "uri"]);
        return '<article class="workbuddy-artifact"><h4>Artifact ' + (index + 1) + '</h4><dl class="agent-fields"><div><dt>Title</dt><dd>' + (title === undefined ? 'Not returned by backend' : renderApiValue(title)) + '</dd></div><div><dt>Location</dt><dd>' + (location === undefined ? 'Not returned by backend' : renderApiValue(location)) + '</dd></div></dl><details><summary class="agent-meta-label">All returned artifact fields</summary>' + renderApiFields(artifact, "No additional artifact fields were returned.") + '</details></article>';
      }).join("");
    }
    function renderWorkBuddyResults(data, queriedRunId) {
      const documents = workBuddyDocuments(data);
      const runId = workBuddyField(documents, ["runId", "run_id"]);
      const status = workBuddyField(documents, ["status", "runStatus", "run_status"]);
      const goal = workBuddyField(documents, ["goal"]);
      const recommendation = workBuddyField(documents, ["recommendation"]);
      const artifacts = workBuddyField(documents, ["artifacts"]);
      const validation = workBuddyField(documents, ["validationStatus", "validation_status", "validation", "validationResult", "validationResults", "isValid", "is_valid"]);
      $("#workbuddy-run-id").textContent = String(runId ?? queriedRunId);
      $("#workbuddy-run-status").textContent = displayApiValue(status);
      $("#workbuddy-run-goal").innerHTML = renderApiFields(goal, "No goal was returned by the backend.");
      $("#workbuddy-agent-results").innerHTML = AGENT_KEYS.map((key) => {
        let result;
        for (const documentData of documents) {
          result = agentValueFrom(documentData, key);
          if (result !== undefined) break;
        }
        const agentStatus = agentStatusFrom(documents, key, result);
        const statusText = agentStatus === undefined ? "Status not returned by backend" : displayApiValue(agentStatus);
        return '<article class="agent-result"><div class="agent-result-head"><h4>' + escapeHTML(key) + '</h4><span class="agent-status-pill">' + escapeHTML(statusText) + '</span></div>' + renderApiFields(result, "No result returned for this agent.") + '</article>';
      }).join("");
      $("#workbuddy-recommendation").innerHTML = renderApiFields(recommendation, "No recommendation was returned by the backend.");
      $("#workbuddy-artifacts").innerHTML = renderWorkBuddyArtifacts(artifacts);
      $("#workbuddy-validation").innerHTML = renderApiFields(validation, "No validation status was returned by the backend.");
    }
    const workBuddyRunIdInput = $("#workbuddy-lookup-form").elements.runId;
    workBuddyRunIdInput.addEventListener("invalid", () => showError("workbuddy-lookup-error", "Enter a run ID to look up WorkBuddy results."));
    workBuddyRunIdInput.addEventListener("input", () => showError("workbuddy-lookup-error", ""));
    $("#workbuddy-lookup-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (workBuddyLookupBusy) return;
      const form = event.currentTarget;
      const runId = String(new FormData(form).get("runId") || "").trim();
      if (!runId) { showError("workbuddy-lookup-error", "Enter a run ID to look up WorkBuddy results."); return; }
      workBuddyLookupBusy = true;
      const button = $("#workbuddy-lookup-submit");
      button.disabled = true;
      button.innerHTML = '<span class="spinner"></span>Looking up…';
      $("#workbuddy-results-panel").hidden = true;
      $("#workbuddy-lookup-status").textContent = "Fetching existing results…";
      showError("workbuddy-lookup-error", "");
      try {
        const data = await lookupWorkBuddyResults(runId, requestAgentJSON, apiURL);
        renderWorkBuddyResults(data, runId);
        $("#workbuddy-results-panel").hidden = false;
        $("#workbuddy-lookup-status").textContent = "Existing WorkBuddy results loaded.";
      } catch (error) {
        $("#workbuddy-lookup-status").textContent = "";
        showError("workbuddy-lookup-error", error.message || "Could not look up this run. Check the run ID and retry.");
      } finally {
        workBuddyLookupBusy = false;
        button.disabled = false;
        button.textContent = "Look up results";
      }
    });

    async function submitGoalPayload(payload) {
      if (goalSubmitBusy) return;
      goalSubmitBusy = true;
      lastGoalPayload = payload;
      $("#goal-submit").disabled = true;
      $("#goal-submit").innerHTML = '<span class="spinner"></span>Starting workflow…';
      $("#goal-retry").hidden = true;
      $("#agent-run-panel").hidden = true;
      currentAgentRun = null;
      showError("goal-error", "");
      showError("run-error", "");
      showError("decision-error", "");
      $("#decision-result").hidden = true;
      try {
        const messageParts = ["Goal: " + payload.goal];
        if (payload.productDescription) messageParts.push("Product description: " + payload.productDescription);
        if (payload.targetCustomer) messageParts.push("Target customer: " + payload.targetCustomer);
        const queuePayload = {message:messageParts.join("\n")};
        if (payload.budget !== undefined) queuePayload.budget = payload.budget;
        if (payload.currency) queuePayload.currency = payload.currency;
        const response = await requestAgentJSON(apiURL("/api/chat"), {
          method:"POST",
          headers:{"content-type":"application/json","accept":"application/json"},
          body:JSON.stringify(queuePayload),
        });
        if (!response || typeof response !== "object" || response.runId === undefined || response.runId === null || typeof response.statusUrl !== "string") {
          throw new Error("The queue response did not include a runId and status URL. Check the backend response and retry if needed.");
        }
        currentAgentRun = {
          runId:response.runId,
          statusUrl:response.statusUrl,
          resultsUrl:response.resultsUrl,
          recommendation:null,
          goalResponse:{...response,provider:"workbuddy_mcp",providerNote:response.message || "Queued for WorkBuddy Desktop to process."},
          statusData:null,
          resultsData:null,
          decisionRecorded:false,
        };
        lastGoalPayload = null;
        $("#agent-run-panel").hidden = false;
        $("#run-refresh-message").textContent = "Goal queued in OnlySkills. Waiting for the WorkBuddy worker.";
        renderAgentRun();
        await refreshAgentRun();
      } catch (error) {
        showError("goal-error", error.message || "Could not submit the goal. Please retry.");
        $("#goal-retry").hidden = !lastGoalPayload;
      } finally {
        goalSubmitBusy = false;
        $("#goal-submit").disabled = false;
        $("#goal-submit").textContent = "Run goal workflow";
      }
    }
    $("#goal-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const goal = String(values.get("goal") || "").trim();
      if (!goal) { showError("goal-error", "Enter a goal before submitting."); return; }
      const payload = { goal };
      const budgetText = String(values.get("budget") || "").trim();
      if (budgetText) {
        const budget = Number(budgetText);
        if (!Number.isFinite(budget) || budget < 0) { showError("goal-error", "Budget must be a non-negative number."); return; }
        payload.budget = budget;
      }
      for (const field of ["currency", "productDescription", "targetCustomer"]) {
        const value = String(values.get(field) || "").trim();
        if (value) payload[field] = value;
      }
      submitGoalPayload(payload);
    });
    $("#goal-form").addEventListener("input", () => {
      if (!goalSubmitBusy && lastGoalPayload) {
        lastGoalPayload = null;
        $("#goal-retry").hidden = true;
        showError("goal-error", "");
      }
    });
    $("#goal-retry").addEventListener("click", () => {
      if (lastGoalPayload) submitGoalPayload(lastGoalPayload);
    });

    async function recordRecommendationDecision(approved) {
      const run = currentAgentRun;
      if (!run || agentDecisionBusy) return;
      const actionId = run.recommendation && typeof run.recommendation === "object" ? run.recommendation.actionId : undefined;
      if (actionId === undefined || actionId === null) return;
      agentDecisionBusy = true;
      $("#decision-result").hidden = true;
      $("#decision-loading").hidden = false;
      showError("decision-error", "");
      renderAgentRun();
      try {
        const response = await requestAgentJSON(apiURL("/api/approve"), {
          method:"POST",
          headers:{"content-type":"application/json","accept":"application/json"},
          body:JSON.stringify({runId:run.runId,actionId:actionId,approved:approved}),
        });
        const result = $("#decision-result");
        const statusText = displayApiValue(response?.status);
        const messageText = displayApiValue(response?.message);
        result.innerHTML = "<strong>Status:</strong> " + escapeHTML(statusText) + "<br><strong>Message:</strong> " + escapeHTML(messageText) + "<div>" + renderApiFields(response, "The backend returned no additional response fields.") + "</div>";
        result.classList.remove("error-result");
        result.hidden = false;
        run.decisionRecorded = true;
        if (run.statusData) run.statusData = {...run.statusData,status:response?.status || (approved ? "approved" : "rejected")};
      } catch (error) {
        showError("decision-error", error.message || "Could not record the decision. Please retry.");
      } finally {
        agentDecisionBusy = false;
        $("#decision-loading").hidden = true;
        renderAgentRun();
      }
    }
    $("#approve-recommendation").addEventListener("click", () => recordRecommendationDecision(true));
    $("#reject-recommendation").addEventListener("click", () => recordRecommendationDecision(false));

    __BOOKS_SCRIPT__
    refreshMatching();
    setInterval(() => { if (!$("#matching-page").hidden) refreshMatching(); }, 5000);
    checkAgentBackend();
  </script>
</body>
</html>`;

function renderPage(env) {
  let apiBaseUrl = DEFAULT_AGENT_API_BASE_URL;
  const configured = typeof env?.ONLYSKILLS_API_BASE_URL === "string" ? env.ONLYSKILLS_API_BASE_URL.trim() : "";
  if (configured) {
    try {
      const parsed = new URL(configured);
      const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase());
      if (["https:", "http:"].includes(parsed.protocol) && !isLocalhost && !parsed.username && !parsed.password && !parsed.search && !parsed.hash) {
        apiBaseUrl = parsed.origin;
      }
    } catch (_) {}
  }
  const serializedApiBase = JSON.stringify(apiBaseUrl).replace(/[<>&]/g, (char) => ({"<":"\\u003c",">":"\\u003e","&":"\\u0026"}[char]));
  return PAGE.replace("__AGENT_API_BASE_URL_JSON__", () => serializedApiBase).replace("__WORKBUDDY_LOOKUP_FUNCTION__", () => "(" + lookupWorkBuddyResults.toString() + ")").replace("__CHECKLIST_SCRIPT__", () => CHECKLIST_SCRIPT).replace("__BOOKS_CSS__", () => BOOKS_CSS).replace("__BOOKS_HTML__", () => BOOKS_HTML).replace("__BOOKS_SCRIPT__", () => BOOKS_SCRIPT);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

function validDeviceId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function expireIfIdle(db) {
  const latest = await db.prepare("SELECT MAX(joined_at) AS latest FROM demo_members").first();
  if (latest?.latest && Date.now() - Number(latest.latest) > SESSION_TTL_MS) {
    await db.prepare("DELETE FROM demo_group_messages WHERE group_id IN (SELECT group_id FROM demo_members)").run();
    await db.prepare("DELETE FROM demo_members").run();
  }
}

async function readTeam(db, deviceId = "") {
  await expireIfIdle(db);
  const result = await db.prepare("SELECT role, device_id, display_name, product_name, joined_at, group_id FROM demo_members ORDER BY role").all();
  const rows = result.results || [];
  let groupId = rows.find((row) => row.group_id)?.group_id || "";
  if (rows.length && !groupId) groupId = crypto.randomUUID();
  if (groupId && rows.some((row) => !row.group_id)) {
    await db.prepare("UPDATE demo_members SET group_id = ? WHERE group_id = ''").bind(groupId).run();
    for (const row of rows) if (!row.group_id) row.group_id = groupId;
  }
  const members = rows.map((row) => ({ role: row.role, name: row.display_name }));
  const creator = rows.find((row) => row.role === "Product Creator");
  const yourRole = rows.find((row) => row.device_id === deviceId)?.role || "";
  const matched = members.length === 3 && ROLES.every((role) => members.some((member) => member.role === role)) && Boolean(creator?.product_name);
  const messagesResult = matched && yourRole
    ? await db.prepare(`
      SELECT m.id, m.device_id, m.body, m.created_at, dm.display_name
      FROM demo_group_messages m JOIN demo_members dm ON dm.device_id = m.device_id
      WHERE m.group_id = ?
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 100
    `).bind(groupId).all()
    : { results: [] };
  const messages = (messagesResult.results || []).reverse().map((row) => ({
    id: row.id,
    name: row.display_name,
    body: row.body,
    createdAt: Number(row.created_at),
    isMine: row.device_id === deviceId,
  }));
  return { members, count: members.length, matched, productName: creator?.product_name || "", yourRole, messages };
}

async function joinTeam(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: "Enter your name and position to join." }, 400); }
  const deviceId = body?.deviceId;
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim().replace(/\s+/g, " ") : "";
  const role = body?.role;
  const productName = typeof body?.productName === "string" ? body.productName.trim().replace(/\s+/g, " ") : "";
  if (!validDeviceId(deviceId)) return json({ error: "This phone session could not be identified. Refresh and try again." }, 400);
  if (!displayName || displayName.length > 40 || /[\u0000-\u001f\u007f]/.test(displayName)) return json({ error: "Enter a name between 1 and 40 characters." }, 400);
  if (!ROLES.includes(role)) return json({ error: "Choose one of the three positions." }, 400);
  if (role === "Product Creator" && (!productName || productName.length > 60 || /[\u0000-\u001f\u007f]/.test(productName))) return json({ error: "Enter a product name between 1 and 60 characters." }, 400);

  await expireIfIdle(env.DB);
  const existing = await env.DB.prepare("SELECT role, group_id FROM demo_members WHERE device_id = ?").bind(deviceId).first();
  const currentGroup = await env.DB.prepare("SELECT group_id FROM demo_members WHERE group_id != '' LIMIT 1").first();
  const groupId = existing?.group_id || currentGroup?.group_id || crypto.randomUUID();
  if (!existing?.group_id && !currentGroup?.group_id) {
    await env.DB.prepare("UPDATE demo_members SET group_id = ? WHERE group_id = ''").bind(groupId).run();
  }
  const occupied = await env.DB.prepare("SELECT device_id FROM demo_members WHERE role = ?").bind(role).first();
  if (occupied && occupied.device_id !== deviceId) return json({ error: role + " is already taken. Choose another position." }, 409);

  try {
    if (existing) {
      await env.DB.prepare("UPDATE demo_members SET role = ?, display_name = ?, product_name = ?, joined_at = ?, group_id = ? WHERE device_id = ?").bind(role, displayName, role === "Product Creator" ? productName : "", Date.now(), groupId, deviceId).run();
    } else {
      await env.DB.prepare("INSERT INTO demo_members (role, device_id, display_name, product_name, joined_at, group_id) VALUES (?, ?, ?, ?, ?, ?)").bind(role, deviceId, displayName, role === "Product Creator" ? productName : "", Date.now(), groupId).run();
    }
  } catch (_) {
    return json({ error: "That position was just taken. Choose another available position." }, 409);
  }
  return json(await readTeam(env.DB, deviceId));
}

async function postDemoGroupMessage(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: "Write a message before sending it." }, 400); }
  const deviceId = body?.deviceId;
  const message = typeof body?.message === "string" ? body.message.replace(/\r\n?/g, "\n").trim() : "";
  if (!validDeviceId(deviceId)) return json({ error: "This phone session could not be identified. Refresh and try again." }, 400);
  if (!message || message.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) {
    return json({ error: "Messages must be 1–1,000 characters." }, 400);
  }
  const inserted = await env.DB.prepare(`
    INSERT INTO demo_group_messages (id, group_id, device_id, body, created_at)
    SELECT ?, dm.group_id, dm.device_id, ?, ?
    FROM demo_members dm
    WHERE dm.device_id = ? AND dm.group_id != ''
      AND (SELECT COUNT(*) FROM demo_members members WHERE members.group_id = dm.group_id) = 3
      AND (SELECT COUNT(*) FROM demo_members members WHERE members.group_id = dm.group_id AND members.role IN ('Product Creator', 'Marketing', 'Sales')) = 3
      AND EXISTS (SELECT 1 FROM demo_members creator WHERE creator.group_id = dm.group_id AND creator.role = 'Product Creator' AND creator.product_name != '')
    LIMIT 1
  `).bind(crypto.randomUUID(), message, Date.now(), deviceId).run();
  if (!inserted?.meta?.changes) return json({ error: "Only members of the active three-person team can use this group." }, 409);
  return json(await readTeam(env.DB, deviceId));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/assets/")) {
      const asset = serveBooksVendor(url.pathname, request.method);
      return asset || new Response("Asset not found. Build the app before previewing OCR.", {status:404});
    }
    if (url.pathname === "/" && request.method === "GET") return new Response(renderPage(env), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" } });
    if (!env.DB) return json({ error: "The shared team database is not connected yet." }, 503);
    try {
      if (url.pathname.startsWith("/api/books/")) return await handleBookkeepingRoute(request, env, url);
      if (url.pathname.startsWith("/api/matching/")) return await handleMatchingRoute(request, env, url);
      if (url.pathname === "/api/state" && request.method === "GET") {
        const deviceId = url.searchParams.get("device") || "";
        return json(await readTeam(env.DB, validDeviceId(deviceId) ? deviceId : ""));
      }
      if (url.pathname === "/api/join" && request.method === "POST") return await joinTeam(request, env);
      if (url.pathname === "/api/group/message" && request.method === "POST") return await postDemoGroupMessage(request, env);
      if (url.pathname.startsWith("/api/")) return json({ error: "Endpoint not found." }, 404);
      return new Response("Not found", { status: 404 });
    } catch (_) {
      return json({ error: "The shared team could not be loaded. Please try again." }, 503);
    }
  },
};
