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

  // Load Course Content
  const courseContainer = document.getElementById('course-container');
  if (courseContainer) {
    try {
      const response = await fetch('gemini_course_lms_import.json');
      if (response.ok) {
        const courseData = await response.json();
        const course = courseData.course;
        
        let currentWeekIndex = 0;
        let currentModuleIndex = -1; // -1 = week overview, 'quiz' = quiz view, 0+ = module

        const renderCourse = () => {
          const week = course.weeks[currentWeekIndex];
          let contentHtml = '';
          
          if (currentModuleIndex === -1) {
            // Week Overview
            contentHtml = `
              <div class="mb-8">
                <div class="inline-block px-3 py-1 bg-tertiary-container text-tertiary rounded-full font-label-caps text-[10px] mb-4">WEEK OVERVIEW</div>
                <h3 class="text-3xl text-on-surface font-headline-md mb-4">${week.title}</h3>
                <p class="text-on-surface-variant font-body-lg">${week.summary}</p>
              </div>
              
              <div class="space-y-4">
                <h4 class="text-lg text-secondary font-headline-md border-b border-outline-variant/20 pb-2 mb-4">Modules in this Week</h4>
                ${week.modules.map((m, idx) => `
                  <div class="p-5 bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 rounded cursor-pointer transition-colors group" onclick="window.setCourseModule(${idx})">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-4">
                        <div class="w-8 h-8 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-data-mono text-sm">${idx + 1}</div>
                        <span class="text-on-surface font-body-md group-hover:text-tertiary transition-colors">${m.title}</span>
                      </div>
                      <span class="material-symbols-outlined text-outline group-hover:text-tertiary transition-colors group-hover:translate-x-1">arrow_forward</span>
                    </div>
                  </div>
                `).join('')}
                
                <div class="p-5 bg-secondary/5 hover:bg-secondary/10 border border-secondary/20 rounded cursor-pointer transition-colors mt-8 group" onclick="window.setCourseModule('quiz')">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      <div class="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">
                        <span class="material-symbols-outlined text-[16px]">quiz</span>
                      </div>
                      <span class="text-on-surface font-body-md font-bold text-secondary">Knowledge Check: ${week.quiz.title}</span>
                    </div>
                    <span class="material-symbols-outlined text-secondary group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </div>
                </div>
              </div>
            `;
          } else if (currentModuleIndex === 'quiz') {
            // Quiz View
            contentHtml = `
              <div class="mb-8">
                <button class="text-tertiary text-sm flex items-center gap-1 mb-6 hover:text-secondary transition-colors" onclick="window.setCourseModule(-1)">
                  <span class="material-symbols-outlined text-[16px]">arrow_back</span> Back to Week Overview
                </button>
                <div class="inline-block px-3 py-1 bg-secondary/20 text-secondary rounded-full font-label-caps text-[10px] mb-4">ASSESSMENT</div>
                <h3 class="text-2xl text-on-surface font-headline-md mb-2">${week.quiz.title}</h3>
                <p class="text-on-surface-variant text-sm">Select the best answer for each question below.</p>
              </div>
              <div class="space-y-8">
                ${week.quiz.questions.map((q, qIdx) => `
                  <div class="bg-surface-container-low p-6 border border-outline-variant/20 rounded">
                    <p class="text-on-surface font-body-lg font-medium mb-6">${qIdx + 1}. ${q.question_text}</p>
                    <div class="space-y-3">
                      ${q.options.map(opt => `
                        <label class="flex items-start gap-3 p-4 border border-outline-variant/30 rounded cursor-pointer hover:bg-surface-container transition-colors group">
                          <input type="radio" name="q_${q.question_id}" value="${opt.id}" class="mt-1 text-secondary bg-surface border-outline-variant/50 focus:ring-secondary focus:ring-offset-surface">
                          <span class="text-on-surface-variant font-body-md group-hover:text-on-surface transition-colors">${opt.text}</span>
                        </label>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
                <div class="pt-4 border-t border-outline-variant/20">
                  <button class="bg-secondary text-ink-black px-8 py-3 rounded font-label-caps font-bold hover:opacity-90 transition-opacity flex items-center gap-2 justify-center w-full md:w-auto">
                    <span class="material-symbols-outlined text-[18px]">fact_check</span>
                    Submit Answers
                  </button>
                </div>
              </div>
            `;
          } else {
            // Module View
            const mod = week.modules[currentModuleIndex];
            
            // Visual Placeholders based on content keywords
            let illustration = '';
            const t = mod.title.toLowerCase();
            if (t.includes('environment') || t.includes('setup')) {
               illustration = `<div class="bg-surface-container flex flex-col md:flex-row items-center justify-center p-12 rounded-lg border border-outline-variant/20 mb-8"><span class="material-symbols-outlined text-6xl text-tertiary">terminal</span><div class="mt-4 md:mt-0 md:ml-6 text-center md:text-left"><h4 class="text-on-surface font-headline-md text-xl">Environment Sandbox</h4><p class="text-on-surface-variant text-sm mt-1">Interactive terminal environment initializing...</p></div></div>`;
            } else if (t.includes('parameter') || t.includes('behavior')) {
               illustration = `<div class="bg-surface-container flex flex-col md:flex-row items-center justify-center p-12 rounded-lg border border-outline-variant/20 mb-8"><span class="material-symbols-outlined text-6xl text-secondary">tune</span><div class="mt-4 md:mt-0 md:ml-6 text-center md:text-left"><h4 class="text-on-surface font-headline-md text-xl">Model Parameters</h4><p class="text-on-surface-variant text-sm mt-1">Adjust temperature, top_k, and top_p interactively.</p></div></div>`;
            } else if (t.includes('json') || t.includes('schema') || t.includes('structured')) {
               illustration = `<div class="bg-surface-container flex flex-col md:flex-row items-center justify-center p-12 rounded-lg border border-outline-variant/20 mb-8"><span class="material-symbols-outlined text-6xl text-tertiary">data_object</span><div class="mt-4 md:mt-0 md:ml-6 text-center md:text-left"><h4 class="text-on-surface font-headline-md text-xl">JSON Schema Validator</h4><p class="text-on-surface-variant text-sm mt-1">Live data extraction and schema enforcement visualization.</p></div></div>`;
            } else if (t.includes('multimodal')) {
               illustration = `<div class="bg-surface-container flex flex-col items-center justify-center p-10 rounded-lg border border-outline-variant/20 mb-8"><div class="flex gap-6 mb-4"><span class="material-symbols-outlined text-4xl text-secondary">image</span><span class="material-symbols-outlined text-4xl text-tertiary">mic</span><span class="material-symbols-outlined text-4xl text-secondary">videocam</span></div><h4 class="text-on-surface font-headline-md text-xl text-center">Multimodal Inputs</h4><p class="text-on-surface-variant text-sm mt-1 text-center">Drag and drop images or audio to see model inference.</p></div>`;
            } else if (t.includes('rag') || t.includes('embedding')) {
               illustration = `<div class="bg-surface-container flex flex-col md:flex-row items-center justify-center p-12 rounded-lg border border-outline-variant/20 mb-8"><span class="material-symbols-outlined text-6xl text-tertiary">schema</span><div class="mt-4 md:mt-0 md:ml-6 text-center md:text-left"><h4 class="text-on-surface font-headline-md text-xl">Vector Search Pipeline</h4><p class="text-on-surface-variant text-sm mt-1">Visualizing document chunks and embedding similarities.</p></div></div>`;
            } else {
               illustration = `<div class="bg-surface-container flex flex-col md:flex-row items-center justify-center p-12 rounded-lg border border-outline-variant/20 mb-8"><span class="material-symbols-outlined text-6xl text-tertiary">model_training</span><div class="mt-4 md:mt-0 md:ml-6 text-center md:text-left"><h4 class="text-on-surface font-headline-md text-xl">Interactive Example</h4><p class="text-on-surface-variant text-sm mt-1">Run the code snippets below in the sandbox.</p></div></div>`;
            }

            contentHtml = `
              <div class="mb-6">
                <button class="text-tertiary text-sm flex items-center gap-1 mb-6 hover:text-secondary transition-colors" onclick="window.setCourseModule(-1)">
                  <span class="material-symbols-outlined text-[16px]">arrow_back</span> Back to Week ${week.week_number} Overview
                </button>
                <div class="inline-block px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full font-label-caps text-[10px] mb-4">MODULE ${currentModuleIndex + 1}</div>
                ${illustration}
                <div class="prose prose-invert prose-pre:bg-[#1a1c1c] prose-pre:border prose-pre:border-outline-variant/20 max-w-none text-on-surface-variant">
                  ${marked.parse ? marked.parse(mod.content_markdown) : mod.content_markdown.replace(/\\n/g, '<br/>')}
                </div>
              </div>
              
              <!-- Pagination -->
              <div class="flex justify-between mt-12 pt-6 border-t border-outline-variant/20">
                 <button class="px-5 py-2 border border-outline-variant/50 text-on-surface rounded font-label-caps text-xs hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2" ${currentModuleIndex === 0 ? 'disabled' : ''} onclick="window.setCourseModule(${currentModuleIndex - 1})">
                   <span class="material-symbols-outlined text-[16px]">arrow_back</span> Previous
                 </button>
                 <button class="px-5 py-2 bg-tertiary text-on-tertiary rounded font-label-caps text-xs hover:opacity-90 transition-opacity flex items-center gap-2" onclick="window.setCourseModule(${currentModuleIndex === week.modules.length - 1 ? "'quiz'" : currentModuleIndex + 1})">
                   ${currentModuleIndex === week.modules.length - 1 ? 'Go to Quiz' : 'Next Module'} <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                 </button>
              </div>
            `;
          }

          let courseHtml = `
            <div class="flex flex-col md:flex-row gap-8">
              <!-- Sidebar Navigation -->
              <div class="md:w-1/4 shrink-0 border-r border-outline-variant/20 md:pr-6">
                <div class="mb-8">
                  <h2 class="font-headline-md text-2xl text-on-surface leading-tight">${course.title}</h2>
                  <div class="flex gap-2 mt-3">
                    <span class="text-[10px] font-label-caps bg-secondary/10 text-secondary px-2 py-1 rounded">${course.code}</span>
                  </div>
                </div>
                
                <nav class="space-y-2">
                  <div class="text-[10px] font-label-caps text-on-surface-variant mb-3 px-2">CURRICULUM</div>
                  ${course.weeks.map((w, idx) => `
                    <button class="w-full text-left px-4 py-3 rounded transition-colors flex items-center justify-between ${idx === currentWeekIndex ? 'bg-tertiary/10 border border-tertiary/30 text-tertiary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}" onclick="window.setCourseWeek(${idx})">
                      <div class="flex flex-col">
                        <span class="font-label-caps text-[10px] opacity-70 mb-1">WEEK ${w.week_number}</span>
                        <span class="font-body-md text-sm font-medium line-clamp-1">${w.title}</span>
                      </div>
                      ${idx === currentWeekIndex ? '<span class="material-symbols-outlined text-[18px]">chevron_right</span>' : ''}
                    </button>
                  `).join('')}
                </nav>
              </div>
              
              <!-- Main Content Area -->
              <div class="md:w-3/4 pb-12">
                 ${contentHtml}
              </div>
            </div>
          `;
          
          courseContainer.innerHTML = courseHtml;
          // Clean up any default card styling on the parent container so our layout breathes
          courseContainer.className = "mt-4 relative";
        };

        window.setCourseWeek = (idx) => {
          currentWeekIndex = idx;
          currentModuleIndex = -1;
          renderCourse();
        };

        window.setCourseModule = (idx) => {
          currentModuleIndex = idx;
          renderCourse();
          // Scroll to top of course container smoothly
          document.getElementById('course-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        renderCourse();
      } else {
        throw new Error('Failed to fetch course data');
      }
    } catch (error) {
      console.error('Error loading course:', error);
      courseContainer.innerHTML = `
        <div class="text-center py-12">
          <span class="material-symbols-outlined text-6xl text-error mb-4">error</span>
          <h3 class="text-2xl text-on-surface font-headline-md mb-2">Error Loading Curriculum</h3>
          <p class="text-on-surface-variant font-body-md max-w-md mx-auto">Please try again later or contact support.</p>
        </div>
      `;
    }
  }
});
