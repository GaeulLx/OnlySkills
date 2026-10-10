// Documentation-based CodeBuddy Agent SDK smoke test.
// Requires an approved account and compatible CodeBuddy CLI/runtime. Not live-tested here.
import 'dotenv/config';
import { query } from '@tencent-ai/agent-sdk';

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), Number(process.env.CODEBUDDY_TIMEOUT_MS) || 90000);
const env = {};
for (const key of ['CODEBUDDY_API_KEY', 'CODEBUDDY_AUTH_TOKEN', 'CODEBUDDY_INTERNET_ENVIRONMENT']) {
  if (process.env[key]) env[key] = process.env[key];
}

try {
  let completed = false;
  for await (const message of query({
    prompt: 'Write one short welcome sentence for OnlySkills. Use only this prompt; do not read files, run commands, or use external services.',
    options: {
      abortController: controller,
      permissionMode: 'plan',
      maxTurns: 3,
      // The SDK otherwise hides the local CLI's stderr, which is needed to
      // diagnose a child-process exit such as "Transport closed".
      stderr: (data) => process.stderr.write(`[CodeBuddy CLI] ${data}`),
      ...(Object.keys(env).length ? { env } : {}),
      ...(process.env.CODEBUDDY_CODE_PATH ? { pathToCodebuddyCode: process.env.CODEBUDDY_CODE_PATH } : {}),
      canUseTool: async () => ({ behavior: 'deny', message: 'This demonstration permits no permission-requiring actions.' })
    }
  })) {
    if (message.type !== 'result') continue;
    if (message.subtype !== 'success' || message.is_error) throw new Error(JSON.stringify(message.errors ?? ['Agent did not succeed']));
    completed = true;
    console.log(JSON.stringify({ session_id: message.session_id, result: message.result }));
  }
  if (!completed) throw new Error('No successful result message was received.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
