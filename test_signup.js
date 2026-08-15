const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gbagcctlymqfefyjhqzu.supabase.co';
const supabaseKey = 'sb_publishable_T7GC3hfaUA0DAul1E6o2Ww_aUYc15_6';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  console.log("Attempting to sign up...");
  const { data, error } = await supabase.auth.signUp({
    email: 'agent_tester2@davidgroeve.com',
    password: 'Password123!',
  });
  
  if (error) {
    console.error("Sign up failed full error:", JSON.stringify(error, null, 2));
  } else {
    console.log("Sign up succeeded:", data);
  }
}

testSignup();
