export async function lookupWorkBuddyResults(runId, requestJSON, apiURL) {
  const id = String(runId ?? "").trim();
  if (!id) throw new Error("Enter a run ID to look up WorkBuddy results.");
  try {
    const result = await requestJSON(apiURL("/api/results?runId=" + encodeURIComponent(id)));
    if (result?.found === false || result?.status === "not_found" || (typeof result?.error === "string" && /not found/i.test(result.error))) {
      throw Object.assign(new Error("No WorkBuddy run was found for that run ID. Check the ID and try again."), { status: 404 });
    }
    return result;
  } catch (error) {
    if (error?.status === 404) throw new Error("No WorkBuddy run was found for that run ID. Check the ID and try again.");
    throw error;
  }
}
