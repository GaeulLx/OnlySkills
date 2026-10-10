import { TASK_PHASE_ORDER, taskStepPlan } from "./task-plans.js";

const ROLES = ["Product Creator", "Marketing", "Sales"];
const MAX_CANDIDATES_PER_ROLE = 24;
const MAX_MATCHES_PER_PASS = 20;
const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "i", "in", "is", "it", "me", "my", "of", "on", "or", "our", "the", "to", "we", "with", "you", "your"]);
const ROLE_SKILLS = {
  "Product Creator": ["craft", "handmade", "make", "making", "production", "recipe", "cook", "bake", "food", "sew", "sewing", "design", "prototype", "quality", "materials", "product"],
  Marketing: ["marketing", "social", "content", "video", "photography", "writing", "copy", "branding", "brand", "design", "tiktok", "instagram", "promotion", "campaign"],
  Sales: ["sales", "selling", "sell", "customer", "customers", "orders", "retail", "communication", "communicate", "negotiation", "pitch", "stall", "shop", "service"],
};

const TASK_TEMPLATES = {
  "Product Creator": [
    ["sample", "Make three test units", "Prepare three real sample units for the team's venture goal. Record the materials and cost used for each one."],
    ["quality", "Check quality and packaging", "Check the three samples for consistency, safety, and packaging. Write down any changes needed before selling."],
    ["unit-cost", "Confirm the unit cost", "Calculate the real material, packaging, and preparation cost per unit, then share the number with the team."],
  ],
  Marketing: [
    ["message", "Write the launch message", "Write one short, clear message explaining the team's venture goal and who it is for. Avoid claims the team has not verified."],
    ["creative", "Make one launch creative", "Create one simple photo, poster, or short-video concept that presents the actual product or service."],
    ["test", "Test the message with five people", "Show the message to five real people in the target audience and record their questions and reactions."],
  ],
  Sales: [
    ["pitch", "Prepare a customer pitch", "Prepare a 30-second explanation of the venture goal, offer, and price. Use only confirmed product details."],
    ["conversations", "Speak with five potential customers", "Talk with five people in the target audience and record interest, questions, and objections separately."],
    ["follow-up", "Track real orders and follow-ups", "Record actual orders and next steps. Keep expressions of interest separate from confirmed sales."],
  ],
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

function validDeviceId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function cleanList(value, maxItems = 16) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;\n]+/) : [];
  const unique = new Set();
  for (const item of values) {
    if (typeof item !== "string") continue;
    const cleaned = item.trim().replace(/\s+/g, " ").slice(0, 48);
    if (cleaned) unique.add(cleaned);
    if (unique.size >= maxItems) break;
  }
  return [...unique];
}

function tokenize(value) {
  return String(value || "").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((token) => token.length > 1 && !STOP_WORDS.has(token)) || [];
}

function uniqueTokens(value) {
  return [...new Set(tokenize(value))];
}

function tfidfVectors(documents) {
  const tokenized = documents.map((document) => tokenize(document));
  const documentFrequency = new Map();
  for (const tokens of tokenized) {
    for (const token of new Set(tokens)) documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  }
  return tokenized.map((tokens) => {
    const counts = new Map();
    for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
    const vector = new Map();
    let squaredNorm = 0;
    for (const [token, count] of counts) {
      const idf = Math.log((documents.length + 1) / ((documentFrequency.get(token) || 0) + 1)) + 1;
      const weight = (1 + Math.log(count)) * idf;
      vector.set(token, weight);
      squaredNorm += weight * weight;
    }
    const norm = Math.sqrt(squaredNorm);
    if (norm) for (const [token, value] of vector) vector.set(token, value / norm);
    return vector;
  });
}

function cosine(left, right) {
  if (!left?.size || !right?.size) return 0;
  let result = 0;
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  for (const [token, weight] of small) result += weight * (large.get(token) || 0);
  return Math.max(0, Math.min(1, result));
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let common = 0;
  for (const token of left) if (right.has(token)) common++;
  return common / (left.size + right.size - common);
}

function averagePairwise(values, compare) {
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      total += compare(values[i], values[j]);
      pairs++;
    }
  }
  return pairs ? total / pairs : 0;
}

function commonTerms(profiles, key) {
  const lists = profiles.map((profile) => new Set(uniqueTokens((profile[key] || []).join(" "))));
  if (lists.some((list) => !list.size)) return [];
  return [...lists[0]].filter((token) => lists.slice(1).every((list) => list.has(token))).sort().slice(0, 6);
}

function profileLists(profile) {
  return {
    ...profile,
    skills: Array.isArray(profile.skills) ? profile.skills : parseStoredList(profile.skills),
    interests: Array.isArray(profile.interests) ? profile.interests : parseStoredList(profile.interests),
    availabilitySlots: Array.isArray(profile.availabilitySlots) ? profile.availabilitySlots : parseStoredList(profile.availability_slots ?? profile.availabilitySlots),
    availabilityHours: Number(profile.availabilityHours ?? profile.availability_hours),
    businessGoal: profile.businessGoal ?? profile.business_goal ?? "",
    userId: profile.userId ?? profile.user_id ?? "",
    displayName: profile.displayName ?? profile.display_name ?? "",
    createdAt: Number(profile.createdAt ?? profile.created_at ?? 0),
  };
}

