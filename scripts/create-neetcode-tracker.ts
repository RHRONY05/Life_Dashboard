import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { getAdminClient } from "@/lib/supabase/admin";
import { generateKey, hashKey, keyPrefix } from "@/lib/domain/keys";
import { Scope } from "@/lib/schemas";

const PROD_URL = "https://life-rony.vercel.app";

const NEETCODE_150_GROUPS: Array<{ group: string; problems: Array<{ title: string; slug: string }> }> = [
  {
    group: "Arrays & Hashing",
    problems: [
      { title: "Contains Duplicate", slug: "contains-duplicate" },
      { title: "Valid Anagram", slug: "valid-anagram" },
      { title: "Two Sum", slug: "two-sum" },
      { title: "Group Anagrams", slug: "group-anagrams" },
      { title: "Top K Frequent Elements", slug: "top-k-frequent-elements" },
      { title: "Product of Array Except Self", slug: "product-of-array-except-self" },
      { title: "Valid Sudoku", slug: "valid-sudoku" },
      { title: "Encode and Decode Strings", slug: "encode-and-decode-strings" },
      { title: "Longest Consecutive Sequence", slug: "longest-consecutive-sequence" },
    ],
  },
  {
    group: "Two Pointers",
    problems: [
      { title: "Valid Palindrome", slug: "valid-palindrome" },
      { title: "Two Sum II Input Array Is Sorted", slug: "two-sum-ii-input-array-is-sorted" },
      { title: "3Sum", slug: "3sum" },
      { title: "Container With Most Water", slug: "container-with-most-water" },
      { title: "Trapping Rain Water", slug: "trapping-rain-water" },
    ],
  },
  {
    group: "Sliding Window",
    problems: [
      { title: "Best Time to Buy And Sell Stock", slug: "best-time-to-buy-and-sell-stock" },
      { title: "Longest Substring Without Repeating Characters", slug: "longest-substring-without-repeating-characters" },
      { title: "Longest Repeating Character Replacement", slug: "longest-repeating-character-replacement" },
      { title: "Permutation In String", slug: "permutation-in-string" },
      { title: "Minimum Window Substring", slug: "minimum-window-substring" },
      { title: "Sliding Window Maximum", slug: "sliding-window-maximum" },
    ],
  },
  {
    group: "Stack",
    problems: [
      { title: "Valid Parentheses", slug: "valid-parentheses" },
      { title: "Min Stack", slug: "min-stack" },
      { title: "Evaluate Reverse Polish Notation", slug: "evaluate-reverse-polish-notation" },
      { title: "Generate Parentheses", slug: "generate-parentheses" },
      { title: "Daily Temperatures", slug: "daily-temperatures" },
      { title: "Car Fleet", slug: "car-fleet" },
      { title: "Largest Rectangle In Histogram", slug: "largest-rectangle-in-histogram" },
    ],
  },
  {
    group: "Binary Search",
    problems: [
      { title: "Binary Search", slug: "binary-search" },
      { title: "Search a 2D Matrix", slug: "search-a-2d-matrix" },
      { title: "Koko Eating Bananas", slug: "koko-eating-bananas" },
      { title: "Find Minimum In Rotated Sorted Array", slug: "find-minimum-in-rotated-sorted-array" },
      { title: "Search In Rotated Sorted Array", slug: "search-in-rotated-sorted-array" },
      { title: "Time Based Key-Value Store", slug: "time-based-key-value-store" },
      { title: "Median of Two Sorted Arrays", slug: "median-of-two-sorted-arrays" },
    ],
  },
  {
    group: "Linked List",
    problems: [
      { title: "Reverse Linked List", slug: "reverse-linked-list" },
      { title: "Merge Two Sorted Lists", slug: "merge-two-sorted-lists" },
      { title: "Reorder List", slug: "reorder-list" },
      { title: "Remove Nth Node From End of List", slug: "remove-nth-node-from-end-of-list" },
      { title: "Copy List With Random Pointer", slug: "copy-list-with-random-pointer" },
      { title: "Add Two Numbers", slug: "add-two-numbers" },
      { title: "Linked List Cycle", slug: "linked-list-cycle" },
      { title: "Find The Duplicate Number", slug: "find-the-duplicate-number" },
      { title: "LRU Cache", slug: "lru-cache" },
      { title: "Merge K Sorted Lists", slug: "merge-k-sorted-lists" },
      { title: "Reverse Nodes In K-Group", slug: "reverse-nodes-in-k-group" },
    ],
  },
  {
    group: "Trees",
    problems: [
      { title: "Invert Binary Tree", slug: "invert-binary-tree" },
      { title: "Maximum Depth of Binary Tree", slug: "maximum-depth-of-binary-tree" },
      { title: "Diameter of Binary Tree", slug: "diameter-of-binary-tree" },
      { title: "Balanced Binary Tree", slug: "balanced-binary-tree" },
      { title: "Same Tree", slug: "same-tree" },
      { title: "Subtree of Another Tree", slug: "subtree-of-another-tree" },
      { title: "Lowest Common Ancestor of a Binary Search Tree", slug: "lowest-common-ancestor-of-a-binary-search-tree" },
      { title: "Binary Tree Level Order Traversal", slug: "binary-tree-level-order-traversal" },
      { title: "Binary Tree Right Side View", slug: "binary-tree-right-side-view" },
      { title: "Count Good Nodes In Binary Tree", slug: "count-good-nodes-in-binary-tree" },
      { title: "Validate Binary Search Tree", slug: "validate-binary-search-tree" },
      { title: "Kth Smallest Element In a Bst", slug: "kth-smallest-element-in-a-bst" },
      { title: "Construct Binary Tree From Preorder And Inorder Traversal", slug: "construct-binary-tree-from-preorder-and-inorder-traversal" },
      { title: "Binary Tree Maximum Path Sum", slug: "binary-tree-maximum-path-sum" },
      { title: "Serialize And Deserialize Binary Tree", slug: "serialize-and-deserialize-binary-tree" },
    ],
  },
  {
    group: "Tries",
    problems: [
      { title: "Implement Trie Prefix Tree", slug: "implement-trie-prefix-tree" },
      { title: "Design Add And Search Words Data Structure", slug: "design-add-and-search-words-data-structure" },
      { title: "Word Search II", slug: "word-search-ii" },
    ],
  },
  {
    group: "Heap / Priority Queue",
    problems: [
      { title: "Kth Largest Element In a Stream", slug: "kth-largest-element-in-a-stream" },
      { title: "Last Stone Weight", slug: "last-stone-weight" },
      { title: "K Closest Points to Origin", slug: "k-closest-points-to-origin" },
      { title: "Kth Largest Element In An Array", slug: "kth-largest-element-in-an-array" },
      { title: "Task Scheduler", slug: "task-scheduler" },
      { title: "Design Twitter", slug: "design-twitter" },
      { title: "Find Median From Data Stream", slug: "find-median-from-data-stream" },
    ],
  },
  {
    group: "Backtracking",
    problems: [
      { title: "Subsets", slug: "subsets" },
      { title: "Combination Sum", slug: "combination-sum" },
      { title: "Permutations", slug: "permutations" },
      { title: "Subsets II", slug: "subsets-ii" },
      { title: "Combination Sum II", slug: "combination-sum-ii" },
      { title: "Word Search", slug: "word-search" },
      { title: "Palindrome Partitioning", slug: "palindrome-partitioning" },
      { title: "Letter Combinations of a Phone Number", slug: "letter-combinations-of-a-phone-number" },
      { title: "N-Queens", slug: "n-queens" },
    ],
  },
  {
    group: "Graphs",
    problems: [
      { title: "Number of Islands", slug: "number-of-islands" },
      { title: "Clone Graph", slug: "clone-graph" },
      { title: "Max Area of Island", slug: "max-area-of-island" },
      { title: "Pacific Atlantic Water Flow", slug: "pacific-atlantic-water-flow" },
      { title: "Surrounded Regions", slug: "surrounded-regions" },
      { title: "Rotting Oranges", slug: "rotting-oranges" },
      { title: "Walls And Gates", slug: "walls-and-gates" },
      { title: "Course Schedule", slug: "course-schedule" },
      { title: "Course Schedule II", slug: "course-schedule-ii" },
      { title: "Redundant Connection", slug: "redundant-connection" },
      { title: "Number of Connected Components In An Undirected Graph", slug: "number-of-connected-components-in-an-undirected-graph" },
      { title: "Graph Valid Tree", slug: "graph-valid-tree" },
      { title: "Word Ladder", slug: "word-ladder" },
    ],
  },
  {
    group: "Advanced Graphs",
    problems: [
      { title: "Reconstruct Itinerary", slug: "reconstruct-itinerary" },
      { title: "Min Cost to Connect All Points", slug: "min-cost-to-connect-all-points" },
      { title: "Network Delay Time", slug: "network-delay-time" },
      { title: "Swim In Rising Water", slug: "swim-in-rising-water" },
      { title: "Alien Dictionary", slug: "alien-dictionary" },
      { title: "Cheapest Flights Within K Stops", slug: "cheapest-flights-within-k-stops" },
    ],
  },
  {
    group: "1-D Dynamic Programming",
    problems: [
      { title: "Climbing Stairs", slug: "climbing-stairs" },
      { title: "Min Cost Climbing Stairs", slug: "min-cost-climbing-stairs" },
      { title: "House Robber", slug: "house-robber" },
      { title: "House Robber II", slug: "house-robber-ii" },
      { title: "Longest Palindromic Substring", slug: "longest-palindromic-substring" },
      { title: "Palindromic Substrings", slug: "palindromic-substrings" },
      { title: "Decode Ways", slug: "decode-ways" },
      { title: "Coin Change", slug: "coin-change" },
      { title: "Maximum Product Subarray", slug: "maximum-product-subarray" },
      { title: "Word Break", slug: "word-break" },
      { title: "Longest Increasing Subsequence", slug: "longest-increasing-subsequence" },
      { title: "Partition Equal Subset Sum", slug: "partition-equal-subset-sum" },
    ],
  },
  {
    group: "2-D Dynamic Programming",
    problems: [
      { title: "Unique Paths", slug: "unique-paths" },
      { title: "Longest Common Subsequence", slug: "longest-common-subsequence" },
      { title: "Best Time to Buy And Sell Stock With Cooldown", slug: "best-time-to-buy-and-sell-stock-with-cooldown" },
      { title: "Coin Change II", slug: "coin-change-ii" },
      { title: "Target Sum", slug: "target-sum" },
      { title: "Interleaving String", slug: "interleaving-string" },
      { title: "Longest Increasing Path In a Matrix", slug: "longest-increasing-path-in-a-matrix" },
      { title: "Distinct Subsequences", slug: "distinct-subsequences" },
      { title: "Edit Distance", slug: "edit-distance" },
      { title: "Burst Balloons", slug: "burst-balloons" },
      { title: "Regular Expression Matching", slug: "regular-expression-matching" },
    ],
  },
  {
    group: "Greedy",
    problems: [
      { title: "Maximum Subarray", slug: "maximum-subarray" },
      { title: "Jump Game", slug: "jump-game" },
      { title: "Jump Game II", slug: "jump-game-ii" },
      { title: "Gas Station", slug: "gas-station" },
      { title: "Hand of Straights", slug: "hand-of-straights" },
      { title: "Merge Triplets to Form Target Triplet", slug: "merge-triplets-to-form-target-triplet" },
      { title: "Partition Labels", slug: "partition-labels" },
      { title: "Valid Parenthesis String", slug: "valid-parenthesis-string" },
    ],
  },
  {
    group: "Intervals",
    problems: [
      { title: "Insert Interval", slug: "insert-interval" },
      { title: "Merge Intervals", slug: "merge-intervals" },
      { title: "Non-Overlapping Intervals", slug: "non-overlapping-intervals" },
      { title: "Meeting Rooms", slug: "meeting-rooms" },
      { title: "Meeting Rooms II", slug: "meeting-rooms-ii" },
      { title: "Minimum Interval to Include Each Query", slug: "minimum-interval-to-include-each-query" },
    ],
  },
  {
    group: "Math & Geometry",
    problems: [
      { title: "Rotate Image", slug: "rotate-image" },
      { title: "Spiral Matrix", slug: "spiral-matrix" },
      { title: "Set Matrix Zeroes", slug: "set-matrix-zeroes" },
      { title: "Happy Number", slug: "happy-number" },
      { title: "Plus One", slug: "plus-one" },
      { title: "Pow(x, n)", slug: "powx-n" },
      { title: "Multiply Strings", slug: "multiply-strings" },
      { title: "Detect Squares", slug: "detect-squares" },
    ],
  },
  {
    group: "Bit Manipulation",
    problems: [
      { title: "Single Number", slug: "single-number" },
      { title: "Number of 1 Bits", slug: "number-of-1-bits" },
      { title: "Counting Bits", slug: "counting-bits" },
      { title: "Reverse Bits", slug: "reverse-bits" },
      { title: "Missing Number", slug: "missing-number" },
      { title: "Sum of Two Integers", slug: "sum-of-two-integers" },
      { title: "Reverse Integer", slug: "reverse-integer" },
    ],
  },
];

