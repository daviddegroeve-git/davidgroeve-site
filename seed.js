const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gbagcctlymqfefyjhqzu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_T7GC3hfaUA0DAul1E6o2Ww_aUYc15_6';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('Seeding Database...');

  // 1. Create Customer
  const { data: customerData, error: customerErr } = await supabase.auth.signUp({
    email: 'customer@test.com',
    password: 'password123',
    options: { data: { role: 'customer', full_name: 'Acme Corp Client' } }
  });
  
  if (customerErr) {
    if (customerErr.message.includes('already registered')) {
        console.log('Customer already exists.');
        const {data} = await supabase.auth.signInWithPassword({email: 'customer@test.com', password: 'password123'});
        customerData.user = data.user;
    } else {
        console.error('Error creating customer:', customerErr);
    }
  }

  // Insert profile manually if needed (Supabase triggers usually handle this, but we don't have one)
  if (customerData?.user) {
    await supabase.from('profiles').upsert({
      id: customerData.user.id,
      role: 'customer',
      full_name: 'Acme Corp Client',
    });

    console.log('Seeding Customer Projects...');
    await supabase.from('projects').upsert([
      { client_id: customerData.user.id, title: 'Cloud Infrastructure Audit', status: 'active', progress: 65 },
      { client_id: customerData.user.id, title: 'AI Strategy Roadmap', status: 'pending', progress: 10 }
    ]);

    console.log('Seeding Customer Invoices...');
    await supabase.from('invoices').upsert([
      { client_id: customerData.user.id, amount: 15000.00, status: 'paid' },
      { client_id: customerData.user.id, amount: 8500.00, status: 'outstanding' }
    ]);

    await supabase.from('communications').upsert([
      { client_id: customerData.user.id, message: 'Welcome to the consulting portal!' },
      { client_id: customerData.user.id, message: 'Cloud audit phase 1 complete. Awaiting review.' }
    ]);
  }

  // 2. Create Student
  const { data: studentData, error: studentErr } = await supabase.auth.signUp({
    email: 'student@test.com',
    password: 'password123',
    options: { data: { role: 'student', full_name: 'Jane Doe' } }
  });

  if (studentErr) {
    if (studentErr.message.includes('already registered')) {
        console.log('Student already exists.');
        const {data} = await supabase.auth.signInWithPassword({email: 'student@test.com', password: 'password123'});
        studentData.user = data.user;
    } else {
        console.error('Error creating student:', studentErr);
    }
  }

  if (studentData?.user) {
    await supabase.from('profiles').upsert({
      id: studentData.user.id,
      role: 'student',
      full_name: 'Jane Doe',
    });

    console.log('Seeding Student Modules...');
    await supabase.from('training_modules').upsert([
      { student_id: studentData.user.id, title: 'System Architecture', progress: 94, status: 'active' },
      { student_id: studentData.user.id, title: 'Data Governance', progress: 55, status: 'active' }
    ]);
    
    await supabase.from('documents').upsert([
      { user_id: studentData.user.id, type: 'certificate', title: 'AWS Cloud Practitioner', url: '#' },
      { user_id: studentData.user.id, type: 'certificate', title: 'Architecture Completion', url: '#' }
    ]);
  }

  // 3. Create Admin
  const { data: adminData, error: adminErr } = await supabase.auth.signUp({
    email: 'admin@davidgroeve.com',
    password: 'password123',
    options: { data: { role: 'admin', full_name: 'Admin User' } }
  });

  if (adminErr) {
    if (adminErr.message.includes('already registered')) {
        console.log('Admin already exists.');
        const {data} = await supabase.auth.signInWithPassword({email: 'admin@davidgroeve.com', password: 'password123'});
        adminData.user = data.user;
    } else {
        console.error('Error creating admin:', adminErr);
    }
  }

  if (adminData?.user) {
    await supabase.from('profiles').upsert({
      id: adminData.user.id,
      role: 'admin',
      full_name: 'Admin User',
    });
  }
  
  // Public assets
  console.log('Seeding Executive Assets...');
  await supabase.from('documents').upsert([
    { type: 'executive_asset', title: 'Customized CV', url: '#' },
    { type: 'executive_asset', title: 'Strategic Pitch Deck', url: '#' }
  ]);

  console.log('Done!');
}

seed();