function parseStoredList(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
  } catch (_) {
    return [];
  }
}

function prepareVectors(profiles) {
  return {
    goal: tfidfVectors(profiles.map((profile) => profile.businessGoal)),
    interest: tfidfVectors(profiles.map((profile) => profile.interests.join(" "))),
  };
}

function scorePreparedTriple(profiles, vectors) {
  if (profiles.length !== 3 || ROLES.some((role) => profiles.filter((profile) => profile.role === role).length !== 1)) return null;
  const people = profiles.map(profileLists);
  const skillSets = people.map((profile) => new Set(profile.skills.flatMap(uniqueTokens)));
  const skillTokenTotal = skillSets.reduce((count, set) => count + set.size, 0);
  const allSkills = new Set(skillSets.flatMap((set) => [...set]));
  const skillCoverage = skillTokenTotal ? allSkills.size / skillTokenTotal : 0;
  const roleSkillFit = people.map((profile) => {
    const expected = ROLE_SKILLS[profile.role];
    const actual = new Set(profile.skills.flatMap(uniqueTokens));
    const matched = expected.filter((token) => actual.has(token));
    return { role: profile.role, matched, score: expected.length ? matched.length / expected.length : 0 };
  });
  const skillFit = roleSkillFit.reduce((sum, item) => sum + item.score, 0) / roleSkillFit.length;
  const skills = 0.8 * skillFit + 0.2 * skillCoverage;
  const interests = averagePairwise(people.map((_, index) => index), (left, right) => cosine(vectors.interest[left], vectors.interest[right]));
  const businessGoals = averagePairwise(people.map((_, index) => index), (left, right) => cosine(vectors.goal[left], vectors.goal[right]));
  const hours = people.map((profile) => profile.availabilityHours);
  const hoursSpread = Math.max(...hours) - Math.min(...hours);
  const hoursFit = Math.max(0, 1 - hoursSpread / 40);
  const slots = people.map((profile) => new Set(profile.availabilitySlots.flatMap(uniqueTokens)));
  const slotFit = averagePairwise(slots, jaccard);
  const availability = 0.7 * hoursFit + 0.3 * slotFit;
  const score = Math.round(100 * (0.35 * skills + 0.2 * interests + 0.3 * businessGoals + 0.15 * availability));
  const hoursRange = { min: Math.min(...hours), max: Math.max(...hours) };
  return {
    score,
    components: {
      skills: Math.round(100 * skills),
      skillRoleFit: roleSkillFit.map((item) => ({ role: item.role, score: Math.round(100 * item.score), matchedKeywords: item.matched })),
      skillCoverage: Math.round(100 * skillCoverage),
      interests: Math.round(100 * interests),
      businessGoals: Math.round(100 * businessGoals),
      commonInterestTerms: commonTerms(people, "interests"),
      commonGoalTerms: [...new Set(people.map((profile) => tokenize(profile.businessGoal)).reduce((common, tokens) => common.filter((token) => tokens.includes(token))))].slice(0, 6),
      availability: Math.round(100 * availability),
      hoursRange,
      commonTimeSlots: people.length ? people[0].availabilitySlots.filter((slot) => people.slice(1).every((profile) => profile.availabilitySlots.includes(slot))).slice(0, 6) : [],
    },
    explanation: "Scores are computed from the submitted skills, interests, venture goals, and availability. The three required positions are enforced separately by the matching rules.",
  };
}

export function scoreTriple(profiles) {
  if (!Array.isArray(profiles) || profiles.length !== 3 || ROLES.some((role) => profiles.filter((profile) => profile.role === role).length !== 1)) return null;
  const people = profiles.map(profileLists);
  return scorePreparedTriple(people, prepareVectors(people));
}

export function chooseBestTriple(profiles) {
  const byRole = Object.fromEntries(ROLES.map((role) => [role, profiles.filter((profile) => profile.role === role).map(profileLists).sort((a, b) => a.createdAt - b.createdAt || a.userId.localeCompare(b.userId)).slice(0, MAX_CANDIDATES_PER_ROLE)]));
  if (ROLES.some((role) => !byRole[role].length)) return null;
  const selectedPool = ROLES.flatMap((role) => byRole[role]);
  const vectors = prepareVectors(selectedPool);
  const vectorIndex = new Map(selectedPool.map((profile, index) => [profile.userId, index]));
  let best = null;
  for (const creator of byRole["Product Creator"]) {
    for (const marketer of byRole.Marketing) {
      for (const salesperson of byRole.Sales) {
        const members = [creator, marketer, salesperson];
        const memberVectors = {
          goal: members.map((profile) => vectors.goal[vectorIndex.get(profile.userId)]),
          interest: members.map((profile) => vectors.interest[vectorIndex.get(profile.userId)]),
        };
        const result = scorePreparedTriple(members, memberVectors);
        if (!result) continue;
        const age = members.reduce((sum, profile) => sum + profile.createdAt, 0);
        const ids = members.map((profile) => profile.userId).sort().join(":");
        if (!best || result.score > best.result.score || (result.score === best.result.score && (age < best.age || (age === best.age && ids < best.ids)))) {
          best = { members, result, age, ids };
        }
      }
    }
  }
  return best ? { members: best.members, ...best.result } : null;
}

