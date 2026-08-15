document.addEventListener('DOMContentLoaded', async () => {
  const authInfo = await window.requireAuth(['customer', 'admin']);
  if (!authInfo) return; // Redirecting
  
  const { supabase, user } = authInfo;

  // Fetch Projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', user.id);
    
  const projectsContainer = document.getElementById('projects-container');
  if (projectsContainer && projects) {
    projectsContainer.innerHTML = projects.map(p => `
      <div class="bg-slate-surface border-t border-tertiary p-6 shadow-sm hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
        <div class="flex justify-between items-start mb-4 relative z-10">
          <span class="bg-white/10 text-on-surface font-label-caps text-label-caps px-2 py-1 rounded">${p.status.toUpperCase()}</span>
        </div>
        <h4 class="font-headline-md text-headline-md text-on-surface text-xl mb-2 relative z-10">${p.title}</h4>
        <div class="space-y-2 relative z-10">
          <div class="flex justify-between font-data-mono text-data-mono text-xs text-on-surface-variant">
            <span>PROGRESS</span>
            <span class="text-secondary">${p.progress}%</span>
          </div>
          <div class="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
            <div class="bg-secondary h-full" style="width: ${p.progress}%;"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Fetch Invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', user.id);

  const invoicesContainer = document.getElementById('invoices-container');
  if (invoicesContainer && invoices) {
    let outstanding = 0;
    let paid = 0;
    invoices.forEach(inv => {
      if(inv.status === 'paid') paid += Number(inv.amount);
      if(inv.status === 'outstanding') outstanding += Number(inv.amount);
    });
    
    invoicesContainer.innerHTML = `
      <div class="flex justify-between items-end border-b border-outline-variant/30 pb-2">
        <span class="font-body-md text-body-md text-on-surface-variant">Outstanding</span>
        <span class="font-data-mono text-data-mono text-secondary text-lg">$${outstanding.toFixed(2)}</span>
      </div>
      <div class="flex justify-between items-end border-b border-outline-variant/30 pb-2">
        <span class="font-body-md text-body-md text-on-surface-variant">Paid YTD</span>
        <span class="font-data-mono text-data-mono text-on-surface text-lg">$${paid.toFixed(2)}</span>
      </div>
    `;
  }

  // Fetch Communications
  const { data: comms } = await supabase
    .from('communications')
    .select('*')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false });

  const commsContainer = document.getElementById('communications-container');
  if (commsContainer && comms) {
    commsContainer.innerHTML = comms.map(c => `
      <div class="flex gap-4 group">
        <div class="flex flex-col items-center">
          <div class="w-2 h-2 rounded-full bg-secondary mt-2"></div>
        </div>
        <div class="pb-2">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-label-caps text-label-caps text-secondary">UPDATE</span>
            <span class="font-data-mono text-data-mono text-xs text-on-surface-variant">• ${new Date(c.created_at).toLocaleDateString()}</span>
          </div>
          <p class="font-body-md text-body-md text-on-surface mb-2">${c.message}</p>
        </div>
      </div>
    `).join('');
  }

  // --- SPA TAB ROUTING ---
  const navLinks = document.querySelectorAll('.nav-link');
  const tabContents = document.querySelectorAll('.tab-content');

  // Wire footer buttons via data-action attributes
  const logoutBtn = document.querySelector('[data-action="logout"]');
  const supportBtn = document.querySelector('[data-action="support"]');
  if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); window.logout(); });
  if (supportBtn) supportBtn.addEventListener('click', (e) => { e.preventDefault(); window.openSupport(); });

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetId = link.getAttribute('data-target');
      if (!targetId) return;

      // Update active nav styling
      navLinks.forEach(nav => {
        nav.classList.remove('text-secondary', 'bg-tertiary-container/30', 'border-r-2', 'border-secondary', 'translate-x-1');
        nav.classList.add('text-on-surface-variant');
      });
      link.classList.remove('text-on-surface-variant');
      link.classList.add('text-secondary', 'bg-tertiary-container/30', 'border-r-2', 'border-secondary', 'translate-x-1');

      // Show target content
      tabContents.forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === targetId) {
          tab.classList.add('active');
        }
      });
    });
  });

  // Populate Settings
  const settingsName = document.getElementById('settings-name');
  const settingsEmail = document.getElementById('settings-email');
  const settingsRole = document.getElementById('settings-role');

  if (settingsName && user.user_metadata) {
    settingsName.value = user.user_metadata.full_name || '';
    settingsEmail.value = user.email || '';
    settingsRole.value = user.user_metadata.role || 'customer';
  }

  // Fetch all documents for the Documents Tab
  const allDocsContainer = document.getElementById('all-documents-container');
  if (allDocsContainer) {
    const { data: allDocs } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (allDocs && allDocs.length > 0) {
      allDocsContainer.innerHTML = `
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-outline-variant/30">
              <th class="pb-3 font-label-caps text-label-caps text-on-surface-variant">Name</th>
              <th class="pb-3 font-label-caps text-label-caps text-on-surface-variant">Type</th>
              <th class="pb-3 font-label-caps text-label-caps text-on-surface-variant">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/20">
            ${allDocs.map(doc => `
              <tr class="hover:bg-surface-container transition-colors cursor-pointer group">
                <td class="py-4 font-body-md text-on-surface flex items-center gap-2">
                  <span class="material-symbols-outlined text-outline-variant group-hover:text-secondary">description</span>
                  ${doc.title}
                </td>
                <td class="py-4 font-label-caps text-[10px] text-tertiary uppercase">${doc.type.replace('_', ' ')}</td>
                <td class="py-4 font-data-mono text-[12px] text-on-surface-variant">${new Date(doc.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      allDocsContainer.innerHTML = '<p class="text-on-surface-variant">No documents available.</p>';
    }
  }

});
