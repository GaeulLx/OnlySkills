function cleanJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

function validateBusinessAnalysis(value) {
  if (!value || !Array.isArray(value.costStructure) || !Number.isFinite(value.suggestedPrice) || !Number.isFinite(value.breakEvenUnits)) {
    throw new Error('CodeBuddy response did not match the expected business-analysis shape');
  }
  return value;
}

async function generateBusinessAnalysis(input) {
  // Load lazily so the mock flow still works if the SDK/runtime is not installed or entitled.
  const { query } = await import('@tencent-ai/agent-sdk');
  const prompt = [
    'You are the OnlySkills Business Analyst. Analyze the supplied student business goal and return exactly one JSON object, with no Markdown or extra text.',
    'Required shape: {"assumptions":["..."],"costStructure":[{"item":"...","amount":0}],"suggestedPrice":0,"estimatedUnitsAtBudget":0,"breakEvenUnits":0,"currency":"MYR"}.',
    'All amounts must be numeric. Use cautious illustrative estimates, state assumptions, and do not claim supplier quotes or verified market data. Do not use tools, access files, create documents, contact people, or take actions.',
    `Business input: ${JSON.stringify(input)}`
  ].join('\n\n');
  const env = {};
  for (const key of ['CODEBUDDY_API_KEY', 'CODEBUDDY_AUTH_TOKEN', 'CODEBUDDY_INTERNET_ENVIRONMENT']) {
    if (process.env[key]) env[key] = process.env[key];
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.CODEBUDDY_TIMEOUT_MS) || 90000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let finalText = '';
  let sessionId;
  try {
    const stream = query({
      prompt,
      options: {
        abortController: controller,
        permissionMode: 'plan',
        maxTurns: 3,
        ...(Object.keys(env).length ? { env } : {}),
        ...(process.env.CODEBUDDY_CODE_PATH ? { pathToCodebuddyCode: process.env.CODEBUDDY_CODE_PATH } : {}),
        canUseTool: async () => ({ behavior: 'deny', message: 'OnlySkills backend does not authorize tool execution.' })
      }
    });

    let completed = false;
    for await (const message of stream) {
      if (message.type === 'system' && message.session_id) sessionId = message.session_id;
      if (message.type === 'assistant') {
        for (const block of message.message?.content || []) {
          if (block.type === 'text') finalText += block.text;
        }
      }
      if (message.type === 'result') {
        if (message.subtype !== 'success' || message.is_error) throw new Error('CodeBuddy reported an unsuccessful agent run');
        completed = true;
        if (message.result) finalText = message.result;
      }
    }
    if (!completed) throw new Error('CodeBuddy ended without a successful result message');
    return { result: validateBusinessAnalysis(cleanJson(finalText)), sessionId };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { generateBusinessAnalysis };
