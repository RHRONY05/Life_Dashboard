const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const PROD_URL = "https://life-rony.vercel.app";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vnadntttnwylvarcqwhe.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY not found in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: class MockWS {} },
});

async function main() {
  console.log("=== V8 Production Check: MCP Server (/api/mcp) ===");

  // Get owner user id
  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) throw userError;
  const owner = userData.users.find(u => u.email === "muhammadrony147@gmail.com");
  if (!owner) throw new Error("Owner user not found");
  const userId = owner.id;

  // Case 1: No key returns 401
  console.log("\n1. Testing Case 1: No key returns 401 with WWW-Authenticate...");
  const resNoKey = await fetch(`${PROD_URL}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
  });
  console.log("  Status:", resNoKey.status);
  console.log("  WWW-Authenticate:", resNoKey.headers.get("www-authenticate"));
  if (resNoKey.status !== 401) throw new Error("Expected 401 for no key");

  // Create temporary test key
  console.log("\n2. Creating temporary test key for Cases 2 and 3...");
  const rawSecret = "ld_" + crypto.randomBytes(32).toString("base64url");
  const prefix = rawSecret.slice(0, 11);
  const hash = crypto.createHash("sha256").update(rawSecret).digest("hex");
  const keyName = `ProdCheck-${Date.now()}`;

  const { data: keyRow, error: keyErr } = await supabase
    .from("api_keys")
    .insert({
      user_id: userId,
      name: keyName,
      key_hash: hash,
      prefix: prefix,
      scopes: ["tasks:read", "tasks:write", "trackers:read", "trackers:write"],
    })
    .select()
    .single();

  if (keyErr) throw keyErr;
  console.log("  Created key:", keyName, "id:", keyRow.id);

  try {
    // Case 2 & 3: Connect MCP client with Streamable HTTP transport
    console.log("\n3. Connecting official MCP Client to production /api/mcp...");
    const transport = new StreamableHTTPClientTransport(
      new URL(`${PROD_URL}/api/mcp`),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${rawSecret}`,
          },
        },
      }
    );

    const client = new Client(
      { name: "prod-check-client", version: "1.0.0" },
      { capabilities: {} }
    );
    await client.connect(transport);
    console.log("  MCP client connected successfully via Streamable HTTP!");

    // List tools
    const tools = await client.listTools();
    console.log(`  Tools returned: ${tools.tools.length} tools`);
    const toolNames = tools.tools.map(t => t.name);
    console.log("  Sample tools:", toolNames.slice(0, 8).join(", "));
    if (!toolNames.includes("get_board") || !toolNames.includes("add_task")) {
      throw new Error("Expected get_board and add_task in tools list");
    }

    // Call add_task
    console.log("\n4. Testing Case 3: Calling add_task...");
    const addRes = await client.callTool({
      name: "add_task",
      arguments: {
        title: "Prod check task from MCP",
        note: "Automated verification",
      },
    });
    console.log("  add_task result:", addRes);
    const taskData = JSON.parse(addRes.content[0].text);
    console.log("  Created task ID:", taskData.id, "title:", taskData.title);

    // Call get_board
    console.log("\n5. Testing get_board to verify task appears...");
    const boardRes = await client.callTool({
      name: "get_board",
      arguments: {},
    });
    const boardData = JSON.parse(boardRes.content[0].text);
    const found = boardData.columns.today.find(t => t.id === taskData.id);
    console.log("  Task found on Today column:", !!found);
    if (!found) throw new Error("Task not found on board");

    // Complete task
    console.log("\n6. Completing task via complete_task tool...");
    const compRes = await client.callTool({
      name: "complete_task",
      arguments: { taskId: taskData.id },
    });
    console.log("  complete_task result:", compRes.content[0].text);

    // Clean up task from DB
    await supabase.from("tasks").delete().eq("id", taskData.id);
    console.log("  Cleaned up test task from database.");

    await client.close();
  } finally {
    // Revoke key
    console.log("\n7. Revoking temporary test key...");
    await supabase.from("api_keys").delete().eq("id", keyRow.id);
    console.log("  Temporary test key deleted cleanly.");
  }

  console.log("\n=== V8 Production Check PASSED completely! ===");
}

main().catch(err => {
  console.error("Prod check failed:", err);
  process.exit(1);
});
