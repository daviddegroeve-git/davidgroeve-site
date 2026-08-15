document.addEventListener('DOMContentLoaded', async () => {
  const authInfo = await window.requireAuth(['recruiter', 'admin']);
  if (!authInfo) return;
  
  const { supabase, user } = authInfo;

  // Wire footer buttons via data-action attributes
  const logoutBtn = document.querySelector('[data-action="logout"]');
  const supportBtn = document.querySelector('[data-action="support"]');
  if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); window.logout(); });
  if (supportBtn) supportBtn.addEventListener('click', (e) => { e.preventDefault(); window.openSupport(); });

  // Fetch Executive Assets (documents with type 'executive_asset')
  const { data: assets } = await supabase
    .from('documents')
    .select('*')
    .eq('type', 'executive_asset');
    
  const assetsContainer = document.getElementById('executive-assets-container');
  
  if (assetsContainer && assets) {
    // Map icons based on title for a nice touch
    const getIcon = (title) => {
        if (title.toLowerCase().includes('cv')) return 'article';
        if (title.toLowerCase().includes('deck')) return 'slideshow';
        if (title.toLowerCase().includes('letter')) return 'mail';
        return 'description';
    };

    assetsContainer.innerHTML = assets.map(asset => `
      <div class="bg-slate-surface border-t border-tertiary p-6 rounded-DEFAULT shadow-ambient shadow-ambient-hover group cursor-pointer relative overflow-hidden flex flex-col h-64">
        <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span class="material-symbols-outlined text-6xl text-tertiary">${getIcon(asset.title)}</span>
        </div>
        <div class="flex justify-between items-start mb-auto z-10">
          <div class="px-2 py-1 bg-primary-container/50 border border-primary/20 rounded font-label-caps text-label-caps text-[10px] text-primary">FILE</div>
          <span class="material-symbols-outlined text-on-surface-variant group-hover:text-secondary transition-colors">open_in_new</span>
        </div>
        <div class="z-10 mt-auto">
          <h3 class="font-headline-md text-xl text-on-surface mb-1">${asset.title}</h3>
          <p class="font-data-mono text-data-mono text-xs text-on-surface-variant">Last updated: ${new Date(asset.created_at).toLocaleDateString()}</p>
        </div>
        <div class="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-secondary to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
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
        nav.classList.remove('text-secondary', 'bg-tertiary-container/30', 'border-r-2', 'border-secondary');
        nav.classList.add('text-on-surface-variant');
        
        // Handle icon
        const icon = nav.querySelector('.material-symbols-outlined');
        if (icon) icon.classList.remove('icon-fill');
      });
      link.classList.remove('text-on-surface-variant');
      link.classList.add('text-secondary', 'bg-tertiary-container/30', 'border-r-2', 'border-secondary');
      
      const icon = link.querySelector('.material-symbols-outlined');
      if (icon) icon.classList.add('icon-fill');

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
    settingsRole.value = user.user_metadata.role || 'recruiter';
  }
});