async function availableProfiles(db) {
  const result = await db.prepare(`
    SELECT p.user_id, p.role, p.display_name, p.skills, p.interests, p.business_goal,
           p.availability_hours, p.availability_slots, p.created_at
    FROM matching_profiles p
    WHERE p.match_opt_in = 1
      AND NOT EXISTS (
        SELECT 1 FROM matching_team_members tm
        JOIN matching_teams t ON t.id = tm.team_id
        WHERE tm.user_id = p.user_id AND tm.status IN ('invited', 'accepted')
          AND t.status IN ('forming', 'active')
      )
    ORDER BY p.created_at, p.user_id
  `).all();
  return result.results || [];
}

async function autoMatchProfiles(db) {
  let created = 0;
  let conflicts = 0;
  for (let iteration = 0; iteration < MAX_MATCHES_PER_PASS; iteration++) {
    const profiles = await availableProfiles(db);
    const match = chooseBestTriple(profiles);
    if (!match) break;
    const now = Date.now();
    const teamId = crypto.randomUUID();
    const statements = [db.prepare("INSERT INTO matching_teams (id, status, match_score, score_breakdown, created_at, updated_at) VALUES (?, 'forming', ?, ?, ?, ?)").bind(teamId, match.score, JSON.stringify({ ...match.components, explanation:match.explanation }), now, now)];
    for (const profile of match.members) {
      statements.push(db.prepare("INSERT INTO matching_team_members (id, team_id, user_id, role, status, invited_at) VALUES (?, ?, ?, ?, 'invited', ?)").bind(crypto.randomUUID(), teamId, profile.userId, profile.role, now));
    }
    try {
      await db.batch(statements);
      created++;
      conflicts = 0;
    } catch (_) {
      conflicts++;
      if (conflicts >= 3) break;
    }
  }
  return created;
}

function publicProfile(row) {
  return {
    role: row.role,
    name: row.display_name,
    skills: parseStoredList(row.skills),
    interests: parseStoredList(row.interests),
    businessGoal: row.business_goal,
    availabilityHours: Number(row.availability_hours),
    availabilitySlots: parseStoredList(row.availability_slots),
  };
}

async function matchingCounts(db) {
  const result = await db.prepare(`
    SELECT p.role, COUNT(*) AS count
    FROM matching_profiles p
    WHERE p.match_opt_in = 1
      AND NOT EXISTS (
        SELECT 1 FROM matching_team_members tm
        JOIN matching_teams t ON t.id = tm.team_id
        WHERE tm.user_id = p.user_id AND tm.status IN ('invited', 'accepted')
          AND t.status IN ('forming', 'active')
      )
    GROUP BY p.role
  `).all();
  const counts = Object.fromEntries(ROLES.map((role) => [role, 0]));
  for (const row of result.results || []) counts[row.role] = Number(row.count);
  return counts;
}

async function ownActiveTasks(db, teamId, deviceId) {
  // Filtering here is an API privacy boundary, not just a UI visibility rule.
  // Never send other members' task IDs, descriptions, or child steps.
  return await db.prepare(`
    SELECT task.id, task.team_id, task.user_id, task.role, task.task_key, task.title, task.detail,
           task.completed, creator.business_goal AS team_goal
    FROM matching_tasks task
    JOIN matching_teams t ON t.id = task.team_id AND t.status = 'active'
    JOIN matching_team_members owner ON owner.team_id = t.id
      AND owner.user_id = task.user_id AND owner.status = 'accepted'
    JOIN matching_team_members creator_member ON creator_member.team_id = t.id
      AND creator_member.role = 'Product Creator' AND creator_member.status = 'accepted'
    JOIN matching_profiles creator ON creator.user_id = creator_member.user_id
    WHERE task.team_id = ? AND task.user_id = ?
    ORDER BY task.task_key
  `).bind(teamId, deviceId).all();
}

