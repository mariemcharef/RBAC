require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const users = [
  { email: "admin@acme.com", password: "Test@123456" },
  { email: "john.doe@acme.com", password: "Test@123456" },
  { email: "jane.smith@acme.com", password: "Test@123456" },
  { email: "admin@techinnovations.com", password: "Test@123456" },
  { email: "developer@techinnovations.com", password: "Test@123456" },
  { email: "viewer@techinnovations.com", password: "Test@123456" },
  { email: "manager@globalsolutions.com", password: "Test@123456" },
  { email: "analyst@globalsolutions.com", password: "Test@123456" },
];

async function createUsers() {
  console.log("Creating users...\n");

  for (const user of users) {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });

      if (authError) {
        console.error(`❌ Auth error (${user.email}):`, authError.message);
        continue;
      }

      const { error: dbError } = await supabase
        .from("users")
        .insert({
          auth_id: authData.user.id,
          email: user.email,
        });

      if (dbError) {
        console.error(`❌ DB error (${user.email}):`, dbError.message);
        continue;
      }

      console.log(`✅ Created: ${user.email}`);
    } catch (err) {
      console.error(`❌ Exception (${user.email}):`, err.message);
    }
  }

  console.log("\nDone.");
}

createUsers();
