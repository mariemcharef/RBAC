/**
 * Update User Auth IDs in Database
 * Matches database users with their Supabase Auth IDs
 * Run with: node scripts/update-user-auth-ids.js
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

async function updateUserAuthIds() {
  console.log("🔄 Updating user auth IDs...\n");

  try {
    // Get all auth users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("❌ Error listing auth users:", listError.message);
      process.exit(1);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const authUser of authUsers.users) {
      try {
        // Find database user with this email
        const { data: dbUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", authUser.email)
          .single();

        if (!dbUser) {
          console.log(`⏭️  ${authUser.email} - Not in database`);
          continue;
        }

        console.log(`Updating: ${authUser.email}...`);

        // Update the auth_id to match the Supabase Auth user ID
        const { error } = await supabaseAdmin
          .from("users")
          .update({ auth_id: authUser.id })
          .eq("id", dbUser.id);

        if (error) {
          console.error(`  ❌ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log(`  ✅ Updated auth_id`);
          successCount++;
        }
      } catch (err) {
        console.error(`  ❌ Exception: ${err.message}`);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✅ Updated: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log("=".repeat(50));

    if (successCount > 0) {
      console.log("\n✨ User auth IDs updated successfully!");
      console.log("You can now login and access the API endpoints.");
    }
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

updateUserAuthIds();
