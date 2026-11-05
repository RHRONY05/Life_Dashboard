import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createTestAgentKey } from "../helpers/agent-key";
import { resetUserData, getE2EUserId } from "../helpers/reset";
import { getAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseContent(res: any): any {
  return JSON.parse(res.content[0].text);
}

test.describe("MCP Server E2E (Streamable HTTP)", () => {
  let e2eUserId: string;

  test.beforeAll(async () => {
    e2eUserId = await getE2EUserId();
  });

  test.beforeEach(async () => {
    await resetUserData(e2eUserId);
  });

  test("Case 1: No key or invalid key returns 401 with WWW-Authenticate", async ({ request, baseURL }) => {
    const url = `${baseURL}/api/mcp`;

    // 1. No Authorization header
    const resNoHeader = await request.post(url, {
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      },
    });
    expect(resNoHeader.status()).toBe(401);
    expect(resNoHeader.headers()["www-authenticate"]).toBe('Bearer realm="life-dashboard"');
    const bodyNoHeader = await resNoHeader.json();
    expect(bodyNoHeader).toEqual({ error: "unauthorized" });

    // 2. Badly formatted key
    const resBadKey = await request.post(url, {
      headers: {
        Authorization: "Bearer invalid_key_format",
      },
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      },
    });
    expect(resBadKey.status()).toBe(401);

    // 3. Valid format but non-existent key
    const resNonExistent = await request.post(url, {
      headers: {
        Authorization: "Bearer ld_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      },
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      },
    });
    expect(resNonExistent.status()).toBe(401);
  });

  test("Case 2: Read-only key sees get_board but not add_task in tools/list", async ({ baseURL }) => {
    const secret = await createTestAgentKey("Reader Agent", ["tasks:read"]);
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseURL}/api/mcp`), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
    });

    await client.connect(transport);

    const toolList = await client.listTools();
    const toolNames = toolList.tools.map((t) => t.name);

    expect(toolNames).toContain("whoami");
    expect(toolNames).toContain("get_board");
    expect(toolNames).toContain("list_tasks");
    expect(toolNames).toContain("get_lists");

    // Write tools should NOT be present
    expect(toolNames).not.toContain("add_task");
    expect(toolNames).not.toContain("complete_task");
    expect(toolNames).not.toContain("create_list");

    await client.close();
  });

  test("Case 3 & 4: Read+write key executes tasks/trackers and populates audit log", async ({ baseURL }) => {
    const secret = await createTestAgentKey("Worker Agent", [
      "tasks:read",
      "tasks:write",
      "trackers:read",
      "trackers:write",
    ]);

    const client = new Client({ name: "test-client", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseURL}/api/mcp`), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
    });

    await client.connect(transport);

    // 1. add_task
    const addRes = await client.callTool({
      name: "add_task",
      arguments: {
        title: "MCP test task",
        note: "Added via MCP client",
      },
    });
    expect(addRes.isError).toBeFalsy();
    const taskJson = parseContent(addRes);
    expect(taskJson.title).toBe("MCP test task");
    const taskId = taskJson.id;

    // 2. get_board
    const boardRes = await client.callTool({
      name: "get_board",
      arguments: {},
    });
    expect(boardRes.isError).toBeFalsy();
    const boardJson = parseContent(boardRes);
    const todayTask = boardJson.columns.today.find((t: { id: string }) => t.id === taskId);
    expect(todayTask).toBeDefined();

    // 3. complete_task
    const completeRes = await client.callTool({
      name: "complete_task",
      arguments: { taskId },
    });
    expect(completeRes.isError).toBeFalsy();
    const completeJson = parseContent(completeRes);
    expect(completeJson.done).toBe(true);

    // 4. create_tracker with 2 items
    const trackerRes = await client.callTool({
      name: "create_tracker",
      arguments: {
        name: "MCP Tracker",
        description: "Created by worker",
        items: [
          { title: "Item 1", groupName: "Group A" },
          { title: "Item 2", groupName: "Group A" },
        ],
      },
    });
    expect(trackerRes.isError).toBeFalsy();
    const trackerJson = parseContent(trackerRes);
    const trackerId = trackerJson.id;

    // Fetch tracker detail to get item id
    const getTrackerRes = await client.callTool({
      name: "get_tracker",
      arguments: { trackerId },
    });
    const trackerDetail = parseContent(getTrackerRes);
    const firstItemId = trackerDetail.groups[0].items[0].id;

    // 5. schedule_item
    const schedRes = await client.callTool({
      name: "schedule_item",
      arguments: {
        itemId: firstItemId,
        day: "today",
      },
    });
    expect(schedRes.isError).toBeFalsy();

    await client.close();

    // Case 4: Verify audit log entries in DB
    const admin = getAdminClient();
    const { data: auditRows } = await admin
      .from("agent_audit")
      .select("*")
      .eq("user_id", e2eUserId)
      .order("id", { ascending: true });

    expect(auditRows).toBeDefined();
    expect(auditRows!.length).toBeGreaterThanOrEqual(4);

    const toolsCalled = auditRows!.map((r) => r.tool);
    expect(toolsCalled).toContain("add_task");
    expect(toolsCalled).toContain("get_board");
    expect(toolsCalled).toContain("complete_task");
    expect(toolsCalled).toContain("create_tracker");
    expect(toolsCalled).toContain("schedule_item");

    // All results should be "ok"
    for (const row of auditRows!) {
      expect(row.result).toBe("ok");
    }
  });

  test("Case 5: Revoked key immediately gets 401 and denied audit row", async ({ request, baseURL }) => {
    const secret = await createTestAgentKey("Revocable Agent", ["tasks:read"]);
    const admin = getAdminClient();

    // Revoke the key directly in DB
    const nowIso = new Date().toISOString();
    await admin
      .from("api_keys")
      .update({ revoked_at: nowIso })
      .eq("user_id", e2eUserId)
      .eq("name", "Revocable Agent");

    // Attempt request with revoked key
    const res = await request.post(`${baseURL}/api/mcp`, {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
      data: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "whoami",
          arguments: {},
        },
      },
    });

    expect(res.status()).toBe(401);

    // Check denied audit entry was recorded
    const { data: auditRows } = await admin
      .from("agent_audit")
      .select("*")
      .eq("user_id", e2eUserId)
      .eq("tool", "auth")
      .eq("result", "denied");

    expect(auditRows).toBeDefined();
    expect(auditRows!.length).toBeGreaterThan(0);
    expect(auditRows![0].summary).toBe("revoked key used");
  });

  test("Case 6: 31 rapid calls triggers rate_limited on 31st call", async ({ baseURL }) => {
    const secret = await createTestAgentKey("Speedy Agent", ["tasks:read"]);
    const client = new Client({ name: "speed-client", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseURL}/api/mcp`), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
    });

    await client.connect(transport);

    // Perform 30 rapid calls
    for (let i = 0; i < 30; i++) {
      const res = await client.callTool({
        name: "whoami",
        arguments: {},
      });
      expect(res.isError).toBeFalsy();
    }

    // 31st call should be rate limited
    const limitedRes = await client.callTool({
      name: "whoami",
      arguments: {},
    });

    expect(limitedRes.isError).toBe(true);
    const content = (limitedRes as { content?: Array<{ type: string; text?: string }> }).content;
    const text = content?.[0]?.text ?? "";
    expect(text).toMatch(/^rate_limited: try again in \d+ seconds$/);

    await client.close();
  });

  test("Case 7: Notes & Canvas agent tools (create, get, list, sub-page, append, stale conflict, and scope isolation)", async ({ baseURL }) => {
    const secret = await createTestAgentKey("Canvas Agent", [
      "notes:read",
      "notes:write",
    ]);

    const client = new Client({ name: "canvas-client", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseURL}/api/mcp`), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
    });

    await client.connect(transport);

    // 1. create_note
    const createRes = await client.callTool({
      name: "create_note",
      arguments: {
        title: "Parent Page",
        markdown: "# Section One\nContent for section one\n\n# Section Two\nContent for section two",
      },
    });
    expect(createRes.isError).toBeFalsy();
    const createdPage = parseContent(createRes);
    expect(createdPage.title).toBe("Parent Page");

    // 2. get_note by title
    const getRes = await client.callTool({
      name: "get_note",
      arguments: {
        note: "Parent Page",
      },
    });
    expect(getRes.isError).toBeFalsy();
    const noteData = parseContent(getRes);
    expect(noteData.markdown).toContain("Section One");
    const parentUpdatedAt = noteData.updatedAt;

    // 3. list_notes returns headings and paths
    const listRes = await client.callTool({
      name: "list_notes",
      arguments: {},
    });
    expect(listRes.isError).toBeFalsy();
    const listData = parseContent(listRes);
    const foundParent = listData.pages.find((p: { title: string }) => p.title === "Parent Page");
    expect(foundParent).toBeDefined();
    expect(foundParent.headings).toContain("Section One");
    expect(foundParent.headings).toContain("Section Two");

    // 4. create_note with parent -> path is "Parent / Child"
    const subRes = await client.callTool({
      name: "create_note",
      arguments: {
        title: "Child Page",
        parent: "Parent Page",
        markdown: "Sub page content",
      },
    });
    expect(subRes.isError).toBeFalsy();
    const subData = parseContent(subRes);
    expect(subData.path).toBe("Parent Page / Child Page");

    // 5. append_to_note under a heading
    const appendRes = await client.callTool({
      name: "append_to_note",
      arguments: {
        note: "Parent Page",
        underHeading: "Section One",
        markdown: "- Appended bullet point",
      },
    });
    expect(appendRes.isError).toBeFalsy();

    // Verify get_note has appended item
    const getUpdatedRes = await client.callTool({
      name: "get_note",
      arguments: { note: "Parent Page" },
    });
    const updatedNote = parseContent(getUpdatedRes);
    expect(updatedNote.markdown).toContain("- Appended bullet point");

    // 6. replace_note_section with stale expectedUpdatedAt returns conflict: stale
    const replaceRes = await client.callTool({
      name: "replace_note_section",
      arguments: {
        note: "Parent Page",
        heading: "Section One",
        markdown: "New section content",
        expectedUpdatedAt: parentUpdatedAt, // stale timestamp before append
      },
    });
    expect(replaceRes.isError).toBe(true);
    const replaceContent = (replaceRes as { content?: Array<{ type: string; text?: string }> }).content;
    const replaceErrText = replaceContent?.[0]?.text ?? "";
    expect(replaceErrText).toContain("conflict: stale");

    await client.close();

    // 7. Key without notes:write doesn't see write tools
    const readSecret = await createTestAgentKey("Canvas Reader", ["notes:read"]);
    const readClient = new Client({ name: "read-client", version: "1.0.0" });
    const readTransport = new StreamableHTTPClientTransport(new URL(`${baseURL}/api/mcp`), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${readSecret}`,
        },
      },
    });
    await readClient.connect(readTransport);
    const readTools = await readClient.listTools();
    const readToolNames = readTools.tools.map((t) => t.name);

    expect(readToolNames).toContain("list_notes");
    expect(readToolNames).toContain("get_note");
    expect(readToolNames).not.toContain("create_note");
    expect(readToolNames).not.toContain("append_to_note");
    expect(readToolNames).not.toContain("replace_note_section");
    expect(readToolNames).not.toContain("update_note");

    await readClient.close();
  });
});