async function ensureTaskSteps(db, tasks, deviceId) {
  if (!tasks.length) return;
  const knownResult = await db.prepare(`
    SELECT step.task_id, step.step_key
    FROM matching_task_steps step JOIN matching_tasks task ON task.id = step.task_id
    JOIN matching_teams t ON t.id = task.team_id AND t.status = 'active'
    JOIN matching_team_members tm ON tm.team_id = t.id
      AND tm.user_id = task.user_id AND tm.status = 'accepted'
    WHERE task.team_id = ? AND task.user_id = ?
  `).bind(tasks[0].team_id, deviceId).all();
  const known = new Set((knownResult.results || []).map((row) => `${row.task_id}:${row.step_key}`));
  const now = Date.now();
  const statements = [];
  for (const task of tasks) {
    for (const step of taskStepPlan(task.role, task.task_key, { teamGoal: task.team_goal })) {
      if (known.has(`${task.id}:${step.key}`)) continue;
      statements.push(db.prepare(`
        INSERT OR IGNORE INTO matching_task_steps
          (id, task_id, step_key, sort_order, title, detail, completion_output,
           estimated_minutes, completed, created_at, updated_at)
        SELECT ?, task.id, ?, ?, ?, ?, ?, ?, task.completed, ?, ?
        FROM matching_tasks task
        JOIN matching_teams t ON t.id = task.team_id AND t.status = 'active'
        JOIN matching_team_members tm ON tm.team_id = t.id
          AND tm.user_id = task.user_id AND tm.status = 'accepted'
        WHERE task.id = ? AND task.user_id = ?
      `).bind(crypto.randomUUID(), step.key, step.order, step.title, step.detail,
        step.output, step.estimatedMinutes, now, now, task.id, deviceId));
    }
  }
  // Each phone has only three phases and eighteen steps. INSERT OR IGNORE plus
  // the unique parent/key index makes simultaneous first reads idempotent.
  // Seed from the parent's live completion flag to preserve pre-upgrade work.
  if (statements.length) await db.batch(statements);
}

async function matchingState(db, deviceId) {
  const profileRow = await db.prepare("SELECT * FROM matching_profiles WHERE user_id = ?").bind(deviceId).first();
  let activeMembership = await db.prepare(`
    SELECT tm.team_id, tm.status AS invitation_status, t.status AS team_status,
           t.match_score, t.score_breakdown, t.created_at
    FROM matching_team_members tm JOIN matching_teams t ON t.id = tm.team_id
    WHERE tm.user_id = ? AND tm.status IN ('invited', 'accepted') AND t.status IN ('forming', 'active')
    LIMIT 1
  `).bind(deviceId).first();

  let team = null;
  if (activeMembership) {
    const teamResult = await db.prepare(`
      SELECT p.user_id, p.role, p.display_name, p.skills, p.interests, p.business_goal,
             p.availability_hours, p.availability_slots, tm.status AS invitation_status
      FROM matching_team_members tm JOIN matching_profiles p ON p.user_id = tm.user_id
      WHERE tm.team_id = ? AND tm.status IN ('invited', 'accepted')
      ORDER BY CASE tm.role WHEN 'Product Creator' THEN 0 WHEN 'Marketing' THEN 1 ELSE 2 END
    `).bind(activeMembership.team_id).all();
    let tasksResult = { results: [] };
    let stepsResult = { results: [] };
    if (activeMembership.team_status === "active") {
      tasksResult = await ownActiveTasks(db, activeMembership.team_id, deviceId);
      await ensureTaskSteps(db, tasksResult.results || [], deviceId);
      // Re-read after seeding so a concurrent checklist update is reflected.
      tasksResult = await ownActiveTasks(db, activeMembership.team_id, deviceId);
      stepsResult = await db.prepare(`
        SELECT step.id, step.task_id, step.step_key, step.title, step.detail,
               step.completion_output, step.estimated_minutes, step.completed
        FROM matching_task_steps step JOIN matching_tasks task ON task.id = step.task_id
        JOIN matching_teams t ON t.id = task.team_id AND t.status = 'active'
        JOIN matching_team_members tm ON tm.team_id = t.id
          AND tm.user_id = task.user_id AND tm.status = 'accepted'
        WHERE task.team_id = ? AND task.user_id = ?
        ORDER BY step.sort_order, step.step_key
      `).bind(activeMembership.team_id, deviceId).all();
    }
    const stepsByTask = new Map();
    for (const row of stepsResult.results || []) {
      if (!stepsByTask.has(row.task_id)) stepsByTask.set(row.task_id, []);
      stepsByTask.get(row.task_id).push({ id: row.id, key: row.step_key, title: row.title,
        detail: row.detail, output: row.completion_output,
        estimatedMinutes: Number(row.estimated_minutes), completed: Number(row.completed) === 1 });
    }
    const messagesResult = activeMembership.team_status === "active"
      ? await db.prepare(`
        SELECT m.id, m.user_id, m.body, m.created_at, p.display_name
        FROM matching_messages m JOIN matching_profiles p ON p.user_id = m.user_id
        WHERE m.team_id = ?
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 100
      `).bind(activeMembership.team_id).all()
      : { results: [] };
    let breakdown = {};
    try { breakdown = JSON.parse(activeMembership.score_breakdown || "{}"); } catch (_) {}
    team = {
      id: activeMembership.team_id,
      status: activeMembership.team_status,
      yourInvitationStatus: activeMembership.invitation_status,
      matchScore: Number(activeMembership.match_score),
      scoreBreakdown: breakdown,
      members: (teamResult.results || []).map((row) => ({ ...publicProfile(row), invitationStatus: row.invitation_status })),
      tasks: (tasksResult.results || []).sort((left, right) => {
        const order = TASK_PHASE_ORDER[left.role] || [];
        return order.indexOf(left.task_key) - order.indexOf(right.task_key);
      }).map((row) => {
        const steps = stepsByTask.get(row.id) || [];
        return { id: row.id, role: row.role, key: row.task_key, title: row.title, detail: row.detail,
          completed: Number(row.completed) === 1, canUpdate: row.user_id === deviceId,
          steps, completedCount: steps.filter((step) => step.completed).length, stepCount: steps.length };
      }),
      messages: (messagesResult.results || []).reverse().map((row) => ({ id: row.id, name: row.display_name, body: row.body, createdAt: Number(row.created_at), isMine: row.user_id === deviceId })),
    };
  }

  const lastRow = team ? null : await db.prepare(`
    SELECT t.id AS team_id, t.status AS team_status, tm.status AS invitation_status, t.updated_at
    FROM matching_team_members tm JOIN matching_teams t ON t.id = tm.team_id
    WHERE tm.user_id = ?
    ORDER BY t.updated_at DESC, tm.invited_at DESC
    LIMIT 1
  `).bind(deviceId).first();
  let lastMatch = null;
  if (lastRow) lastMatch = { teamId: lastRow.team_id, teamStatus: lastRow.team_status, invitationStatus: lastRow.invitation_status };
  return {
    profile: profileRow ? { ...publicProfile(profileRow), matchOptIn: Number(profileRow.match_opt_in) === 1 } : null,
    team,
    lastMatch,
    availableCounts: await matchingCounts(db),
  };
}

