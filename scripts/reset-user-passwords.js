/**
 * Reset Test User Passwords in Supabase Auth
 * Run with: node scripts/reset-user-passwords.js
 */

require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Error: Missing environment variables");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testEmails = [
  "admin@acme.com",
  "john.doe@acme.com",
  "jane.smith@acme.com",
  "admin@techinnovations.com",
  "developer@techinnovations.com",
  "viewer@techinnovations.com",
  "manager@globalsolutions.com",
  "analyst@globalsolutions.com",
];

const newPassword = "Test@123456";

async function resetPasswords() {
  console.log("🔐 Resetting test user passwords...\n");

  let successCount = 0;
  let errorCount = 0;

  // First, list all users
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.error("❌ Error listing users:", listError.message);
    process.exit(1);
  }

  for (const email of testEmails) {
    try {
      const user = users.users.find((u) => u.email === email);

      if (!user) {
        console.log(`⏭️  ${email} - User not found`);
        continue;
      }

      console.log(`Resetting password for: ${email}...`);

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Success! Password reset`);
        successCount++;
      }
    } catch (err) {
      console.error(`  ❌ Exception: ${err.message}`);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Reset: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log("=".repeat(50));

  if (successCount > 0) {
    console.log("\n✨ Passwords reset successfully!");
    console.log(`\nNew password for all users: ${newPassword}`);
  }
}

resetPasswords().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
