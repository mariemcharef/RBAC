/**
 * Create Test Users in Supabase Auth
 * Run with: node scripts/create-test-users.js
 */

require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Error: Missing environment variables");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceRoleKey ? "✓" : "✗");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testUsers = [
  { email: "admin@acme.com", password: "Test@123456" },
  { email: "john.doe@acme.com", password: "Test@123456" },
  { email: "jane.smith@acme.com", password: "Test@123456" },
  { email: "admin@techinnovations.com", password: "Test@123456" },
  { email: "developer@techinnovations.com", password: "Test@123456" },
  { email: "viewer@techinnovations.com", password: "Test@123456" },
  { email: "manager@globalsolutions.com", password: "Test@123456" },
  { email: "analyst@globalsolutions.com", password: "Test@123456" },
];

async function createTestUsers() {
  console.log("🚀 Creating test users in Supabase Auth...\n");

  let successCount = 0;
  let errorCount = 0;

  for (const user of testUsers) {
    try {
      console.log(`Creating user: ${user.email}...`);

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Success! User ID: ${data.user.id}`);
        successCount++;
      }
    } catch (err) {
      console.error(`  ❌ Exception: ${err.message}`);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Created: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log("=".repeat(50));

  if (errorCount === 0) {
    console.log("\n✨ All test users created successfully!");
    console.log("\nTest credentials:");
    testUsers.forEach((user) => {
      console.log(`  📧 ${user.email} / 🔑 ${user.password}`);
    });
  }
}

createTestUsers().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