function profileError(body) {
  const deviceId = body?.deviceId;
  const displayName = cleanText(body?.displayName, 41);
  const role = body?.role;
  const skills = cleanList(body?.skills);
  const interests = cleanList(body?.interests);
  const businessGoal = cleanText(body?.businessGoal, 301);
  const availabilityHours = Number(body?.availabilityHours);
  const availabilitySlots = cleanList(body?.availabilitySlots, 12);
  if (!validDeviceId(deviceId)) return "This phone session could not be identified. Refresh and try again.";
  if (!displayName || displayName.length > 40 || /[\u0000-\u001f\u007f]/.test(displayName)) return "Enter a name between 1 and 40 characters.";
  if (!ROLES.includes(role)) return "Choose Product Creator, Marketing, or Sales.";
  if (!skills.length) return "Add at least one skill.";
  if (!interests.length) return "Add at least one interest.";
  if (!businessGoal || businessGoal.length > 300 || /[\u0000-\u001f\u007f]/.test(businessGoal)) return "Describe your business goal in 1–300 characters.";
  if (!Number.isInteger(availabilityHours) || availabilityHours < 1 || availabilityHours > 80) return "Enter 1 to 80 available hours per week.";
  if (!availabilitySlots.length) return "Add at least one time slot, such as weekday evenings or weekends.";
  return "";
}

function normalizedProfile(body) {
  return {
    deviceId: body.deviceId,
    displayName: cleanText(body.displayName, 40),
    role: body.role,
    skills: cleanList(body.skills),
    interests: cleanList(body.interests),
    businessGoal: cleanText(body.businessGoal, 300),
    availabilityHours: Number(body.availabilityHours),
    availabilitySlots: cleanList(body.availabilitySlots, 12),
  };
}

function taskStatements(db, teamId, goal, now) {
  const statements = [];
  for (const role of ROLES) {
    for (const [key, title, baseDetail] of TASK_TEMPLATES[role]) {
      const detail = baseDetail + " Team goal: “" + goal + "”";
      statements.push(db.prepare(`
        INSERT OR IGNORE INTO matching_tasks (id, team_id, user_id, role, task_key, title, detail, completed, created_at, updated_at)
        SELECT ?, tm.team_id, tm.user_id, tm.role, ?, ?, ?, 0, ?, ?
        FROM matching_team_members tm
        WHERE tm.team_id = ? AND tm.role = ? AND tm.status = 'accepted'
          AND (SELECT status FROM matching_teams WHERE id = tm.team_id) = 'active'
      `).bind(crypto.randomUUID(), key, title, detail, now, now, teamId, role));
    }
  }
  return statements;
}