async function main() {
  console.log("=== V9: Connect Antigravity & Create 'NeetCode 150' Tracker ===");

  const admin = getAdminClient();
  const { data: usersData, error: userError } = await admin.auth.admin.listUsers();
  if (userError) throw userError;

  const ownerEmail = process.env.ALLOWED_EMAIL || "muhammadrony147@gmail.com";
  const owner = usersData.users.find((u) => u.email === ownerEmail);
  if (!owner) throw new Error("Owner user not found");

  // Check if "Antigravity" key already exists, otherwise create it
  const { data: existingKeys, error: keysErr } = await admin
    .from("api_keys")
    .select("id, name, prefix, revoked_at")
    .eq("user_id", owner.id)
    .eq("name", "Antigravity");

  if (keysErr) throw keysErr;

  let activeSecret: string | null = null;
  const activeKey = existingKeys?.find((k) => !k.revoked_at);

  if (activeKey) {
    console.log(`Found existing active key for Antigravity (id: ${activeKey.id}, prefix: ${activeKey.prefix})`);
    console.log("Generating fresh Antigravity key for authentic live MCP connection...");
    // Revoke old key and create fresh active one so we have the plaintext secret
    await admin.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", activeKey.id);
  }

  const rawKey = generateKey();
  const prefix = keyPrefix(rawKey);
  const hash = hashKey(rawKey);
  const scopes: Scope[] = [
    "tasks:read",
    "tasks:write",
    "trackers:read",
    "trackers:write",
    "renewals:read",
    "renewals:write",
    "money:read",
    "links:read",
    "notes:read",
    "notes:write",
  ];

  const { data: newKeyRow, error: insertErr } = await admin
    .from("api_keys")
    .insert({
      user_id: owner.id,
      name: "Antigravity",
      key_hash: hash,
      prefix: prefix,
      scopes: scopes,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;
  activeSecret = rawKey;
  console.log(`Created new Antigravity API key (id: ${newKeyRow.id}, prefix: ${prefix})`);

  // Build items array
  const allItems: Array<{ title: string; group?: string; url?: string }> = [];
  for (const g of NEETCODE_150_GROUPS) {
    for (const p of g.problems) {
      allItems.push({
        title: p.title,
        group: g.group,
        url: `https://leetcode.com/problems/${p.slug}/`,
      });
    }
  }

  console.log(`Prepared ${allItems.length} NeetCode problems across ${NEETCODE_150_GROUPS.length} groups.`);

  // Connect to production MCP server using official SDK
  console.log(`\nConnecting Antigravity to ${PROD_URL}/api/mcp via Streamable HTTP...`);
  const transport = new StreamableHTTPClientTransport(
    new URL(`${PROD_URL}/api/mcp`),
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${activeSecret}`,
        },
      },
    }
  );

  const client = new Client(
    { name: "Antigravity", version: "2.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("Antigravity MCP client connected successfully!");

  // Call whoami
  const whoamiRes = await client.callTool({ name: "whoami", arguments: {} });
  console.log("whoami response:", (whoamiRes as any).content[0].text);

  // Check if "NeetCode 150" tracker already exists
  const listRes = await client.callTool({ name: "list_trackers", arguments: {} });
  const listData = JSON.parse((listRes as any).content[0].text);
  const existingNc = listData.trackers.find((t: any) => t.name === "NeetCode 150");

  if (existingNc) {
    console.log(`Tracker "NeetCode 150" already exists (id: ${existingNc.id}, ${existingNc.total} items).`);
  } else {
    console.log("Calling MCP tool create_tracker with all 150 items...");
    const createRes = await client.callTool({
      name: "create_tracker",
      arguments: {
        name: "NeetCode 150",
        description: "150 essential LeetCode coding interview patterns and data structures",
        items: allItems,
      },
    });

    const createdTracker = JSON.parse((createRes as any).content[0].text);
    console.log(`\nSuccessfully created tracker via MCP: "${createdTracker.name}"!`);
    console.log(`Total items: ${createdTracker.total}, Groups: ${createdTracker.groups?.length || NEETCODE_150_GROUPS.length}`);
  }

  // Verify Audit log on production
  const { data: auditRows, error: auditErr } = await admin
    .from("agent_audit")
    .select("tool, result, summary, agent_name, created_at")
    .eq("user_id", owner.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!auditErr && auditRows) {
    console.log("\nLatest Production Activity Log:");
    for (const a of auditRows) {
      console.log(`  [${a.result}] ${a.agent_name} -> ${a.tool}: ${a.summary} (${a.created_at})`);
    }
  }

  await client.close();
  console.log("\n=== V9 NeetCode Tracker & Agent Connection Complete! ===");
}

main().catch((err) => {
  console.error("V9 execution failed:", err);
  process.exit(1);
});
