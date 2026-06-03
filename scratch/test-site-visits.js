const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const testPath = "test_play:cheonmujin";
  const visitorKey = "test_user:123";
  const testDate = "2000-01-01";

  console.log("Checking if existing test record exists...");
  const { data: existing, error: selectErr } = await supabase
    .from("site_visits")
    .select("*")
    .eq("visit_date", testDate)
    .eq("page_path", testPath)
    .eq("visitor_key", visitorKey)
    .maybeSingle();

  if (selectErr) {
    console.error("Select error:", selectErr.message);
    return;
  }

  if (existing) {
    console.log("Found existing record, deleting it to start fresh...");
    const { error: delErr } = await supabase
      .from("site_visits")
      .delete()
      .eq("id", existing.id);
    if (delErr) {
      console.error("Delete error:", delErr.message);
      return;
    }
  }

  console.log("Inserting test record...");
  const { data: inserted, error: insertErr } = await supabase
    .from("site_visits")
    .insert({
      visit_date: testDate,
      page_path: testPath,
      visitor_key: visitorKey,
      user_id: null
    })
    .select()
    .single();

  if (insertErr) {
    console.error("Insert error:", insertErr.message);
  } else {
    console.log("Insert success! Inserted record:", inserted);
    
    // Now count the views
    console.log("Counting total views for testPath...");
    const { count, error: countErr } = await supabase
      .from("site_visits")
      .select("*", { count: "exact", head: true })
      .eq("page_path", testPath);

    if (countErr) {
      console.error("Count error:", countErr.message);
    } else {
      console.log("Count success! Total views:", count);
    }

    // Clean up
    console.log("Cleaning up test record...");
    await supabase.from("site_visits").delete().eq("id", inserted.id);
    console.log("Cleanup complete!");
  }
}

test();