async function matchProfile(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: "Enter your profile details to find a team." }, 400); }
  const problem = profileError(body);
  if (problem) return json({ error: problem }, 400);
  const profile = normalizedProfile(body);
  const reserved = await env.DB.prepare("SELECT tm.role, tm.status, t.status AS team_status FROM matching_team_members tm JOIN matching_teams t ON t.id = tm.team_id WHERE tm.user_id = ? AND tm.status IN ('invited', 'accepted') AND t.status IN ('forming', 'active') LIMIT 1").bind(profile.deviceId).first();
  if (reserved) return json({ error: "You already have a proposed or active team. Respond to it or cancel it before editing your match profile." }, 409);
  const now = Date.now();
  await env.DB.prepare(`
    INSERT INTO matching_profiles (user_id, role, display_name, skills, interests, business_goal, availability_hours, availability_slots, match_opt_in, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET role = excluded.role, display_name = excluded.display_name,
      skills = excluded.skills, interests = excluded.interests, business_goal = excluded.business_goal,
      availability_hours = excluded.availability_hours, availability_slots = excluded.availability_slots,
      match_opt_in = 1, updated_at = excluded.updated_at
  `).bind(profile.deviceId, profile.role, profile.displayName, JSON.stringify(profile.skills), JSON.stringify(profile.interests), profile.businessGoal, profile.availabilityHours, JSON.stringify(profile.availabilitySlots), now, now).run();
  const createdTeams = await autoMatchProfiles(env.DB);
  return json({ ...(await matchingState(env.DB, profile.deviceId)), createdTeams });
}

async function respondToInvitation(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: "Choose whether to accept or reject this invitation." }, 400); }
  const deviceId = body?.deviceId;
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";
  const action = body?.action;
  if (!validDeviceId(deviceId) || !teamId || !["accept", "reject"].includes(action)) return json({ error: "This invitation response is not valid." }, 400);
  const membership = await env.DB.prepare("SELECT tm.status AS invitation_status, t.status AS team_status, t.id AS team_id FROM matching_team_members tm JOIN matching_teams t ON t.id = tm.team_id WHERE tm.team_id = ? AND tm.user_id = ? LIMIT 1").bind(teamId, deviceId).first();
  if (!membership) return json({ error: "This invitation is not for this phone." }, 403);
  if (action === "accept" && membership.invitation_status === "accepted") return json(await matchingState(env.DB, deviceId));
  if (membership.team_status !== "forming" || membership.invitation_status !== "invited") return json({ error: "This invitation is no longer waiting for a response." }, 409);

  const now = Date.now();
  if (action === "accept") {
    const goal = await env.DB.prepare("SELECT p.business_goal FROM matching_team_members tm JOIN matching_profiles p ON p.user_id = tm.user_id WHERE tm.team_id = ? AND tm.role = 'Product Creator' LIMIT 1").bind(teamId).first();
    if (!goal?.business_goal) return json({ error: "The team's venture goal is unavailable. The invitation was not accepted." }, 409);
    const statements = [
      env.DB.prepare("UPDATE matching_team_members SET status = 'accepted', responded_at = ? WHERE team_id = ? AND user_id = ? AND status = 'invited' AND (SELECT status FROM matching_teams WHERE id = ?) = 'forming'").bind(now, teamId, deviceId, teamId),
      env.DB.prepare(`
        UPDATE matching_teams SET
          accepted_count = (SELECT COUNT(*) FROM matching_team_members WHERE team_id = ? AND status = 'accepted'),
          accepted_product_creator = (SELECT COUNT(*) > 0 FROM matching_team_members WHERE team_id = ? AND role = 'Product Creator' AND status = 'accepted'),
          accepted_marketing = (SELECT COUNT(*) > 0 FROM matching_team_members WHERE team_id = ? AND role = 'Marketing' AND status = 'accepted'),
          accepted_sales = (SELECT COUNT(*) > 0 FROM matching_team_members WHERE team_id = ? AND role = 'Sales' AND status = 'accepted'),
          updated_at = ?
        WHERE id = ? AND status = 'forming'
          AND EXISTS (SELECT 1 FROM matching_team_members WHERE team_id = ? AND user_id = ? AND status = 'accepted')
      `).bind(teamId, teamId, teamId, teamId, now, teamId, teamId, deviceId),
      env.DB.prepare("UPDATE matching_teams SET status = 'active', activated_at = ?, updated_at = ? WHERE id = ? AND status = 'forming' AND accepted_count = 3 AND accepted_product_creator = 1 AND accepted_marketing = 1 AND accepted_sales = 1 AND (SELECT COUNT(*) FROM matching_team_members WHERE team_id = ? AND status = 'accepted') = 3").bind(now, now, teamId, teamId),
      ...taskStatements(env.DB, teamId, goal.business_goal, now),
    ];
    await env.DB.batch(statements);
    return json(await matchingState(env.DB, deviceId));
  }

  await env.DB.batch([
    env.DB.prepare("UPDATE matching_teams SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'forming' AND EXISTS (SELECT 1 FROM matching_team_members WHERE team_id = ? AND user_id = ? AND status = 'invited')").bind(now, teamId, teamId, deviceId),
    env.DB.prepare("UPDATE matching_team_members SET status = 'rejected', responded_at = ? WHERE team_id = ? AND user_id = ? AND status = 'invited' AND (SELECT status FROM matching_teams WHERE id = ?) = 'cancelled'").bind(now, teamId, deviceId, teamId),
    env.DB.prepare("UPDATE matching_team_members SET status = 'cancelled', responded_at = ? WHERE team_id = ? AND user_id != ? AND status IN ('invited', 'accepted') AND (SELECT status FROM matching_teams WHERE id = ?) = 'cancelled'").bind(now, teamId, deviceId, teamId),
    env.DB.prepare("UPDATE matching_profiles SET match_opt_in = 0, updated_at = ? WHERE user_id = ? AND EXISTS (SELECT 1 FROM matching_team_members WHERE team_id = ? AND user_id = ? AND status = 'rejected')").bind(now, deviceId, teamId, deviceId),
  ]);
  await autoMatchProfiles(env.DB);
  return json(await matchingState(env.DB, deviceId));
}

