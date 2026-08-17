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
    qualContainer.innerHTML = modules.map((m, i) => `
      <div class="flex items-center gap-4 group">
          <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-secondary-text group-hover:bg-brand-success-light group-hover:text-brand-success transition-colors duration-300">
              <span class="font-semibold text-sm">${i + 1}</span>
          </div>
          <div class="flex-1">
              <div class="flex justify-between items-center mb-1.5">
                  <p class="font-medium text-sm text-primary-text truncate max-w-[150px] md:max-w-[200px]">${m.title}</p>
                  <span class="text-xs font-semibold ${m.progress > 80 ? 'text-brand-success' : 'text-tertiary-text'}">${m.progress > 0 ? m.progress + '%' : m.status}</span>
              </div>
              <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-brand-success transition-all duration-1000 ease-out" style="width: ${m.progress > 0 ? m.progress : 0}%"></div>
              </div>
          </div>
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
        nav.classList.remove('text-brand-navy', 'bg-slate-100');
        nav.classList.add('text-tertiary-text');
      });
      
      link.classList.remove('text-tertiary-text');
      link.classList.add('text-brand-navy');

      // Show target content
      tabContents.forEach(tab => {
        tab.classList.remove('active', 'animate-fade-slide');
        if (tab.id === targetId) {
          tab.classList.add('active');
          void tab.offsetWidth; // trigger reflow
          tab.classList.add('animate-fade-slide');
        }
      });
    });
  });

  // Populate Settings
  const settingsName = document.getElementById('settings-name');
  const settingsEmail = document.getElementById('settings-email');
  const settingsRole = document.getElementById('settings-role');
  const settingsOrg = document.getElementById('settings-organization');
  const settingsCity = document.getElementById('settings-city');
  const settingsMobile = document.getElementById('settings-mobile');
  const settingsLinkedin = document.getElementById('settings-linkedin');
  const settingsGithub = document.getElementById('settings-github');
  const profileAvatar = document.getElementById('profile-avatar');
  const displayName = document.getElementById('profile-display-name');

  if (user.user_metadata) {
    if (settingsName) settingsName.value = user.user_metadata.full_name || '';
    if (settingsEmail) settingsEmail.value = user.email || '';
    if (settingsRole) settingsRole.value = user.user_metadata.role || 'student';
    if (settingsOrg) settingsOrg.value = user.user_metadata.organization || '';
    if (settingsCity) settingsCity.value = user.user_metadata.city || '';
    if (settingsMobile) settingsMobile.value = user.user_metadata.mobile || '';
    if (settingsLinkedin) settingsLinkedin.value = user.user_metadata.linkedin || '';
    if (settingsGithub) settingsGithub.value = user.user_metadata.github || '';
    
    if (profileAvatar && user.user_metadata.avatar_url) {
        profileAvatar.src = user.user_metadata.avatar_url;
    }
    if (displayName) displayName.textContent = user.user_metadata.full_name || 'Student';
  }

  // --- CROPPER & AVATAR LOGIC ---
  const avatarUploadTrigger = document.getElementById('avatar-upload-trigger');
  const avatarInput = document.getElementById('avatar-input');
  const cropperModal = document.getElementById('cropper-modal');
  const cropperImage = document.getElementById('cropper-image');
  const cancelCropBtn = document.getElementById('cancel-crop-btn');
  const applyCropBtn = document.getElementById('apply-crop-btn');
  let cropperInstance = null;
  let currentAvatarBase64 = null;

  if (avatarUploadTrigger && avatarInput) {
      avatarUploadTrigger.addEventListener('click', () => {
          avatarInput.click();
      });

      avatarInput.addEventListener('change', (e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
              const file = files[0];
              const reader = new FileReader();
              reader.onload = (e) => {
                  cropperImage.src = e.target.result;
                  cropperImage.classList.remove('hidden');
                  cropperModal.classList.remove('hidden');
                  cropperModal.classList.add('flex');
                  
                  if (cropperInstance) cropperInstance.destroy();
                  cropperInstance = new Cropper(cropperImage, {
                      aspectRatio: 1,
                      viewMode: 1,
                      dragMode: 'move',
                      autoCropArea: 1,
                      cropBoxResizable: false,
                      cropBoxMovable: false,
                      guides: false,
                      center: false,
                      highlight: false,
                      background: false
                  });
              };
              reader.readAsDataURL(file);
          }
      });
  }

  if (cancelCropBtn) {
      cancelCropBtn.addEventListener('click', () => {
          cropperModal.classList.add('hidden');
          cropperModal.classList.remove('flex');
          if (cropperInstance) {
              cropperInstance.destroy();
              cropperInstance = null;
          }
          avatarInput.value = ''; // reset
      });
  }

  if (applyCropBtn) {
      applyCropBtn.addEventListener('click', () => {
          if (!cropperInstance) return;
          const canvas = cropperInstance.getCroppedCanvas({
              width: 256,
              height: 256,
              imageSmoothingEnabled: true,
              imageSmoothingQuality: 'high',
          });
          
          currentAvatarBase64 = canvas.toDataURL('image/jpeg', 0.9);
          if (profileAvatar) profileAvatar.src = currentAvatarBase64;
          
          cropperModal.classList.add('hidden');
          cropperModal.classList.remove('flex');
          cropperInstance.destroy();
          cropperInstance = null;
      });
  }

  // --- SAVE PROFILE LOGIC ---
  const saveProfileBtn = document.getElementById('save-profile-btn');
  if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', async () => {
          saveProfileBtn.disabled = true;
          saveProfileBtn.innerHTML = `Saving... <span class="material-symbols-outlined text-[18px] animate-spin">sync</span>`;
          
          const updates = {
              full_name: settingsName ? settingsName.value : undefined,
              organization: settingsOrg ? settingsOrg.value : undefined,
              city: settingsCity ? settingsCity.value : undefined,
              mobile: settingsMobile ? settingsMobile.value : undefined,
              linkedin: settingsLinkedin ? settingsLinkedin.value : undefined,
              github: settingsGithub ? settingsGithub.value : undefined,
          };

          if (currentAvatarBase64) {
              updates.avatar_url = currentAvatarBase64;
          }

          const { data, error } = await supabase.auth.updateUser({
              data: updates
          });

          if (error) {
              console.error('Error updating profile:', error);
              alert('Failed to update profile. Please try again.');
          } else {
              // Success
              if (displayName && updates.full_name) displayName.textContent = updates.full_name;
              
              const btnOriginalHtml = saveProfileBtn.innerHTML;
              saveProfileBtn.innerHTML = `Saved <span class="material-symbols-outlined text-[18px]">check</span>`;
              saveProfileBtn.classList.replace('bg-brand-success', 'bg-brand-navy');
              
              setTimeout(() => {
                  saveProfileBtn.innerHTML = `Save Changes <span class="material-symbols-outlined text-[18px]">save</span>`;
                  saveProfileBtn.classList.replace('bg-brand-navy', 'bg-brand-success');
                  saveProfileBtn.disabled = false;
              }, 2000);
          }
      });
  }

  // Fetch all documents for the Documents Tab (The Vault)
  const allDocsContainer = document.getElementById('all-documents-container');
  if (allDocsContainer) {
    const { data: fetchedDocs } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    // Ensure the Welcome Document is always the first document for every user
    const welcomeDoc = {
        id: 'welcome-doc-001',
        title: 'Platform Welcome & Instructions',
        type: 'system_guide',
        created_at: new Date().toISOString(),
        content: 'Welcome to your Learning Path. Here you can access your modules, simulate AI inference, and manage your profile.'
    };

    const allDocs = [welcomeDoc, ...(fetchedDocs || [])];

    if (allDocs.length > 0) {
      // Store docs in window for modal access
      window.vaultDocuments = allDocs;

      allDocsContainer.innerHTML = allDocs.map(doc => `
        <div class="clean-panel p-6 clean-panel-hover flex flex-col justify-between group cursor-pointer h-40 ${doc.id === 'welcome-doc-001' ? 'border-brand-success bg-brand-success/5 relative overflow-hidden' : ''}" onclick="window.openDocument('${doc.id}')">
            ${doc.id === 'welcome-doc-001' ? '<div class="absolute top-0 right-0 w-24 h-24 bg-brand-success/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div><div class="absolute top-0 right-0 bg-brand-success text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg shadow-sm">PINNED</div>' : ''}
            <div class="flex justify-between items-start mb-4 relative z-10">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-sm ${doc.id === 'welcome-doc-001' ? 'bg-white text-brand-success border border-brand-success/20 group-hover:bg-brand-success group-hover:text-white' : 'bg-slate-50 text-secondary-text border border-border-subtle group-hover:bg-brand-navy group-hover:text-white'}">
                    <span class="material-symbols-outlined text-[20px]">${doc.id === 'welcome-doc-001' ? 'stars' : 'description'}</span>
                </div>
                <span class="text-[10px] font-bold ${doc.id === 'welcome-doc-001' ? 'bg-brand-success/10 text-brand-success' : 'bg-slate-100 text-secondary-text'} px-2 py-1 rounded uppercase tracking-wider">${doc.type.replace('_', ' ')}</span>
            </div>
            <div class="relative z-10">
                <h4 class="font-semibold text-primary-text truncate mb-1">${doc.title}</h4>
                <p class="text-xs text-tertiary-text font-medium">${doc.id === 'welcome-doc-001' ? 'System Guide' : new Date(doc.created_at).toLocaleDateString()}</p>
            </div>
        </div>
      `).join('');
    } else {
      allDocsContainer.innerHTML = '<div class="col-span-full text-center py-20 text-tertiary-text">No documents found in the vault.</div>';
    }
  }

  // Document Modal Logic
  window.openDocument = (docId) => {
      const doc = window.vaultDocuments?.find(d => d.id === docId);
      if (!doc) return;
      
      const modal = document.getElementById('document-modal');
      const title = document.getElementById('document-modal-title');
      const content = document.getElementById('document-modal-content');
      const badge = document.getElementById('document-modal-badge');
      
      if (modal && title && content) {
          title.textContent = doc.title;
          badge.textContent = doc.type.replace('_', ' ');
          content.innerHTML = marked.parse ? marked.parse(doc.content || '') : (doc.content || '');
          
          modal.classList.remove('hidden');
          modal.classList.add('flex');
      }
  };

  window.closeDocument = () => {
      const modal = document.getElementById('document-modal');
      if (modal) {
          modal.classList.add('hidden');
          modal.classList.remove('flex');
      }
  };

  // Load Course Content (The Trajectory)
  const courseContainer = document.getElementById('course-container');
  if (courseContainer) {
    try {
      const response = await fetch('gemini_course_lms_import.json');
      if (response.ok) {
        const courseData = await response.json();
        const course = courseData.course;
        
        let currentWeekIndex = 0;
        let activeModuleIndex = null; 

        const renderTimeline = () => {
          const week = course.weeks[currentWeekIndex];
          
          let timelineHtml = `
            <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
                <div>
                    <h2 class="text-3xl font-bold text-brand-navy">${week.title}</h2>
                    <p class="text-xs font-semibold text-tertiary-text tracking-wide mt-2 uppercase">Phase ${week.week_number} of ${course.weeks.length}</p>
                </div>
                <div class="flex gap-2">
                    <button class="w-10 h-10 rounded-lg border border-border-subtle flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-brand-navy" ${currentWeekIndex === 0 ? 'disabled' : ''} onclick="window.setCourseWeek(${currentWeekIndex - 1})">
                        <span class="material-symbols-outlined text-[18px]">west</span>
                    </button>
                    <button class="w-10 h-10 rounded-lg border border-border-subtle flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-brand-navy" ${currentWeekIndex === course.weeks.length - 1 ? 'disabled' : ''} onclick="window.setCourseWeek(${currentWeekIndex + 1})">
                        <span class="material-symbols-outlined text-[18px]">east</span>
                    </button>
                </div>
            </div>
            
            <p class="text-secondary-text max-w-2xl mb-12 text-lg">${week.summary}</p>
            
            <div class="relative pl-8 md:pl-12 space-y-10 pb-12">
                <div class="timeline-line hidden md:block"></div>
                <!-- Highlight progress to 50% just for demo -->
                <div class="timeline-line-progress hidden md:block" style="height: 40%;"></div>
                
                ${week.modules.map((m, idx) => `
                    <div class="relative group cursor-pointer" onclick="window.setCourseModule(${idx})">
                        <!-- Node Point -->
                        <div class="absolute left-[-2rem] md:left-[-3.5rem] top-6 w-4 h-4 rounded-full bg-white border-2 border-border-subtle group-hover:border-brand-success transition-colors z-10"></div>
                        
                        <div class="clean-panel p-6 md:p-8 clean-panel-hover overflow-hidden relative">
                            <span class="text-xs font-semibold text-brand-success tracking-wider uppercase mb-2 block">Module 0${idx + 1}</span>
                            <h3 class="text-xl font-bold text-brand-navy mb-2">${m.title}</h3>
                            <p class="text-secondary-text text-sm line-clamp-2 md:line-clamp-none">${marked.parse ? marked.parse(m.content_markdown).replace(/<[^>]*>?/gm, '').substring(0, 120) + '...' : 'Interactive curriculum module.'}</p>
                            
                            <div class="mt-5 flex items-center text-tertiary-text group-hover:text-brand-success transition-colors text-xs font-semibold gap-2">
                                Start Module <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </div>
                        </div>
                    </div>
                `).join('')}

                <!-- Quiz Node -->
                <div class="relative group cursor-pointer" onclick="window.setCourseModule('quiz')">
                    <div class="absolute left-[-2rem] md:left-[-3.5rem] top-6 w-4 h-4 rounded-full bg-white border-2 border-border-subtle group-hover:border-brand-navy transition-colors z-10"></div>
                    
                    <div class="clean-panel p-6 md:p-8 clean-panel-hover border-brand-navy/10 overflow-hidden relative bg-slate-50">
                        <span class="text-xs font-semibold text-brand-navy tracking-wider uppercase mb-2 block">Knowledge Check</span>
                        <h3 class="text-xl font-bold text-brand-navy mb-2">${week.quiz.title}</h3>
                        <div class="mt-5 flex items-center text-brand-navy text-xs font-semibold gap-2">
                            Begin Assessment <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </div>
                    </div>
                </div>

            </div>
          `;
          
          courseContainer.innerHTML = timelineHtml;
        };
        
        const renderModule = () => {
            const week = course.weeks[currentWeekIndex];
            
            if (activeModuleIndex === 'quiz') {
                // Assessment View
                courseContainer.innerHTML = `
                    <button class="hover:bg-slate-100 text-secondary-text px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mb-8" onclick="window.setCourseModule(null)">
                        <span class="material-symbols-outlined text-[16px]">west</span> Back to Path
                    </button>
                    
                    <div class="clean-panel p-8 md:p-12">
                        <span class="text-xs font-semibold text-brand-navy tracking-wider uppercase mb-3 block">Assessment</span>
                        <h2 class="text-3xl font-bold mb-10 text-brand-navy">${week.quiz.title}</h2>
                        
                        <div class="space-y-10">
                            ${week.quiz.questions.map((q, qIdx) => `
                                <div>
                                    <p class="text-lg font-medium text-primary-text mb-5"><span class="text-brand-navy font-bold mr-3">0${qIdx + 1}.</span> ${q.question_text}</p>
                                    <div class="space-y-3 pl-8">
                                        ${q.options.map(opt => `
                                            <label class="flex items-start gap-4 p-4 border border-border-subtle rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group">
                                                <input type="radio" name="q_${q.question_id}" value="${opt.id}" class="mt-1 text-brand-navy focus:ring-brand-navy">
                                                <span class="text-secondary-text group-hover:text-primary-text transition-colors">${opt.text}</span>
                                            </label>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="mt-12 pt-8 border-t border-border-subtle">
                            <button class="bg-brand-navy hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-transform hover:scale-105 flex items-center gap-2">
                                Submit Answers <span class="material-symbols-outlined text-[18px]">check_circle</span>
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // Focus Reading Mode
                const mod = week.modules[activeModuleIndex];
                
                courseContainer.innerHTML = `
                    <button class="hover:bg-slate-100 text-secondary-text px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mb-8" onclick="window.setCourseModule(null)">
                        <span class="material-symbols-outlined text-[16px]">west</span> Back to Path
                    </button>
                    
                    <div class="clean-panel p-8 md:p-16 relative overflow-hidden bg-white">
                        <div class="max-w-3xl mx-auto">
                            <span class="text-xs font-semibold text-brand-success tracking-wider uppercase mb-3 block">Module 0${activeModuleIndex + 1}</span>
                            <h2 class="text-4xl font-bold mb-10 text-brand-navy leading-tight">${mod.title}</h2>
                            
                            <div class="prose prose-slate prose-lg prose-headings:font-bold prose-headings:text-brand-navy prose-a:text-brand-success prose-pre:bg-slate-50 prose-pre:border prose-pre:border-border-subtle prose-pre:rounded-xl max-w-none">
                                ${marked.parse ? marked.parse(mod.content_markdown) : mod.content_markdown.replace(/\\n/g, '<br/>')}
                            </div>
                            
                            <!-- Pagination -->
                            <div class="flex justify-between items-center mt-16 pt-8 border-t border-border-subtle">
                                <button class="text-tertiary-text hover:text-brand-navy transition-colors flex items-center gap-2 text-sm font-semibold tracking-wide disabled:opacity-0" ${activeModuleIndex === 0 ? 'disabled' : ''} onclick="window.setCourseModule(${activeModuleIndex - 1})">
                                    <span class="material-symbols-outlined text-[18px]">west</span> Previous
                                </button>
                                
                                <button class="text-brand-navy hover:text-brand-success transition-colors flex items-center gap-2 text-sm font-semibold tracking-wide" onclick="window.setCourseModule(${activeModuleIndex === week.modules.length - 1 ? "'quiz'" : activeModuleIndex + 1})">
                                    ${activeModuleIndex === week.modules.length - 1 ? 'Go to Assessment' : 'Next Module'} <span class="material-symbols-outlined text-[18px]">east</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        };

        window.setCourseWeek = (idx) => {
          currentWeekIndex = idx;
          activeModuleIndex = null;
          renderTimeline();
        };

        window.setCourseModule = (idx) => {
          activeModuleIndex = idx;
          if (idx === null) {
              renderTimeline();
          } else {
              renderModule();
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        renderTimeline();
        
      } else {
        throw new Error('Failed to fetch course data');
      }
    } catch (error) {
      console.error('Error loading course:', error);
      courseContainer.innerHTML = `
        <div class="clean-panel p-12 text-center border-red-200 bg-red-50">
          <span class="material-symbols-outlined text-4xl text-red-500 mb-3">error_outline</span>
          <h3 class="text-xl font-bold mb-2 text-red-700">Unable to load curriculum</h3>
          <p class="text-red-600/70 text-sm">Please check your connection and try again.</p>
        </div>
      `;
    }
  }
});
