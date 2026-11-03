import { getAdminClient } from "@/lib/supabase/admin";

export const E2E_USER_ID = "dc69c1f3-8c23-41c5-841b-9b05a2dceb20";

export async function getE2EUserId(): Promise<string> {
  const admin = getAdminClient();
  const e2eEmail = process.env.E2E_EMAIL || "e2e+vocab@gmail.com";
  const { data, error } = await admin.auth.admin.listUsers();
  if (error || !data) {
    throw new Error(`Failed to list users to find e2e user: ${error?.message}`);
  }
  const e2eUser = data.users.find((u) => u.email === e2eEmail);
  if (!e2eUser) {
    throw new Error(`E2E user ${e2eEmail} not found in Supabase Auth`);
  }
  return e2eUser.id;
}

/**
 * Reset test helper: Deletes all Life Dashboard rows for the given userId.
 * STRICT SAFETY RULE: Throws immediately if userId is not the e2e test user.
 * Never touches Vocab's tables (words, quiz_attempts).
 */
export async function resetUserData(targetUserId: string): Promise<void> {
  const e2eUserId = await getE2EUserId();

  if (targetUserId !== e2eUserId) {
    throw new Error(
      `[Safety Violation] resetUserData refused non-e2e user id: ${targetUserId}. Only the e2e user (${e2eUserId}) may be reset.`
    );
  }

  const admin = getAdminClient();

  // Deletion in foreign-key dependency order
  await admin.from("agent_audit").delete().eq("user_id", targetUserId);
  await admin.from("api_keys").delete().eq("user_id", targetUserId);
  await admin.from("reminder_log").delete().eq("user_id", targetUserId);
  await admin.from("tasks").delete().eq("user_id", targetUserId);
  await admin.from("task_lists").delete().eq("user_id", targetUserId);
  await admin.from("tracker_items").delete().eq("user_id", targetUserId);
  await admin.from("trackers").delete().eq("user_id", targetUserId);
  await admin.from("expenses").delete().eq("user_id", targetUserId);
  await admin.from("user_settings").delete().eq("user_id", targetUserId);
  await admin.from("iou_entries").delete().eq("user_id", targetUserId);
  await admin.from("people").delete().eq("user_id", targetUserId);
  await admin.from("renewals").delete().eq("user_id", targetUserId);
  await admin.from("links").delete().eq("user_id", targetUserId);
  await admin.from("notes").delete().eq("user_id", targetUserId);

  // Clean up life-notes storage bucket under targetUserId/
  if (admin.storage) {
    try {
      const { data: noteFolders } = await admin.storage
        .from("life-notes")
        .list(targetUserId);

      if (noteFolders && noteFolders.length > 0) {
        for (const folder of noteFolders) {
          const subPath = `${targetUserId}/${folder.name}`;
          const { data: files } = await admin.storage
            .from("life-notes")
            .list(subPath);

          if (files && files.length > 0) {
            const filePaths = files.map((f) => `${subPath}/${f.name}`);
            await admin.storage.from("life-notes").remove(filePaths);
          }
        }
      }
    } catch (storageErr) {
      console.error("Failed to clean up test storage in life-notes:", storageErr);
    }
  }
}
