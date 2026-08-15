document.addEventListener('DOMContentLoaded', async () => {
  const authInfo = await window.requireAuth(['admin']);
  if (!authInfo) return;
  
  const { supabase } = authInfo;

  // Wire footer buttons via data-action attributes
  const logoutBtn = document.querySelector('[data-action="logout"]');
  const supportBtn = document.querySelector('[data-action="support"]');
  if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); window.logout(); });
  if (supportBtn) supportBtn.addEventListener('click', (e) => { e.preventDefault(); window.openSupport(); });

  // Fetch Metrics
  const { data: metrics } = await supabase
    .from('system_metrics')
    .select('*')
    .single();

  const metricsContainer = document.getElementById('metrics-container');
  if (metricsContainer && metrics) {
    metricsContainer.innerHTML = `
      <div class="bg-surface-container-low p-4 rounded border border-outline-variant/20">
        <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">Active Students</p>
        <p class="font-display-lg text-[36px] text-secondary font-data-mono">${metrics.active_students.toLocaleString()}</p>
        <p class="font-data-mono text-[12px] text-tertiary mt-2">Live Metric</p>
      </div>
      <div class="bg-surface-container-low p-4 rounded border border-outline-variant/20">
        <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">Corporate Clients</p>
        <p class="font-display-lg text-[36px] text-secondary font-data-mono">${metrics.corporate_clients.toLocaleString()}</p>
        <p class="font-data-mono text-[12px] text-tertiary mt-2">Live Metric</p>
      </div>
      <div class="bg-surface-container-low p-4 rounded border border-outline-variant/20">
        <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">Doc Downloads</p>
        <p class="font-display-lg text-[36px] text-secondary font-data-mono">${(metrics.document_downloads / 1000).toFixed(1)}k</p>
        <p class="font-data-mono text-[12px] text-outline mt-2">Live Metric</p>
      </div>
    `;
  }

  // Fetch Users
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const usersContainer = document.getElementById('users-container');
  if (usersContainer && users) {
    const getInitials = (name) => {
        return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
    };
    const getRoleColor = (role) => {
        if (role === 'admin') return 'bg-error/10 text-error border-error/30';
        if (role === 'student') return 'bg-tertiary/10 text-tertiary border-tertiary/30';
        if (role === 'customer') return 'bg-secondary/10 text-secondary border-secondary/30';
        if (role === 'recruiter') return 'bg-on-surface/10 text-on-surface border-outline-variant/30';
        return 'bg-on-surface/10 text-on-surface border-outline-variant/30';
    };

    usersContainer.innerHTML = users.map(u => `
      <tr class="hover:bg-surface-container/50 transition-colors">
        <td class="py-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-label-caps text-on-surface">${getInitials(u.full_name)}</div>
            <div>
              <p class="font-body-md text-on-surface font-medium">${u.full_name || 'Unknown'}</p>
              <p class="font-data-mono text-[12px] text-on-surface-variant">ID: ${u.id.substring(0, 8)}...</p>
            </div>
          </div>
        </td>
        <td class="py-4">
          <span class="inline-block px-2 py-1 rounded font-label-caps text-[10px] border ${getRoleColor(u.role)} capitalize">${u.role}</span>
        </td>
        <td class="py-4">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-secondary"></div>
            <span class="font-data-mono text-[13px] text-on-surface">Active</span>
          </div>
        </td>
        <td class="py-4 font-data-mono text-[13px] text-on-surface-variant">${new Date(u.created_at).toLocaleDateString()}</td>
        <td class="py-4 text-right">
          <button class="text-outline-variant hover:text-secondary transition-colors">
            <span class="material-symbols-outlined text-[20px]">more_vert</span>
          </button>
        </td>
      </tr>
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

      navLinks.forEach(nav => {
        nav.classList.remove('text-secondary', 'bg-tertiary-container/30', 'border-r-2', 'border-secondary', 'translate-x-1');
        nav.classList.add('text-on-surface-variant');
      });
      link.classList.remove('text-on-surface-variant');
      link.classList.add('text-secondary', 'bg-tertiary-container/30', 'border-r-2', 'border-secondary', 'translate-x-1');

      tabContents.forEach(tab => {
        tab.classList.remove('active');
        if (tab.id === targetId) tab.classList.add('active');
      });

      // Lazy-load Users full tab
      if (targetId === 'users') loadFullUsers();
      // Lazy-load Documents tab
      if (targetId === 'documents') loadAdminDocs();
    });
  });

  // Populate Settings
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const settingsName = document.getElementById('settings-name');
  const settingsEmail = document.getElementById('settings-email');
  const settingsRole = document.getElementById('settings-role');
  if (settingsName && currentUser) {
    settingsName.value = currentUser.user_metadata?.full_name || '';
    settingsEmail.value = currentUser.email || '';
    settingsRole.value = currentUser.user_metadata?.role || 'admin';
  }

  // Global users array for CSV export
  window.adminUsers = [];

  // Full Users Tab
  async function loadFullUsers(force = false) {
    const container = document.getElementById('users-full-container');
    if (!container || (container.dataset.loaded && !force)) return;
    
    const { data: allUsers, error } = await supabase.rpc('get_all_users_admin');
    if (error) {
      container.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-error">Error loading users: ${error.message}</td></tr>`;
      return;
    }
    
    window.adminUsers = allUsers || [];
    
    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
    const getRoleColor = (role) => {
      if (role === 'admin') return 'bg-error/10 text-error border-error/30';
      if (role === 'student') return 'bg-tertiary/10 text-tertiary border-tertiary/30';
      if (role === 'customer') return 'bg-secondary/10 text-secondary border-secondary/30';
      return 'bg-on-surface/10 text-on-surface border-outline-variant/30';
    };

    container.innerHTML = window.adminUsers.map(u => {
      const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
      const statusColor = isBanned ? 'bg-error' : 'bg-secondary';
      const statusText = isBanned ? 'Disabled' : 'Active';
      const uJson = JSON.stringify(u).replace(/"/g, '&quot;');
      
      return `
      <tr class="hover:bg-surface-container/50 transition-colors">
        <td class="py-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-label-caps text-on-surface">${getInitials(u.full_name)}</div>
            <div>
              <p class="font-body-md text-on-surface font-medium">${u.full_name || 'Unknown'}</p>
              <p class="font-data-mono text-[12px] text-on-surface-variant">${u.email || 'No email'}</p>
            </div>
          </div>
        </td>
        <td class="py-4"><span class="inline-block px-2 py-1 rounded font-label-caps text-[10px] border ${getRoleColor(u.role)} capitalize">${u.role || 'User'}</span></td>
        <td class="py-4"><div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full ${statusColor}"></div><span class="font-data-mono text-[13px] text-on-surface">${statusText}</span></div></td>
        <td class="py-4 font-data-mono text-[13px] text-on-surface-variant">${new Date(u.created_at).toLocaleDateString()}</td>
        <td class="py-4 text-right">
          <div class="flex justify-end gap-2">
            <button onclick="openEditModal('${u.id}', '${u.email}', '${u.full_name?.replace(/'/g, "\\'")}', '${u.role}')" class="text-outline-variant hover:text-secondary transition-colors" title="Edit User">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onclick="openResetModal('${u.id}', '${u.email}')" class="text-outline-variant hover:text-secondary transition-colors" title="Reset Password">
              <span class="material-symbols-outlined text-[18px]">key</span>
            </button>
            <button onclick="openDisableModal('${u.id}', ${isBanned})" class="text-outline-variant hover:text-error transition-colors" title="${isBanned ? 'Enable User' : 'Disable User'}">
              <span class="material-symbols-outlined text-[18px]">${isBanned ? 'check_circle' : 'block'}</span>
            </button>
          </div>
        </td>
      </tr>
    `}).join('');
    container.dataset.loaded = 'true';
  }

  // Admin Documents Tab
  async function loadAdminDocs() {
    const container = document.getElementById('all-docs-admin-container');
    if (!container || container.dataset.loaded) return;
    const { data: docs } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (!docs || docs.length === 0) {
      container.innerHTML = '<p class="text-on-surface-variant">No documents available.</p>';
      return;
    }
    container.innerHTML = `
      <table class="w-full text-left">
        <thead>
          <tr class="border-b border-outline-variant/30">
            <th class="pb-3 font-label-caps text-label-caps text-on-surface-variant">Name</th>
            <th class="pb-3 font-label-caps text-label-caps text-on-surface-variant">Type</th>
            <th class="pb-3 font-label-caps text-label-caps text-on-surface-variant">Date</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant/20">
          ${docs.map(doc => `
            <tr class="hover:bg-surface-container transition-colors cursor-pointer group">
              <td class="py-4 font-body-md text-on-surface flex items-center gap-2">
                <span class="material-symbols-outlined text-outline-variant group-hover:text-secondary">description</span>
                ${doc.title}
              </td>
              <td class="py-4 font-label-caps text-[10px] text-tertiary uppercase">${doc.type.replace(/_/g, ' ')}</td>
              <td class="py-4 font-data-mono text-[12px] text-on-surface-variant">${new Date(doc.created_at).toLocaleDateString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    container.dataset.loaded = 'true';
  }
  // --- USER MANAGEMENT MODALS ---
  const modalsContainer = document.getElementById('adminModals');
  const userModal = document.getElementById('userModal');
  const resetModal = document.getElementById('resetPasswordModal');
  const disableModal = document.getElementById('confirmDisableModal');
  
  const closeAllModals = () => {
    modalsContainer.classList.add('hidden');
    userModal.classList.add('hidden');
    resetModal.classList.add('hidden');
    disableModal.classList.add('hidden');
  };

  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  // Create / Edit User Form
  const userForm = document.getElementById('userForm');
  userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('userSubmitBtn');
    const errObj = document.getElementById('userFormError');
    errObj.classList.add('hidden');
    btn.disabled = true;

    const id = document.getElementById('userId').value;
    const email = document.getElementById('userEmail').value;
    const name = document.getElementById('userName').value;
    const role = document.getElementById('userRole').value;
    const pwd = document.getElementById('userPassword').value;

    try {
      if (id) {
        // Edit User
        const { error } = await supabase.rpc('admin_update_user', {
          target_user_id: id,
          new_full_name: name,
          new_role: role,
          new_email: email
        });
        if (error) throw error;
      } else {
        // Create User (without logging out admin)
        const tempClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        const { error } = await tempClient.auth.signUp({
          email,
          password: pwd,
          options: { data: { role, full_name: name } }
        });
        if (error) throw error;
      }
      
      closeAllModals();
      await loadFullUsers(true); // reload list
    } catch (err) {
      errObj.textContent = err.message;
      errObj.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  });

  // Export CSV
  const exportBtn = document.getElementById('exportUsersBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const csvData = [
        ['ID', 'Email', 'Full Name', 'Role', 'Status', 'Created At'],
        ...window.adminUsers.map(u => [
          u.id, u.email, u.full_name, u.role, 
          (u.banned_until && new Date(u.banned_until) > new Date()) ? 'Disabled' : 'Active',
          new Date(u.created_at).toISOString()
        ])
      ].map(e => e.join(',')).join('\n');
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'users_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Create User Button
  const createBtn = document.getElementById('createUserBtn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      document.getElementById('userForm').reset();
      document.getElementById('userId').value = '';
      document.getElementById('userModalTitle').textContent = 'Create User';
      document.getElementById('passwordFieldGroup').classList.remove('hidden');
      document.getElementById('userPassword').required = true;
      document.getElementById('userFormError').classList.add('hidden');
      
      modalsContainer.classList.remove('hidden');
      userModal.classList.remove('hidden');
    });
  }

  // Disable/Enable User Submit
  document.getElementById('confirmDisableBtn').addEventListener('click', async () => {
    const id = document.getElementById('disableUserId').value;
    const isDisabling = document.getElementById('disableState').value === 'true';
    const btn = document.getElementById('confirmDisableBtn');
    const errObj = document.getElementById('disableError');
    
    btn.disabled = true;
    errObj.classList.add('hidden');
    try {
      const { error } = await supabase.rpc('admin_disable_user', {
        target_user_id: id,
        disable: isDisabling
      });
      if (error) throw error;
      
      closeAllModals();
      await loadFullUsers(true);
    } catch (err) {
      errObj.textContent = err.message;
      errObj.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  });

  // Reset Password (Send Email)
  document.getElementById('sendResetEmailBtn').addEventListener('click', async () => {
    const email = document.getElementById('resetUserEmail').value;
    const msg = document.getElementById('resetMessage');
    msg.classList.add('hidden');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('reset-password.html', window.location.href).href,
      });
      if (error) throw error;
      msg.textContent = 'Recovery email sent!';
      msg.className = 'text-sm text-secondary mt-4 block';
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'text-sm text-error mt-4 block';
    }
  });

  // Reset Password (Manual)
  document.getElementById('manualResetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('resetUserId').value;
    const pwd = document.getElementById('manualNewPassword').value;
    const btn = document.getElementById('manualResetBtn');
    const msg = document.getElementById('resetMessage');
    
    btn.disabled = true;
    msg.classList.add('hidden');
    
    try {
      const { error } = await supabase.rpc('admin_reset_password', {
        target_user_id: id,
        new_password: pwd
      });
      if (error) throw error;
      msg.textContent = 'Password manually set successfully!';
      msg.className = 'text-sm text-secondary mt-4 block';
      setTimeout(closeAllModals, 1500);
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'text-sm text-error mt-4 block';
    } finally {
      btn.disabled = false;
    }
  });

  // --- GLOBALS FOR ONCLICK ---
  window.openEditModal = (id, email, name, role) => {
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = id;
    document.getElementById('userEmail').value = email !== 'null' ? email : '';
    document.getElementById('userName').value = name !== 'null' ? name : '';
    document.getElementById('userRole').value = role || 'student';
    document.getElementById('userModalTitle').textContent = 'Edit User';
    
    // Hide password field for edits
    document.getElementById('passwordFieldGroup').classList.add('hidden');
    document.getElementById('userPassword').required = false;
    document.getElementById('userFormError').classList.add('hidden');
    
    document.getElementById('adminModals').classList.remove('hidden');
    document.getElementById('userModal').classList.remove('hidden');
  };

  window.openResetModal = (id, email) => {
    document.getElementById('resetUserId').value = id;
    document.getElementById('resetUserEmail').value = email;
    document.getElementById('manualResetForm').reset();
    document.getElementById('resetMessage').classList.add('hidden');
    
    document.getElementById('adminModals').classList.remove('hidden');
    document.getElementById('resetPasswordModal').classList.remove('hidden');
  };

  window.openDisableModal = (id, currentlyDisabled) => {
    document.getElementById('disableUserId').value = id;
    document.getElementById('disableState').value = !currentlyDisabled;
    
    const title = document.getElementById('disableTitle');
    const text = document.getElementById('disableText');
    const btn = document.getElementById('confirmDisableBtn');
    
    if (currentlyDisabled) {
      title.textContent = 'Enable User?';
      text.textContent = 'Are you sure you want to restore access for this user?';
      btn.textContent = 'Enable';
      btn.className = 'px-4 py-2 bg-secondary text-ink-black rounded font-bold hover:bg-secondary-fixed transition-colors';
    } else {
      title.textContent = 'Disable User?';
      text.textContent = 'Are you sure you want to disable this user? They will no longer be able to log in.';
      btn.textContent = 'Disable';
      btn.className = 'px-4 py-2 bg-error text-on-error rounded font-bold hover:bg-error/80 transition-colors';
    }
    
    document.getElementById('disableError').classList.add('hidden');
    document.getElementById('adminModals').classList.remove('hidden');
    document.getElementById('confirmDisableModal').classList.remove('hidden');
  };

});