async function cancelTeam(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: "Choose the team you want to cancel." }, 400); }
  const deviceId = body?.deviceId;
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";
  if (!validDeviceId(deviceId) || !teamId) return json({ error: "This team cancellation is not valid." }, 400);
  const membership = await env.DB.prepare("SELECT tm.status AS invitation_status, t.status AS team_status FROM matching_team_members tm JOIN matching_teams t ON t.id = tm.team_id WHERE tm.team_id = ? AND tm.user_id = ? LIMIT 1").bind(teamId, deviceId).first();
  if (!membership) return json({ error: "You are not part of this team." }, 403);
  if (membership.team_status === "cancelled") return json(await matchingState(env.DB, deviceId));
  if (!["invited", "accepted"].includes(membership.invitation_status) || !["forming", "active"].includes(membership.team_status)) return json({ error: "This team can no longer be cancelled." }, 409);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("UPDATE matching_teams SET status = 'cancelled', updated_at = ? WHERE id = ? AND status IN ('forming', 'active') AND EXISTS (SELECT 1 FROM matching_team_members WHERE team_id = ? AND user_id = ? AND status IN ('invited', 'accepted'))").bind(now, teamId, teamId, deviceId),
    env.DB.prepare("UPDATE matching_team_members SET status = 'cancelled', responded_at = ? WHERE team_id = ? AND status IN ('invited', 'accepted') AND (SELECT status FROM matching_teams WHERE id = ?) = 'cancelled'").bind(now, teamId, teamId),
    env.DB.prepare("UPDATE matching_profiles SET match_opt_in = 0, updated_at = ? WHERE user_id = ? AND (SELECT status FROM matching_teams WHERE id = ?) = 'cancelled'").bind(now, deviceId, teamId),
  ]);
  await autoMatchProfiles(env.DB);
  return json(await matchingState(env.DB, deviceId));
}

async function updateTask(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: "Choose a to-do item to update." }, 400); }
  const deviceId = body?.deviceId;
  const taskId = typeof body?.taskId === "string" ? body.taskId : "";
  if (!validDeviceId(deviceId) || !taskId || typeof body?.completed !== "boolean") return json({ error: "This to-do update is not valid." }, 400);
  const ownedTask = await env.DB.prepare(`
    SELECT task.team_id FROM matching_tasks task
    JOIN matching_teams t ON t.id = task.team_id AND t.status = 'active'
    JOIN matching_team_members tm ON tm.team_id = t.id
      AND tm.user_id = task.user_id AND tm.status = 'accepted'
    WHERE task.id = ? AND task.user_id = ?
  `).bind(taskId, deviceId).first();
  if (!ownedTask) return json({ error: "This task is not assigned to your active team." }, 409);
  const parents = await ownActiveTasks(env.DB, ownedTask.team_id, deviceId);
  await ensureTaskSteps(env.DB, (parents.results || []).filter((task) => task.id === taskId), deviceId);
  const now = Date.now();
  // Retain the existing whole-phase endpoint for old clients. Every update is
  // guarded inside the atomic batch, so cancelling a team cannot leave a step
  // or parent updated after the team stops being active.
  const results = await env.DB.batch([
    env.DB.prepare(`
      UPDATE matching_task_steps SET completed = ?, updated_at = ?
      WHERE task_id = ? AND EXISTS (
        SELECT 1 FROM matching_tasks task
        JOIN matching_teams t ON t.id = task.team_id AND t.status = 'active'
        JOIN matching_team_members tm ON tm.team_id = t.id
          AND tm.user_id = task.user_id AND tm.status = 'accepted'
        WHERE task.id = matching_task_steps.task_id AND task.user_id = ?
      )
    `).bind(body.completed ? 1 : 0, now, taskId, deviceId),
    env.DB.prepare(`
      UPDATE matching_tasks SET completed = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND EXISTS (
        SELECT 1 FROM matching_teams t JOIN matching_team_members tm ON tm.team_id = t.id
        WHERE t.id = matching_tasks.team_id AND t.status = 'active'
          AND tm.user_id = matching_tasks.user_id AND tm.status = 'accepted'
      )
    `).bind(body.completed ? 1 : 0, now, taskId, deviceId),
  ]);
  if (!results[1]?.meta?.changes) return json({ error: "This task is not assigned to your active team." }, 409);
  return json(await matchingState(env.DB, deviceId));
}

