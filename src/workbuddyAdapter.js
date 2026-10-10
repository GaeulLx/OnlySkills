// This adapter remains manual-only for WorkBuddy/Tencent Docs artifact creation.
// CodeBuddy agent invocation is a separate integration in codebuddyAdapter.js.
async function createArtifact(_type, _content) {
  return { mode: 'manual', status: 'not_created', message: 'Create the artifact in WorkBuddy/Tencent Docs manually; no document API is configured.' };
}

module.exports = { createArtifact };
