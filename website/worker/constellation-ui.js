const svg = (content) => '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + content + '</svg>';

export const ROLE_ICONS = {
  "Product Creator": svg('<path d="M32 10 51 21v22L32 54 13 43V21Z"/><path d="m13 21 19 11 19-11M32 32v22M23 16l19 11v11"/><path d="M32 3v3M57 16l-3 2M10 48l-3 2"/><circle cx="32" cy="32" r="3" fill="currentColor" stroke="none"/>'),
  Marketing: svg('<path d="M12 29c10 0 19-6 31-15v36C31 41 22 35 12 35Z"/><path d="M12 29v6M23 38l4 13h7l-5-12M49 21l5-4M51 32h8M49 43l5 4"/><path d="M38 18v29"/><circle cx="8" cy="32" r="3"/>'),
  Sales: svg('<path d="M26 39 17 48a10 10 0 0 1-14-14l13-13a10 10 0 0 1 14 0" transform="translate(8 -3)"/><path d="m38 25 9-9a10 10 0 0 1 14 14L48 43a10 10 0 0 1-14 0" transform="translate(-8 3)"/><path d="m23 41 18-18M48 48l4 4M12 12l4 4"/><circle cx="32" cy="32" r="3" fill="currentColor" stroke="none"/>'),
};

export function clampMapNode(position, width, height, nodeWidth, nodeHeight) {
  const marginX = Math.min(.5, (nodeWidth / 2 + 8) / Math.max(1, width));
  const marginY = Math.min(.5, (nodeHeight / 2 + 8) / Math.max(1, height));
  const x = Number.isFinite(position?.x) ? position.x : .5;
  const y = Number.isFinite(position?.y) ? position.y : .5;
  return { x: Math.max(marginX, Math.min(1 - marginX, x)), y: Math.max(marginY, Math.min(1 - marginY, y)) };
}

export function mapConnector(from, to, bend = 0) {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (Math.hypot(dx, dy) < 1) return 'M ' + from.x.toFixed(2) + ' ' + from.y.toFixed(2);
  const distance = Math.hypot(dx, dy) || 1;
  const edge = (node, direction) => {
    const radiusX = Math.max(1, node.width / 2), radiusY = Math.max(1, node.height / 2);
    const scale = 1 / Math.sqrt((dx / radiusX) ** 2 + (dy / radiusY) ** 2);
    return { x: node.x + dx * scale * direction, y: node.y + dy * scale * direction };
  };
  const start = edge(from, 1), end = edge(to, -1);
  const offset = Math.min(64, distance * .16) * bend;
  const cx = (start.x + end.x) / 2 - dy / distance * offset;
  const cy = (start.y + end.y) / 2 + dx / distance * offset;
  return 'M ' + start.x.toFixed(2) + ' ' + start.y.toFixed(2) + ' Q ' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ' ' + end.x.toFixed(2) + ' ' + end.y.toFixed(2);
}