async function updateTaskStep(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: "Choose a checklist step to update." }, 400); }
  const deviceId = body?.deviceId;
  const stepId = typeof body?.stepId === "string" ? body.stepId : "";
  if (!validDeviceId(deviceId) || !stepId || stepId.length > 200 || typeof body?.completed !== "boolean") {
    return json({ error: "This checklist-step update is not valid." }, 400);
  }
  const now = Date.now();
  const results = await env.DB.batch([
    env.DB.prepare(`
      UPDATE matching_task_steps SET completed = ?, updated_at = ?
      WHERE id = ? AND EXISTS (
        SELECT 1 FROM matching_tasks task
        JOIN matching_teams t ON t.id = task.team_id AND t.status = 'active'
        JOIN matching_team_members tm ON tm.team_id = t.id
          AND tm.user_id = task.user_id AND tm.status = 'accepted'
        WHERE task.id = matching_task_steps.task_id AND task.user_id = ?
      )
    `).bind(body.completed ? 1 : 0, now, stepId, deviceId),
    env.DB.prepare(`
      UPDATE matching_tasks SET completed = (
        EXISTS (SELECT 1 FROM matching_task_steps step WHERE step.task_id = matching_tasks.id)
        AND NOT EXISTS (SELECT 1 FROM matching_task_steps step WHERE step.task_id = matching_tasks.id AND step.completed = 0)
      ), updated_at = ?
      WHERE id = (SELECT task_id FROM matching_task_steps WHERE id = ?)
        AND user_id = ? AND EXISTS (
          SELECT 1 FROM matching_teams t JOIN matching_team_members tm ON tm.team_id = t.id
          WHERE t.id = matching_tasks.team_id AND t.status = 'active'
            AND tm.user_id = matching_tasks.user_id AND tm.status = 'accepted'
        )
    `).bind(now, stepId, deviceId),
  ]);
  if (!results[0]?.meta?.changes) return json({ error: "This step is not assigned to your active team." }, 409);
  return json(await matchingState(env.DB, deviceId));
}

async function postMatchingMessage(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: "Write a message before sending it." }, 400); }
  const deviceId = body?.deviceId;
  const message = typeof body?.message === "string" ? body.message.replace(/\r\n?/g, "\n").trim() : "";
  if (!validDeviceId(deviceId)) return json({ error: "This phone session could not be identified. Refresh and try again." }, 400);
  if (!message || message.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) {
    return json({ error: "Messages must be 1–1,000 characters." }, 400);
  }
  const inserted = await env.DB.prepare(`
    INSERT INTO matching_messages (id, team_id, user_id, body, created_at)
    SELECT ?, tm.team_id, tm.user_id, ?, ?
    FROM matching_team_members tm JOIN matching_teams t ON t.id = tm.team_id
    WHERE tm.user_id = ? AND tm.status = 'accepted' AND t.status = 'active'
    LIMIT 1
  `).bind(crypto.randomUUID(), message, Date.now(), deviceId).run();
  if (!inserted?.meta?.changes) return json({ error: "Only accepted members of an active three-person team can use this group." }, 409);
  return json(await matchingState(env.DB, deviceId));
}

export async function handleMatchingRoute(request, env, url) {
  if (!env.DB) return json({ error: "The shared matching database is not connected." }, 503);
  try {
    if (url.pathname === "/api/matching/state" && request.method === "GET") {
      const deviceId = url.searchParams.get("device") || "";
      if (!validDeviceId(deviceId)) return json({ error: "This phone session could not be identified. Refresh and try again." }, 400);
      return json(await matchingState(env.DB, deviceId));
    }
    if (url.pathname === "/api/matching/profile" && request.method === "POST") return await matchProfile(request, env);
    if (url.pathname === "/api/matching/decision" && request.method === "POST") return await respondToInvitation(request, env);
    if (url.pathname === "/api/matching/cancel" && request.method === "POST") return await cancelTeam(request, env);
    if (url.pathname === "/api/matching/task" && request.method === "POST") return await updateTask(request, env);
    if (url.pathname === "/api/matching/task-step" && request.method === "POST") return await updateTaskStep(request, env);
    if (url.pathname === "/api/matching/message" && request.method === "POST") return await postMatchingMessage(request, env);
    return json({ error: "Matching endpoint not found." }, 404);
  } catch (_) {
    return json({ error: "Matching could not be updated. Refresh and try again." }, 503);
  }
}
