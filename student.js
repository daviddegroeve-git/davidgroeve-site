document.addEventListener('DOMContentLoaded', async () => {
  const authInfo = await window.requireAuth(['student', 'admin']);
  if (!authInfo) return;
  
  const { supabase, user } = authInfo;

  // Wire footer buttons via data-action attributes
  const logoutBtn = document.querySelector('[data-action="logout"]');
  const supportBtn = document.querySelector('[data-action="support"]');
  if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); window.logout(); });
  if (supportBtn) supportBtn.addEventListener('click', (e) => { e.preventDefault(); window.openSupport(); });

  // Fetch Qualifications (training_modules)
  const { data: modules } = await supabase
    .from('training_modules')
    .select('*')
    .eq('student_id', user.id);
    
  const qualContainer = document.getElementById('qualifications-container');
  if (qualContainer && modules) {
    qualContainer.innerHTML = modules.map(m => `
      <div class="flex justify-between items-center pb-3 border-b border-outline-variant/20">
        <div>
          <p class="font-body-md text-[14px] text-on-surface">${m.title}</p>
          <p class="font-data-mono text-[10px] text-on-surface-variant">Mod: ${m.id.substring(0,6).toUpperCase()}</p>
        </div>
        <span class="font-data-mono text-[16px] ${m.progress > 80 ? 'text-secondary' : 'text-on-surface-variant'}">${m.progress > 0 ? m.progress + '%' : m.status}</span>
      </div>
    `).join('');
  }

  // --- SPA TAB ROUTING ---
  const navLinks = document.querySelectorAll('.nav-link');
  const tabContents = document.querySelectorAll('.tab-content');

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
    settingsRole.value = user.user_metadata.role || 'student';
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

  // Fetch Documents (certificates)
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', 'certificate');

  const docsContainer = document.getElementById('documents-container');
  if (docsContainer && documents) {
    const docsHtml = documents.map(d => `
      <div class="group border border-outline-variant/20 p-4 rounded-sm hover:border-tertiary/50 transition-colors cursor-pointer bg-surface-container-lowest">
        <div class="flex justify-between items-start mb-4">
          <span class="material-symbols-outlined text-secondary">workspace_premium</span>
          <span class="font-label-caps text-[9px] bg-secondary/20 text-secondary px-2 py-1 rounded-sm">CERT</span>
        </div>
        <h4 class="font-body-md text-[14px] text-on-surface truncate group-hover:text-secondary transition-colors">${d.title}</h4>
        <p class="font-data-mono text-[11px] text-on-surface-variant mt-1">${new Date(d.created_at).toLocaleDateString()} • Valid</p>
      </div>
    `).join('');
    
    // Prepend to existing "View Registry" block
    docsContainer.insertAdjacentHTML('afterbegin', docsHtml);
  }
});
