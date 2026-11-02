const baseUrl = "https://life-rony.vercel.app";
const email = process.env.ALLOWED_EMAIL || "muhammadrony147@gmail.com";
const password = process.env.OWNER_PASSWORD;

if (!password) {
  throw new Error("OWNER_PASSWORD is missing in environment");
}

console.log(`Checking production URL: ${baseUrl}`);

// 1. Unauthenticated root redirect
const rootRes = await fetch(baseUrl, { redirect: "manual" });
console.log(`Unauth / redirect status: ${rootRes.status} (expected 307)`);
if (rootRes.status !== 307) {
  throw new Error(`Expected 307 redirect, got ${rootRes.status}`);
}

// 2. Login
const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
console.log(`Login status: ${loginRes.status} (expected 200)`);
if (!loginRes.ok) {
  const text = await loginRes.text();
  throw new Error(`Login failed: ${text}`);
}

// Extract cookies
const setCookie = loginRes.headers.getSetCookie();
const cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");

// 3. Get board
const boardRes = await fetch(`${baseUrl}/api/board`, {
  headers: { Cookie: cookieHeader },
});
console.log(`Get board status: ${boardRes.status}`);
const data = await boardRes.json();
console.log("Board data received:", JSON.stringify(data, null, 2));
const board = data;
console.log(
  `Board columns received: yesterday=${board.columns.yesterday.length} tasks, today=${board.columns.today.length} tasks, tomorrow=${board.columns.tomorrow.length} tasks`
);

// 4. Create a production check task
const createRes = await fetch(`${baseUrl}/api/tasks`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookieHeader,
  },
  body: JSON.stringify({
    title: "Prod verification task",
    dueOn: "today",
    note: "Automated verification for Goal 1 M1",
  }),
});
console.log(`Create task status: ${createRes.status}`);
if (!createRes.ok) {
  const errText = await createRes.text();
  throw new Error(`Create task failed (${createRes.status}): ${errText}`);
}
const task = await createRes.json();
console.log(`Created task id: ${task.id}, title: ${task.title}`);

// 5. Tick task as done
const updateRes = await fetch(`${baseUrl}/api/tasks/${task.id}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookieHeader,
  },
  body: JSON.stringify({
    done: true,
  }),
});
console.log(`Update task (tick done) status: ${updateRes.status}`);
if (!updateRes.ok) {
  const errText = await updateRes.text();
  throw new Error(`Update task failed (${updateRes.status}): ${errText}`);
}
const updated = await updateRes.json();
console.log(`Task done status: ${updated.done}`);

// 6. Delete task to clean up
const delRes = await fetch(`${baseUrl}/api/tasks/${task.id}`, {
  method: "DELETE",
  headers: { Cookie: cookieHeader },
});
console.log(`Delete task status: ${delRes.status}`);
if (delRes.status !== 204) {
  throw new Error(`Expected 204 No Content for delete, got ${delRes.status}`);
}

console.log("✅ Production check completed successfully!");
