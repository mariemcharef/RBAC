/**
 * Sync Supabase Auth Users to Database
 * Run with: node scripts/sync-users-to-db.js
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

async function syncUsersToDb() {
  console.log("🔄 Syncing Supabase Auth users to database...\n");

  try {
    // Get all users from Supabase Auth
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("❌ Error listing auth users:", listError.message);
      process.exit(1);
    }

    console.log(`Found ${authUsers.users.length} auth users\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const authUser of authUsers.users) {
      try {
        console.log(`Syncing: ${authUser.email}...`);

        // Check if user already exists in database
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("auth_id", authUser.id)
          .single();

        if (existingUser) {
          console.log(`  ✓ Already exists (ID: ${existingUser.id})`);
          successCount++;
          continue;
        }

        // Insert user into database
        const { data, error } = await supabaseAdmin
          .from("users")
          .insert({
            auth_id: authUser.id,
            email: authUser.email,
          })
          .select("id");

        if (error) {
          console.error(`  ❌ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log(`  ✅ Created (ID: ${data[0].id})`);
          successCount++;
        }
      } catch (err) {
        console.error(`  ❌ Exception: ${err.message}`);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✅ Synced: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log("=".repeat(50));

    if (successCount > 0) {
      console.log("\n✨ Users synced to database successfully!");
      console.log("You can now login and access the API endpoints.");
    }
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

syncUsersToDb();