export function constellationSearchState(state) {
  if (state?.team?.status === "active") return { scanning: false, label: "Your three-person team is connected", mode: "connected" };
  if (state?.team) return { scanning: false, label: "Potential team found. Review your invitation", mode: "invited" };
  if (!state?.profile) return { scanning: false, label: "Add your profile to scan potential teammates", mode: "ready" };
  if (state.profile.matchOptIn === false) return { scanning: false, label: "Matching paused. Resubmit your profile to scan", mode: "paused" };
  const count = Object.values(state.availableCounts || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  return { scanning: true, label: "Scanning the matching pool · " + count + " available profile" + (count === 1 ? "" : "s"), mode: "scanning" };
}

export const CONSTELLATION_CSS = String.raw`
    @font-face{font-family:"OnlySkill Display";src:url("/assets/barlow-condensed-semibold.ttf") format("truetype");font-weight:600;font-style:normal;font-display:swap}
    @font-face{font-family:"OnlySkill Script";src:url("/assets/instrument-serif-italic.ttf") format("truetype");font-weight:400;font-style:italic;font-display:swap}
    body.constellation-theme{--font-display:"OnlySkill Display","Arial Narrow",sans-serif;--font-script:"OnlySkill Script",Georgia,serif}
    body.constellation-theme .hero h1{font:600 clamp(3rem,5.7vw,5.5rem)/1 var(--font-display);letter-spacing:-.025em;max-width:820px;margin:10px 0 22px}
    body.constellation-theme .hero h1>span,body.constellation-theme .hero h1>em{display:block}
    body.constellation-theme .hero h1>em{font:italic 400 1.13em/.94 var(--font-script);letter-spacing:-.025em;color:var(--role-marketing);padding-bottom:.05em}
    body.constellation-theme .role-choice::before{display:none}
    body.constellation-theme .role-choice input{position:absolute;top:13px;right:13px}
    body.constellation-theme .role-choice .role-icon{position:absolute;top:10px;right:36px;width:48px;height:48px;display:grid;place-items:center;color:var(--choice-color)}
    .role-icon svg{width:100%;height:100%}
    body.constellation-theme .constellation-panel{position:relative;container-type:inline-size;margin:22px 0 16px;padding:24px 20px 17px;border:1px solid rgba(209,190,173,.58);border-radius:30px 18px 29px 19px;background:radial-gradient(ellipse at 14% 18%,rgba(243,204,180,.19),transparent 36%),radial-gradient(ellipse at 87% 80%,rgba(183,205,190,.19),transparent 33%),rgba(255,250,245,.78);overflow:hidden}
    body.constellation-theme .constellation-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;position:relative;z-index:1}
    body.constellation-theme .constellation-heading h2{margin:0;color:var(--ink);font:600 1.65rem/1.1 var(--font-display)}
    body.constellation-theme .constellation-heading p{max-width:48ch;margin:5px 0 0;color:#74675d;font-size:.75rem;line-height:1.5}
    body.constellation-theme .constellation-heading .secondary{flex:none;min-height:36px;font-size:.7rem;padding:8px 12px}
    body.constellation-theme .visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    body.constellation-theme .constellation-map{position:relative;display:block;height:540px;min-height:540px;isolation:isolate;touch-action:pan-y}
    body.constellation-theme .constellation-lines{position:absolute;inset:0;width:100%;height:100%;z-index:0;overflow:visible;pointer-events:none}
    body.constellation-theme .constellation-lines path{fill:none;stroke-width:1.5;stroke-linecap:round;opacity:.7;transition:opacity .2s,stroke-width .2s}
    body.constellation-theme .constellation-line-product{stroke:var(--role-product)}
    body.constellation-theme .constellation-line-marketing{stroke:var(--role-marketing)}
    body.constellation-theme .constellation-line-sales{stroke:var(--role-sales)}
    body.constellation-theme .constellation-lines path.is-highlighted{stroke-width:2.5;opacity:1}
    body.constellation-theme .constellation-line-product.is-highlighted{filter:drop-shadow(0 0 4px rgba(183,57,39,.42))}
    body.constellation-theme .constellation-line-marketing.is-highlighted{filter:drop-shadow(0 0 4px rgba(23,103,93,.42))}
    body.constellation-theme .constellation-line-sales.is-highlighted{filter:drop-shadow(0 0 4px rgba(52,85,180,.4))}
    body.constellation-theme [data-map-node]{position:absolute;left:0;top:0;z-index:2;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;outline-offset:5px}
    body.constellation-theme [data-map-node]:focus-visible{outline:2px solid var(--branch-color,var(--role-marketing))}
    body.constellation-theme [data-map-node].is-dragging{z-index:5;cursor:grabbing;transition:none;will-change:transform;filter:drop-shadow(0 15px 14px rgba(84,64,45,.13))}
    body.constellation-theme .constellation-idea{display:flex;width:210px;min-height:210px;flex-direction:column;align-items:center;justify-content:center;padding:22px 20px;border:1px solid #c8a990;border-radius:46% 44% 42% 39% / 39% 41% 46% 48%;background:radial-gradient(ellipse at var(--idea-x,50%) var(--idea-y,35%),rgba(255,250,245,.78),transparent 48%),#ead9c8;text-align:center}
    body.constellation-theme .constellation-idea-mark{width:38px;height:38px;margin-bottom:8px;color:#1b776e}
    body.constellation-theme .constellation-idea-mark svg{width:100%;height:100%}
    body.constellation-theme .constellation-idea .eyebrow{color:#78604e;font-size:.58rem;letter-spacing:.06em}
    body.constellation-theme .constellation-idea strong{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;max-width:20ch;margin:8px 0;color:#352f29;font:600 1.35rem/1.2 var(--font-display);overflow-wrap:anywhere}
    body.constellation-theme .constellation-idea p{margin:0;color:#756252;font-size:.7rem;line-height:1.5}
    body.constellation-theme [data-role="Product Creator"]{--branch-color:var(--role-product);--orbit-wash:#f4e2da;--node-tilt:-3deg}
    body.constellation-theme [data-role="Marketing"]{--branch-color:var(--role-marketing);--orbit-wash:#e5ece3;--node-tilt:3deg}
    body.constellation-theme [data-role="Sales"]{--branch-color:var(--role-sales);--orbit-wash:#e7e8f1;--node-tilt:-2deg}
    body.constellation-theme .constellation-orb{display:flex;width:146px;min-height:146px;flex-direction:column;align-items:center;justify-content:center;padding:15px 11px;border:1px solid rgba(255,255,255,.42);border-radius:43% 49% 41% 46% / 40% 44% 47% 52%;background:radial-gradient(circle at var(--orb-x,50%) var(--orb-y,30%),rgba(255,255,255,.58),transparent 50%),var(--orbit-wash);color:var(--branch-color);text-align:center;transition:border-radius .3s,box-shadow .3s;box-shadow:0 8px 25px rgba(90,69,52,.04)}
    body.constellation-theme .constellation-orb:hover{border-radius:51% 43% 48% 41% / 45% 52% 40% 48%;box-shadow:0 12px 32px color-mix(in srgb,var(--branch-color) 14%,transparent)}
    body.constellation-theme .constellation-orb[data-role="Marketing"]{border-radius:47% 41% 46% 43% / 44% 40% 51% 48%}
    body.constellation-theme .constellation-orb[data-role="Sales"]{border-radius:42% 49% 44% 46% / 48% 45% 39% 51%}
    body.constellation-theme .constellation-symbol{display:block;width:49px;height:49px;margin-bottom:5px}
    body.constellation-theme .constellation-symbol svg{width:100%;height:100%;transition:transform .2s}
    body.constellation-theme .constellation-orb:hover .constellation-symbol svg{transform:rotate(-5deg)}
    body.constellation-theme .constellation-orb strong{font:600 1.2rem/1.1 var(--font-display)}
    body.constellation-theme .constellation-orb small{margin-top:7px;color:#6d625a;font-size:.6rem;line-height:1.4}
    body.constellation-theme .constellation-member{width:190px;min-height:112px;padding:15px 16px;border:1px solid #d1bead;border-radius:24px 18px 23px 17px;background:radial-gradient(150px circle at var(--card-x,50%) var(--card-y,0%),color-mix(in srgb,var(--branch-color) 12%,white),transparent 82%),rgba(255,251,247,.96);transition:border-radius .2s,box-shadow .2s}
    body.constellation-theme .constellation-member:hover{border-radius:18px 25px 17px 26px;box-shadow:0 10px 26px rgba(77,63,50,.08)}
    body.constellation-theme .constellation-member small,body.constellation-theme .constellation-member strong{display:block;overflow-wrap:anywhere}
    body.constellation-theme .constellation-member small{color:var(--branch-color);font-size:.59rem;line-height:1.4;font-weight:600}
    body.constellation-theme .constellation-member strong{margin:6px 0 5px;color:#39332d;font-size:.87rem;line-height:1.3;font-weight:650}
    body.constellation-theme .constellation-member p{margin:0;color:#71655b;font-size:.68rem;line-height:1.5;overflow-wrap:anywhere}
    body.constellation-theme .constellation-radar{position:absolute;left:47%;top:50%;width:min(430px,70%);aspect-ratio:1;transform:translate(-50%,-50%);border:1px solid rgba(23,103,93,.09);border-radius:50%;z-index:-1;pointer-events:none}
    body.constellation-theme .constellation-radar::before,body.constellation-theme .constellation-radar::after{content:"";position:absolute;border:1px solid rgba(23,103,93,.09);border-radius:50%;inset:13%}
    body.constellation-theme .constellation-radar::after{inset:28%}
    body.constellation-theme .radar-sweep{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,transparent 0deg,transparent 275deg,rgba(23,103,93,.012) 280deg,rgba(23,103,93,.14) 359deg,transparent 360deg);opacity:0;animation:teammate-radar 8s linear infinite;animation-play-state:paused}
    body.constellation-theme .constellation-map.is-scanning .radar-sweep{opacity:1}
    body.constellation-theme .constellation-map.is-scanning.is-in-view:not(.radar-paused) .radar-sweep{animation-play-state:running}
    body.constellation-theme .constellation-tools{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin:3px 0 0;padding-top:13px;border-top:1px solid #e5d8cc}
    body.constellation-theme .constellation-scan-state{display:flex;align-items:center;gap:9px;color:#386e61;font-size:.74rem;line-height:1.5;max-width:45ch}
    body.constellation-theme .radar-status-mark{width:9px;height:9px;border:1px solid currentColor;border-radius:50%;flex:none;background:#e4eee6}
    body.constellation-theme .constellation-tools button{min-height:36px;padding:8px 12px;font-size:.7rem}
    body.constellation-theme .constellation-tool-actions{display:flex;gap:7px}
    body.constellation-theme .constellation-help{margin:11px 0 0;color:#7a6f65;font-size:.66rem;line-height:1.5}
    @keyframes teammate-radar{to{transform:rotate(360deg)}}
    @container(max-width:700px){body.constellation-theme .constellation-map{height:690px;min-height:690px}body.constellation-theme .constellation-idea{width:180px;min-height:178px;padding:20px 16px}body.constellation-theme .constellation-orb{width:123px;min-height:125px}body.constellation-theme .constellation-member{width:174px;min-height:105px;padding:12px 14px}body.constellation-theme .constellation-radar{left:50%;top:53%;width:90%}body.constellation-theme .constellation-heading h2{font-size:1.5rem}}
    @container(max-width:410px){body.constellation-theme .constellation-idea{width:156px;min-height:168px;padding:18px 13px}body.constellation-theme .constellation-idea strong{font-size:1.18rem}body.constellation-theme .constellation-idea-mark{width:32px;height:32px;margin-bottom:6px}body.constellation-theme .constellation-orb{width:108px;min-height:116px;padding:10px}body.constellation-theme .constellation-orb strong{font-size:1.05rem}body.constellation-theme .constellation-symbol{width:42px;height:42px}body.constellation-theme .constellation-member{width:min(145px,calc((100% - 24px)/2));padding:11px 12px}body.constellation-theme .constellation-member p{font-size:.64rem}body.constellation-theme .constellation-member strong{font-size:.8rem}body.constellation-theme .constellation-heading{gap:10px}body.constellation-theme .constellation-heading .secondary{padding:7px 10px}body.constellation-theme .constellation-tools{align-items:flex-start;flex-direction:column}}
    @media(max-width:760px){body.constellation-theme .hero h1{font-size:clamp(3rem,11vw,4.1rem)}body.constellation-theme .role-choice .role-icon{width:42px;height:42px;top:13px}}
    @media(prefers-reduced-motion:reduce){body.constellation-theme .radar-sweep{animation:none;background:conic-gradient(transparent 0deg 280deg,rgba(23,103,93,.07) 359deg,transparent 360deg)}body.constellation-theme .constellation-symbol svg{transition:none}}
`;

export const CONSTELLATION_SCRIPT = String.raw`
    const constellationIcons = __ROLE_ICONS_JSON__;
    const clampMapNode = __CLAMP_MAP_NODE__;
    const mapConnector = __MAP_CONNECTOR__;
    const constellationSearchState = __SEARCH_STATE__;
    const constellationUI = (() => {
      const host = $("#matching-constellation"), panel = $("#matching-constellation-panel");
      const layoutDefaults = {
        wide: { idea:{x:.47,y:.5}, product:{x:.22,y:.29}, "product-person":{x:.14,y:.72}, marketing:{x:.73,y:.2}, "marketing-person":{x:.86,y:.46}, sales:{x:.7,y:.76}, "sales-person":{x:.87,y:.91} },
        compact: { idea:{x:.5,y:.55}, product:{x:.23,y:.11}, "product-person":{x:.24,y:.3}, marketing:{x:.78,y:.12}, "marketing-person":{x:.77,y:.3}, sales:{x:.25,y:.81}, "sales-person":{x:.76,y:.89} },
      };
      const roles = [{role:"Product Creator",id:"product",code:"MAKE",short:"Build the product"},{role:"Marketing",id:"marketing",code:"AMPLIFY",short:"Reach customers"},{role:"Sales",id:"sales",code:"CONNECT",short:"Talk with customers"}];
      let positions = {}, layoutMode = "", signature = "", drag = null, frame = 0, lastState = null, pendingState = null, radarPaused = false;
      const storageKey = () => "onlyskill-map-layout-v1:" + deviceId + ":" + layoutMode;
      function loadLayout(mode) {
        layoutMode = mode;
        positions = structuredClone(layoutDefaults[mode]);
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey()) || "null");
          for (const key of Object.keys(positions)) if (Number.isFinite(saved?.[key]?.x) && Number.isFinite(saved?.[key]?.y)) positions[key] = {x:saved[key].x,y:saved[key].y};
        } catch (_) {}
      }
      function saveLayout() { try { localStorage.setItem(storageKey(), JSON.stringify(positions)); } catch (_) {} }
      function nodes() { return Array.from(host.querySelectorAll("[data-map-node]")); }
      function updateLines() {
        const bounds = host.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const boxes = {};
        for (const node of nodes()) {
          const rect = node.getBoundingClientRect();
          boxes[node.dataset.mapNode] = {x:rect.left + rect.width / 2 - bounds.left,y:rect.top + rect.height / 2 - bounds.top,width:rect.width,height:rect.height};
        }
        host.querySelector(".constellation-lines")?.setAttribute("viewBox", "0 0 " + bounds.width + " " + bounds.height);
        for (const path of host.querySelectorAll("[data-map-from]")) {
          const from = boxes[path.dataset.mapFrom], to = boxes[path.dataset.mapTo];
          if (from && to) path.setAttribute("d", mapConnector(from, to, Number(path.dataset.bend) || 0));
        }
      }
      function layout() {
        frame = 0;
        const bounds = host.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const mode = bounds.width <= 700 ? "compact" : "wide";
        if (mode !== layoutMode) loadLayout(mode);
        for (const node of nodes()) {
          const key = node.dataset.mapNode;
          const position = clampMapNode(positions[key], bounds.width, bounds.height, node.offsetWidth, node.offsetHeight);
          positions[key] = position;
          node.style.transform = "translate3d(" + (position.x * bounds.width) + "px," + (position.y * bounds.height) + "px,0) translate(-50%,-50%) rotate(var(--node-tilt,0deg))";
        }
        const radar = host.querySelector(".constellation-radar");
        if (radar && positions.idea) { radar.style.left = positions.idea.x * bounds.width + "px"; radar.style.top = positions.idea.y * bounds.height + "px"; }
        updateLines();
      }
      function scheduleLayout() { if (!frame) frame = requestAnimationFrame(layout); }
      function updateRadar(state) {
        const search = constellationSearchState(state);
        $("#constellation-scan-label").textContent = search.label;
        host.classList.toggle("is-scanning", search.scanning);
        host.classList.toggle("radar-paused", radarPaused);
        $("#constellation-scan").hidden = !search.scanning;
        $("#constellation-motion").hidden = !search.scanning;
        $("#constellation-motion").textContent = radarPaused ? "Resume radar" : "Pause radar";
        $("#constellation-motion").setAttribute("aria-pressed", String(radarPaused));
      }
      function render(state) {
        lastState = state;
        if (drag) { pendingState = state; return; }
        const profile = state.profile || null, team = state.team || null;
        const members = Array.isArray(team?.members) ? team.members : [], counts = state.availableCounts || {};
        const idea = profile?.businessGoal || members.find(member => member.role === "Product Creator")?.businessGoal || members.find(member => member.businessGoal)?.businessGoal || "";
        const caption = team?.status === "active" ? "Your idea, three roles, one connected team." : team ? "A potential team is linked. Every member must accept to activate it." : profile ? "Explore your idea and the roles around it. The pool uses submitted profiles." : "Start with an idea. Find the people who can help it grow.";
        $("#matching-constellation-caption").textContent = caption;
        updateRadar(state);
        const details = roles.map(({role,id,code,short}) => {
          const isYou = profile?.role === role;
          const visible = members.find(member => member.role === role) || (!team && isYou ? profile : null);
          const available = Math.max(0, Number(counts[role]) || 0);
          return {role,id,code,isYou,name:visible?.name || (available ? available + " profile" + (available === 1 ? "" : "s") + " available" : "Open position"),status:visible ? (isYou ? "Your position" : matchingStatusLabel(visible.invitationStatus)) : available ? "Matching pool" : "Waiting for a match",detail:visible ? (isYou && profile ? ((profile.skills || []).slice(0,3).join(" · ") || short) + (profile.availabilityHours ? " · " + profile.availabilityHours + " hrs/week" : "") : "Real profile linked to this team match.") : available ? "Potential profiles only; no teammate is named until a match is formed." : "No available profile for this position yet."};
        });
        const nextSignature = JSON.stringify([idea,details]);
        if (nextSignature !== signature) {
          const focused = host.contains(document.activeElement) ? document.activeElement.dataset.mapNode : null;
          const connections = roles.map(({id}) => '<path class="constellation-line-' + id + '" data-map-from="idea" data-map-to="' + id + '" data-bend="' + (id === "product" ? -1 : 1) + '"/><path class="constellation-line-' + id + '" data-map-from="' + id + '" data-map-to="' + id + '-person" data-bend="-1"/>').join("");
          const branches = details.map(item => '<div class="constellation-orb" data-map-node="' + item.id + '" data-role="' + escapeHTML(item.role) + '" tabindex="0" role="group" aria-roledescription="movable map node" aria-label="' + escapeHTML(item.role) + ' role node" aria-describedby="constellation-help"><span class="constellation-symbol">' + constellationIcons[item.role] + '</span><strong>' + escapeHTML(item.role) + '</strong><small>' + item.code + '</small></div><div class="constellation-member" data-map-node="' + item.id + '-person" data-role="' + escapeHTML(item.role) + '" tabindex="0" role="group" aria-roledescription="movable map node" aria-label="' + escapeHTML(item.role + ": " + item.name) + '" aria-describedby="constellation-help"><small>' + escapeHTML(item.status) + '</small><strong>' + escapeHTML(item.name) + '</strong><p>' + escapeHTML(item.detail) + '</p></div>').join("");
          host.innerHTML = '<div class="constellation-radar" aria-hidden="true"><div class="radar-sweep"></div></div><svg class="constellation-lines" aria-hidden="true">' + connections + '</svg><div class="constellation-idea" data-map-node="idea" tabindex="0" role="group" aria-roledescription="movable map node" aria-label="' + escapeHTML(idea ? "Your venture idea: " + idea : "Your venture idea") + '" aria-describedby="constellation-help"><span class="constellation-idea-mark">' + constellationIcons["Product Creator"] + '</span><div><span class="eyebrow">YOUR VENTURE IDEA</span><strong title="' + escapeHTML(idea || "Your first business idea") + '">' + escapeHTML(idea || "Your first business idea") + '</strong><p>' + (idea ? "The goal connecting this team." : "Save a profile to plant your idea here.") + '</p></div></div>' + branches;
          signature = nextSignature;
          if (focused) host.querySelector('[data-map-node="' + focused + '"]')?.focus({preventScroll:true});
        }
        panel.hidden = false;
        scheduleLayout();
      }
      function finishDrag(cancelled) {
        if (!drag) return;
        if (cancelled) positions[drag.key] = drag.origin;
        const ended = drag;
        drag = null;
        ended.node.classList.remove("is-dragging");
        if (host.hasPointerCapture(ended.pointerId)) host.releasePointerCapture(ended.pointerId);
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        layout();
        if (!cancelled) saveLayout();
        $("#constellation-announcement").textContent = cancelled ? "Move cancelled." : ended.node.getAttribute("aria-label") + " moved.";
        scheduleLayout();
        if (pendingState) { const state = pendingState; pendingState = null; render(state); }
      }
      host.addEventListener("pointerdown", event => {
        const node = event.target.closest("[data-map-node]");
        if (!node || event.button !== 0 || !event.isPrimary) return;
        if (frame) { cancelAnimationFrame(frame); layout(); }
        const bounds = host.getBoundingClientRect(), key = node.dataset.mapNode;
        const origin = {...positions[key]};
        drag = {node,key,origin,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,width:bounds.width,height:bounds.height};
        node.focus({preventScroll:true});
        node.classList.add("is-dragging");
        host.setPointerCapture(event.pointerId);
        event.preventDefault();
      });
      host.addEventListener("pointermove", event => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        positions[drag.key] = {x:drag.origin.x + (event.clientX - drag.startX) / drag.width,y:drag.origin.y + (event.clientY - drag.startY) / drag.height};
        scheduleLayout();
      });
      host.addEventListener("pointerup", event => { if (drag?.pointerId === event.pointerId) finishDrag(false); });
      host.addEventListener("pointercancel", () => finishDrag(true));
      host.addEventListener("lostpointercapture", () => finishDrag(true));
      host.addEventListener("keydown", event => {
        const node = event.target.closest("[data-map-node]");
        if (!node) return;
        if (event.key === "Escape") { finishDrag(true); return; }
        const direction = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
        if (!direction) return;
        event.preventDefault();
        const key = node.dataset.mapNode, amount = event.shiftKey ? .05 : .015;
        positions[key] = {x:positions[key].x + direction[0] * amount,y:positions[key].y + direction[1] * amount};
        layout(); saveLayout();
      });
      function highlight(node) { for (const path of host.querySelectorAll("[data-map-from]")) path.classList.toggle("is-highlighted", Boolean(node && (path.dataset.mapFrom === node.dataset.mapNode || path.dataset.mapTo === node.dataset.mapNode))); }
      host.addEventListener("pointerover", event => highlight(event.target.closest("[data-map-node]")));
      host.addEventListener("pointerleave", () => highlight(null));
      host.addEventListener("focusin", event => highlight(event.target.closest("[data-map-node]")));
      host.addEventListener("focusout", () => highlight(null));
      $("#constellation-reset").addEventListener("click", () => { finishDrag(true); try { localStorage.removeItem(storageKey()); } catch (_) {} positions = structuredClone(layoutDefaults[layoutMode || "wide"]); scheduleLayout(); $("#constellation-announcement").textContent = "Map layout reset."; });
      $("#constellation-motion").addEventListener("click", () => { radarPaused = !radarPaused; if (lastState) updateRadar(lastState); });
      $("#constellation-scan").addEventListener("click", async () => { const button = $("#constellation-scan"); button.disabled = true; button.textContent = "Checking…"; try { await refreshMatching(); } finally { button.disabled = false; button.textContent = "Scan now"; } });
      const observer = new ResizeObserver(() => { if (drag) finishDrag(true); scheduleLayout(); });
      observer.observe(host);
      const visibility = new IntersectionObserver(entries => { host.classList.toggle("is-in-view", entries[0].isIntersecting && !document.hidden); }, {threshold:.05});
      visibility.observe(host);
      document.addEventListener("visibilitychange", () => { if (document.hidden) host.classList.remove("is-in-view"); else { const rect = host.getBoundingClientRect(); host.classList.toggle("is-in-view", rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight); } });
      return {render};
    })();
` .replace("__ROLE_ICONS_JSON__", () => JSON.stringify(ROLE_ICONS))
  .replace("__CLAMP_MAP_NODE__", () => clampMapNode.toString())
  .replace("__MAP_CONNECTOR__", () => mapConnector.toString())
  .replace("__SEARCH_STATE__", () => constellationSearchState.toString());

