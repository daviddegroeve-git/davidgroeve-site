document.addEventListener('DOMContentLoaded', async () => {
    // Rely on window.requireAuth to ensure the user is an admin
    const authInfo = await window.requireAuth(['admin']);
    if (!authInfo) return;
    
    const { supabase } = authInfo;
    
    // --- State ---
    let jobs = [];
    let contacts = [];
    let contact_applications = [];
    let interactions = [];

    // --- Sub-navigation Routing ---
    const jobNavLinks = document.querySelectorAll('.job-nav');
    const jobTabContents = document.querySelectorAll('.job-tab-content');

    jobNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-subtarget');
            
            // Reset nav styles
            jobNavLinks.forEach(nav => {
                nav.classList.remove('text-secondary', 'border-b-2', 'border-secondary');
                nav.classList.add('text-on-surface-variant');
            });
            
            // Set active nav styles
            link.classList.remove('text-on-surface-variant');
            link.classList.add('text-secondary', 'border-b-2', 'border-secondary');

            // Toggle contents
            jobTabContents.forEach(content => {
                if (content.id === targetId) {
                    content.classList.remove('hidden');
                    content.classList.add('block');
                } else {
                    content.classList.add('hidden');
                    content.classList.remove('block');
                }
            });
        });
    });

    // --- Data Fetching ---
    async function loadData() {
        const [jobsRes, contactsRes, caRes, intRes] = await Promise.all([
            supabase.from('job_applications').select('*').order('next_action_date', { ascending: true, nullsFirst: false }),
            supabase.from('contacts').select('*').order('last_contacted', { ascending: false, nullsFirst: false }),
            supabase.from('contact_applications').select('*'),
            supabase.from('interactions').select('*').order('date', { ascending: false })
        ]);

        if (jobsRes.error) console.error("Error fetching jobs:", jobsRes.error);
        else jobs = jobsRes.data || [];

        if (contactsRes.error) console.error("Error fetching contacts:", contactsRes.error);
        else contacts = contactsRes.data || [];

        if (caRes.error) console.error("Error fetching contact_applications:", caRes.error);
        else contact_applications = caRes.data || [];
        
        if (intRes.error) console.error("Error fetching interactions:", intRes.error);
        else interactions = intRes.data || [];

        renderAll();
    }

    function renderAll() {
        renderDashboard();
        renderKanban();
        renderTable();
        renderContacts();
    }

    // --- Dashboard View ---
    function renderDashboard() {
        // Metrics
        const activeJobs = jobs.filter(j => !['Rejected', 'No Response', 'Withdrawn'].includes(j.status)).length;
        const totalApplied = jobs.filter(j => !['Target', 'Rejected', 'No Response', 'Withdrawn'].includes(j.status)).length;
        
        const now = new Date();
        now.setHours(0,0,0,0);
        
        const next7Days = new Date(now);
        next7Days.setDate(next7Days.getDate() + 7);

        const overdueCount = jobs.filter(j => j.next_action_date && new Date(j.next_action_date) < now && !['Rejected', 'No Response', 'Withdrawn'].includes(j.status)).length;

        const metricsContainer = document.getElementById('job-metrics-container');
        if (metricsContainer) {
            metricsContainer.innerHTML = `
                <div class="bg-surface-container-low p-4 rounded border ${overdueCount > 0 ? 'border-error/50' : 'border-outline-variant/20'}">
                    <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">Active Apps</p>
                    <p class="font-display-lg text-[36px] text-secondary font-data-mono">${activeJobs}</p>
                    ${overdueCount > 0 ? `<p class="font-data-mono text-[12px] text-error mt-2">${overdueCount} overdue actions!</p>` : ''}
                </div>
                <div class="bg-surface-container-low p-4 rounded border border-outline-variant/20">
                    <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">Total Applied</p>
                    <p class="font-display-lg text-[36px] text-secondary font-data-mono">${totalApplied}</p>
                </div>
                <div class="bg-surface-container-low p-4 rounded border border-outline-variant/20">
                    <p class="font-label-caps text-label-caps text-on-surface-variant mb-2">Total Tracked</p>
                    <p class="font-display-lg text-[36px] text-secondary font-data-mono">${jobs.length}</p>
                </div>
            `;
        }

        // Funnel
        const funnelContainer = document.getElementById('job-funnel-container');
        if (funnelContainer) {
            const stages = ['Target', 'Applied', 'Outreach Sent', 'Recruiter Screen', 'Interview', 'Final Round', 'Offer'];
            const stageCounts = stages.map(stage => {
                const stageIndex = stages.indexOf(stage);
                // Funnel counts everyone who is AT LEAST this stage.
                return jobs.filter(j => {
                   if (['Rejected', 'No Response', 'Withdrawn'].includes(j.status)) return false;
                   return stages.indexOf(j.status) >= stageIndex;
                }).length;
            });

            const maxCount = Math.max(1, stageCounts[0]); // to avoid div by zero

            funnelContainer.innerHTML = stages.map((stage, idx) => {
                const count = stageCounts[idx];
                const heightPct = Math.max(10, (count / maxCount) * 100);
                return `
                    <div class="w-full flex flex-col items-center justify-end h-full gap-2 group relative">
                        <div class="w-full bg-secondary/20 hover:bg-secondary/40 transition-colors rounded-t border-t border-secondary relative" style="height: ${heightPct}%;">
                             <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-on-surface font-bold text-sm">${count}</div>
                        </div>
                        <div class="text-on-surface-variant font-data-mono text-[10px] text-center w-full truncate" title="${stage}">${stage}</div>
                    </div>
                `;
            }).join('');
        }

        // Next Actions (Jobs)
        const nextActionsContainer = document.getElementById('job-next-actions-container');
        if (nextActionsContainer) {
            const upcoming = jobs.filter(j => {
                if (!j.next_action_date || ['Rejected', 'No Response', 'Withdrawn'].includes(j.status)) return false;
                const naDate = new Date(j.next_action_date);
                return naDate <= next7Days;
            }).sort((a, b) => new Date(a.next_action_date) - new Date(b.next_action_date));

            if (upcoming.length === 0) {
                nextActionsContainer.innerHTML = '<p class="text-on-surface-variant italic">No pending actions for this week.</p>';
            } else {
                nextActionsContainer.innerHTML = upcoming.map(j => {
                    const isOverdue = new Date(j.next_action_date) < now;
                    return `
                        <div class="p-3 border border-outline-variant/30 rounded flex justify-between items-center bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer" onclick="openAppDetail('${j.id}')">
                            <div>
                                <p class="text-on-surface font-medium">${j.company} <span class="text-on-surface-variant text-sm font-normal">— ${j.role_title}</span></p>
                                <p class="text-sm ${isOverdue ? 'text-error font-bold' : 'text-on-surface-variant'}">${j.next_action || 'Needs follow-up'}</p>
                            </div>
                            <div class="text-right">
                                <span class="font-data-mono text-xs ${isOverdue ? 'bg-error/20 text-error' : 'bg-primary-container text-primary'} px-2 py-1 rounded">
                                    ${new Date(j.next_action_date).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
        
        // Follow-ups (Interactions)
        const followupsContainer = document.getElementById('job-followups-container');
        if (followupsContainer) {
            const upcomingInts = interactions.filter(i => {
                if (!i.follow_up_needed || !i.follow_up_date) return false;
                const fuDate = new Date(i.follow_up_date);
                return fuDate <= next7Days;
            }).sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date));
            
            if (upcomingInts.length === 0) {
                followupsContainer.innerHTML = '<p class="text-on-surface-variant italic">No interaction follow-ups for this week.</p>';
            } else {
                followupsContainer.innerHTML = upcomingInts.map(i => {
                    const isOverdue = new Date(i.follow_up_date) < now;
                    const contact = contacts.find(c => c.id === i.contact_id);
                    return `
                        <div class="p-3 border border-outline-variant/30 rounded flex justify-between items-center bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer" onclick="openContactDetail('${i.contact_id}')">
                            <div>
                                <p class="text-on-surface font-medium">${contact ? contact.name : 'Unknown Contact'}</p>
                                <p class="text-sm ${isOverdue ? 'text-error font-bold' : 'text-on-surface-variant'} line-clamp-1">${i.summary}</p>
                            </div>
                            <div class="text-right flex-shrink-0">
                                <span class="font-data-mono text-xs ${isOverdue ? 'bg-error/20 text-error' : 'bg-secondary/20 text-secondary'} px-2 py-1 rounded border ${isOverdue ? 'border-error/30' : 'border-secondary/30'}">
                                    ${new Date(i.follow_up_date).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    // --- Kanban View ---
    function renderKanban() {
        const kanbanBoard = document.getElementById('kanban-board');
        if (!kanbanBoard) return;

        const stages = ['Target', 'Applied', 'Outreach Sent', 'Recruiter Screen', 'Interview', 'Final Round', 'Offer', 'Rejected', 'No Response', 'Withdrawn'];
        
        kanbanBoard.innerHTML = stages.map(stage => {
            const stageJobs = jobs.filter(j => j.status === stage);
            const isInactiveStage = ['Rejected', 'No Response', 'Withdrawn'].includes(stage);
            
            return `
                <div class="flex-shrink-0 w-80 bg-surface-container-low border ${isInactiveStage ? 'border-error/20 opacity-70' : 'border-outline-variant/30'} rounded flex flex-col max-h-[70vh]">
                    <div class="p-3 border-b border-outline-variant/30 font-label-caps text-label-caps text-on-surface-variant flex justify-between items-center sticky top-0 bg-surface-container-low">
                        <span>${stage}</span>
                        <span class="bg-surface-container-high px-2 rounded">${stageJobs.length}</span>
                    </div>
                    <div class="p-2 space-y-2 flex-1 overflow-y-auto kanban-column" data-status="${stage}">
                        ${stageJobs.map(j => createKanbanCard(j)).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Setup Drag and Drop & Clicks
        document.querySelectorAll('.kanban-card').forEach(card => {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);
            card.addEventListener('click', (e) => {
                if(e.target.closest('button')) return; // ignore buttons if any
                openAppDetail(card.getAttribute('data-id'));
            });
        });

        document.querySelectorAll('.kanban-column').forEach(column => {
            column.addEventListener('dragover', handleDragOver);
            column.addEventListener('drop', handleDrop);
        });
    }

    function createKanbanCard(job) {
        let badgeColor = 'bg-surface-container text-on-surface-variant';
        if (job.priority_tier === 'Riyadh') badgeColor = 'bg-secondary/20 text-secondary border border-secondary/30';
        else if (job.priority_tier === 'GCC') badgeColor = 'bg-tertiary/20 text-tertiary border border-tertiary/30';

        const hasNextAction = job.next_action_date ? true : false;
        const isOverdue = hasNextAction && new Date(job.next_action_date) < new Date(new Date().setHours(0,0,0,0));

        return `
            <div class="kanban-card bg-surface p-3 rounded border border-outline-variant/30 cursor-grab hover:border-secondary transition-colors" draggable="true" data-id="${job.id}">
                <div class="flex justify-between items-start mb-2 gap-2">
                    <p class="text-on-surface font-medium truncate" title="${job.company}">${job.company}</p>
                    <span class="font-label-caps text-[10px] px-1.5 py-0.5 rounded ${badgeColor} flex-shrink-0">${job.priority_tier}</span>
                </div>
                <p class="text-on-surface-variant text-sm mb-3 line-clamp-2" title="${job.role_title}">${job.role_title}</p>
                ${hasNextAction ? `
                    <div class="flex items-center gap-1 font-data-mono text-[11px] ${isOverdue ? 'text-error' : 'text-primary'}">
                        <span class="material-symbols-outlined text-[14px]">event</span>
                        <span>${new Date(job.next_action_date).toLocaleDateString()}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    let draggedCardId = null;

    function handleDragStart(e) {
        draggedCardId = e.target.getAttribute('data-id');
        e.target.classList.add('opacity-50');
    }

    function handleDragEnd(e) {
        e.target.classList.remove('opacity-50');
        draggedCardId = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('bg-surface-container-high/50');
    }

    async function handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-surface-container-high/50');
        
        const newStatus = e.currentTarget.getAttribute('data-status');
        if (!draggedCardId || !newStatus) return;

        const job = jobs.find(j => j.id === draggedCardId);
        if (!job || job.status === newStatus) return;

        const oldStatus = job.status;
        job.status = newStatus;
        job.updated_at = new Date().toISOString();
        
        const updates = { status: newStatus, updated_at: job.updated_at };
        
        if (newStatus === 'Applied' && oldStatus === 'Target' && !job.date_applied) {
            const today = new Date().toISOString().split('T')[0];
            job.date_applied = today;
            updates.date_applied = today;
        }

        renderAll();

        const { error } = await supabase.from('job_applications').update(updates).eq('id', job.id);
        if (error) {
            console.error("Failed to update status", error);
            job.status = oldStatus;
            renderAll();
        }
    }

    // --- Table View ---
    function renderTable() {
        const tableBody = document.getElementById('job-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = jobs.map(j => {
            return `
                <tr class="hover:bg-surface-container/50 transition-colors border-b border-outline-variant/10 cursor-pointer app-row" data-id="${j.id}">
                    <td class="p-3">
                        <p class="font-medium text-on-surface hover:text-secondary company-link" data-company="${j.company}">${j.company}</p>
                        <p class="text-xs text-on-surface-variant truncate w-32" title="${j.location || ''}">${j.location || '-'}</p>
                    </td>
                    <td class="p-3">
                        <p class="text-sm text-on-surface line-clamp-2 w-48" title="${j.role_title}">${j.role_title}</p>
                    </td>
                    <td class="p-3">
                        <select class="status-select bg-surface border border-outline-variant/30 rounded p-1 text-sm w-32" data-id="${j.id}">
                            ${['Target', 'Applied', 'Outreach Sent', 'Recruiter Screen', 'Interview', 'Final Round', 'Offer', 'Rejected', 'No Response', 'Withdrawn'].map(s => `
                                <option value="${s}" ${s === j.status ? 'selected' : ''}>${s}</option>
                            `).join('')}
                        </select>
                    </td>
                    <td class="p-3">
                        <input type="date" class="date-edit bg-surface border border-outline-variant/30 rounded p-1 text-sm w-32" data-id="${j.id}" value="${j.next_action_date || ''}">
                    </td>
                    <td class="p-3">
                        <input type="text" class="action-edit bg-surface border border-outline-variant/30 rounded p-1 text-sm w-48" data-id="${j.id}" value="${j.next_action || ''}" placeholder="Next step...">
                    </td>
                    <td class="p-3 text-right">
                        <div class="flex gap-2 justify-end">
                            <button class="text-outline-variant hover:text-error transition-colors set-status-btn" data-id="${j.id}" data-status="Rejected" title="Mark Rejected">
                                <span class="material-symbols-outlined text-[18px]">cancel</span>
                            </button>
                            <button class="text-outline-variant hover:text-on-surface-variant transition-colors set-status-btn" data-id="${j.id}" data-status="No Response" title="Mark No Response">
                                <span class="material-symbols-outlined text-[18px]">block</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach listeners
        document.querySelectorAll('.app-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('select') || e.target.closest('input') || e.target.closest('button') || e.target.closest('.company-link')) return;
                openAppDetail(row.getAttribute('data-id'));
            });
        });
        
        document.querySelectorAll('.company-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openCompanyRollup(link.getAttribute('data-company'));
            });
        });

        document.querySelectorAll('.status-select').forEach(el => {
            el.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                const job = jobs.find(j => j.id === id);
                if(job) {
                    job.status = newStatus;
                    job.updated_at = new Date().toISOString();
                    const { error } = await supabase.from('job_applications').update({ status: newStatus, updated_at: job.updated_at }).eq('id', id);
                    if(!error) renderAll();
                }
            });
        });

        document.querySelectorAll('.date-edit').forEach(el => {
            el.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const newDate = e.target.value || null;
                const job = jobs.find(j => j.id === id);
                if(job) {
                    job.next_action_date = newDate;
                    job.updated_at = new Date().toISOString();
                    await supabase.from('job_applications').update({ next_action_date: newDate, updated_at: job.updated_at }).eq('id', id);
                    renderDashboard(); // Update dashboard
                }
            });
        });

        document.querySelectorAll('.action-edit').forEach(el => {
            el.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const newAction = e.target.value;
                const job = jobs.find(j => j.id === id);
                if(job) {
                    job.next_action = newAction;
                    job.updated_at = new Date().toISOString();
                    await supabase.from('job_applications').update({ next_action: newAction, updated_at: job.updated_at }).eq('id', id);
                    renderDashboard();
                }
            });
        });

        document.querySelectorAll('.set-status-btn').forEach(el => {
            el.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const id = btn.getAttribute('data-id');
                const status = btn.getAttribute('data-status');
                const job = jobs.find(j => j.id === id);
                if(job) {
                    job.status = status;
                    job.updated_at = new Date().toISOString();
                    await supabase.from('job_applications').update({ status, updated_at: job.updated_at }).eq('id', id);
                    renderAll();
                }
            });
        });
    }

    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (jobs.length === 0) return;
            const headers = ['Company', 'Role', 'Location', 'Priority', 'Source', 'Status', 'Date Applied', 'Next Action', 'Next Action Date'];
            const rows = jobs.map(j => [
                j.company, j.role_title, j.location || '', j.priority_tier, j.source_type || '', j.status, j.date_applied || '', j.next_action || '', j.next_action_date || ''
            ]);
            
            let csvContent = "data:text/csv;charset=utf-8," 
                + headers.join(",") + "\n"
                + rows.map(e => e.map(f => `"${String(f).replace(/"/g, '""')}"`).join(",")).join("\n");
                
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `job_search_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // --- Contacts View ---
    function renderContacts() {
        const tableBody = document.getElementById('contacts-table-body');
        if (!tableBody) return;

        const now = new Date();
        const twoWeeksAgo = new Date(now);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        tableBody.innerHTML = contacts.map(c => {
            const lastContacted = c.last_contacted ? new Date(c.last_contacted) : null;
            const needsFollowUp = lastContacted && lastContacted < twoWeeksAgo;
            
            return `
                <tr class="hover:bg-surface-container/50 transition-colors border-b border-outline-variant/10 cursor-pointer contact-row" data-id="${c.id}">
                    <td class="p-3">
                        <div class="flex items-center gap-2">
                            <span class="font-medium text-on-surface">${c.name}</span>
                            ${c.linkedin_url ? `<a href="${c.linkedin_url}" target="_blank" class="text-secondary hover:text-secondary-fixed"><span class="material-symbols-outlined text-[16px]">link</span></a>` : ''}
                        </div>
                        <p class="text-xs text-on-surface-variant truncate w-48">${c.role_title || '-'}</p>
                    </td>
                    <td class="p-3 text-sm text-on-surface"><span class="hover:text-secondary company-link" data-company="${c.company || ''}">${c.company || '-'}</span></td>
                    <td class="p-3 text-sm text-on-surface-variant">${c.relationship_type || '-'}</td>
                    <td class="p-3">
                        <span class="font-data-mono text-sm ${needsFollowUp ? 'text-error font-bold' : 'text-on-surface'}">
                            ${c.last_contacted ? new Date(c.last_contacted).toLocaleDateString() : 'Never'}
                        </span>
                    </td>
                    <td class="p-3">
                        ${needsFollowUp ? '<span class="px-2 py-1 bg-error/10 text-error text-[10px] font-label-caps rounded border border-error/30">Needs Follow-up</span>' : ''}
                    </td>
                </tr>
            `;
        }).join('');
        
        document.querySelectorAll('.contact-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('a') || e.target.closest('.company-link')) return;
                openContactDetail(row.getAttribute('data-id'));
            });
        });
        
        document.querySelectorAll('.contact-row .company-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const comp = link.getAttribute('data-company');
                if(comp) openCompanyRollup(comp);
            });
        });
    }

    // --- Detail Modals Helper ---
    window.openAppDetail = (id) => {
        const job = jobs.find(j => j.id === id);
        if(!job) return;
        
        document.getElementById('app-detail-id').value = job.id;
        document.getElementById('app-detail-company').textContent = job.company;
        document.getElementById('app-detail-role').textContent = job.role_title;
        
        // Populate form
        const fields = ['company', 'role', 'status', 'priority', 'location', 'cv', 'source', 'source-detail', 'url', 'next-action', 'next-action-date', 'date-applied', 'notes'];
        fields.forEach(f => {
            const el = document.getElementById(`edit-app-${f}`);
            if(el) {
                const key = f.replace(/-/g, '_').replace('role', 'role_title').replace('cv', 'cv_version').replace('url', 'job_url');
                el.value = job[key] || '';
            }
        });
        
        const urlBtn = document.getElementById('app-detail-url-btn');
        if (job.job_url) {
            urlBtn.href = job.job_url;
            urlBtn.style.display = 'flex';
        } else {
            urlBtn.style.display = 'none';
        }

        renderAppLinkedContacts(job.id, job.company);
        renderAppInteractions(job.id);
        
        showModal('applicationDetailModal');
    };

    window.openContactDetail = (id) => {
        const contact = contacts.find(c => c.id === id);
        if(!contact) return;
        
        document.getElementById('contact-detail-id').value = contact.id;
        document.getElementById('contact-detail-name').textContent = contact.name;
        document.getElementById('contact-detail-role').textContent = (contact.role_title || '') + (contact.company ? ` at ${contact.company}` : '');
        
        const fields = ['name', 'type', 'role', 'company', 'email', 'phone', 'channel', 'linkedin'];
        fields.forEach(f => {
            const el = document.getElementById(`edit-contact-${f}`);
            if (el) {
                const key = f === 'type' ? 'relationship_type' : f === 'channel' ? 'preferred_channel' : f === 'linkedin' ? 'linkedin_url' : f === 'role' ? 'role_title' : f;
                el.value = contact[key] || '';
            }
        });
        
        renderContactLinkedApps(contact.id);
        renderContactInteractions(contact.id);
        
        showModal('contactDetailModal');
    };

    window.openCompanyRollup = (companyName) => {
        if(!companyName) return;
        document.getElementById('rollup-company-name').textContent = companyName;
        
        const cJobs = jobs.filter(j => j.company.toLowerCase() === companyName.toLowerCase());
        const cContacts = contacts.filter(c => c.company && c.company.toLowerCase() === companyName.toLowerCase());
        
        const appsContainer = document.getElementById('rollup-apps');
        appsContainer.innerHTML = cJobs.map(j => `
            <div class="p-3 bg-surface-container border border-outline-variant/30 rounded cursor-pointer hover:border-secondary" onclick="openAppDetail('${j.id}')">
                <p class="font-medium text-on-surface">${j.role_title}</p>
                <p class="text-sm text-on-surface-variant">${j.status}</p>
            </div>
        `).join('') || '<p class="text-sm text-on-surface-variant">No applications found.</p>';
        
        const contactsContainer = document.getElementById('rollup-contacts');
        contactsContainer.innerHTML = cContacts.map(c => `
            <div class="p-3 bg-surface-container border border-outline-variant/30 rounded cursor-pointer hover:border-secondary" onclick="openContactDetail('${c.id}')">
                <p class="font-medium text-on-surface">${c.name}</p>
                <p class="text-sm text-on-surface-variant">${c.role_title || '-'}</p>
            </div>
        `).join('') || '<p class="text-sm text-on-surface-variant">No contacts found.</p>';
        
        showModal('companyRollupModal');
    };

    function showModal(modalId) {
        document.querySelectorAll('.close-modal').forEach(btn => {
            const modal = btn.closest('.bg-surface-container-low');
            if (modal && modal.id !== modalId) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.getElementById('modalBackdrop')?.classList.remove('hidden');
            document.getElementById('adminModals')?.classList.remove('hidden');
        }
    }

    // Modal closing logic
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.bg-surface-container-low');
            if(modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            // If no other modals are open, hide backdrop
            const openModals = document.querySelectorAll('.bg-surface-container-low.flex');
            if(openModals.length === 0) {
                document.getElementById('modalBackdrop')?.classList.add('hidden');
                document.getElementById('adminModals')?.classList.add('hidden');
            }
        });
    });

    // --- Application Detail Forms & Logic ---
    const appDetailForm = document.getElementById('appDetailForm');
    if (appDetailForm) {
        appDetailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('app-detail-id').value;
            const btn = appDetailForm.querySelector('button[type="submit"]');
            btn.textContent = 'Saving...';
            
            const updates = {
                company: document.getElementById('edit-app-company').value,
                role_title: document.getElementById('edit-app-role').value,
                status: document.getElementById('edit-app-status').value,
                priority_tier: document.getElementById('edit-app-priority').value,
                location: document.getElementById('edit-app-location').value,
                cv_version: document.getElementById('edit-app-cv').value,
                source_type: document.getElementById('edit-app-source').value,
                source_detail: document.getElementById('edit-app-source-detail').value,
                job_url: document.getElementById('edit-app-url').value,
                next_action: document.getElementById('edit-app-next-action').value,
                next_action_date: document.getElementById('edit-app-next-action-date').value || null,
                date_applied: document.getElementById('edit-app-date-applied').value || null,
                notes: document.getElementById('edit-app-notes').value,
                updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase.from('job_applications').update(updates).eq('id', id);
            btn.textContent = 'Save Details';
            if (!error) {
                const jobIndex = jobs.findIndex(j => j.id === id);
                if(jobIndex > -1) {
                    jobs[jobIndex] = { ...jobs[jobIndex], ...updates };
                }
                document.getElementById('app-detail-company').textContent = updates.company;
                document.getElementById('app-detail-role').textContent = updates.role_title;
                renderAll();
            }
        });
    }

    function renderAppLinkedContacts(appId, companyName) {
        const container = document.getElementById('app-linked-contacts');
        const links = contact_applications.filter(ca => ca.application_id === appId);
        const linkedContacts = links.map(l => contacts.find(c => c.id === l.contact_id)).filter(Boolean);
        
        container.innerHTML = linkedContacts.map(c => `
            <div class="p-2 bg-surface border border-outline-variant/30 rounded flex justify-between items-center">
                <div>
                    <p class="text-sm font-medium text-on-surface cursor-pointer hover:text-secondary" onclick="openContactDetail('${c.id}')">${c.name}</p>
                    <p class="text-xs text-on-surface-variant">${c.role_title || c.relationship_type}</p>
                </div>
                <button class="text-outline-variant hover:text-error text-xs" onclick="unlinkContact('${c.id}', '${appId}')"><span class="material-symbols-outlined text-[16px]">link_off</span></button>
            </div>
        `).join('') || '<p class="text-sm text-on-surface-variant">No linked contacts.</p>';
        
        // Populate existing contact select
        const select = document.getElementById('app-existing-contact');
        select.innerHTML = '<option value="">Select Existing...</option>';
        
        // Sort by company match first
        const sortedContacts = [...contacts].sort((a, b) => {
            const aMatch = (a.company || '').toLowerCase() === (companyName || '').toLowerCase();
            const bMatch = (b.company || '').toLowerCase() === (companyName || '').toLowerCase();
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return a.name.localeCompare(b.name);
        });
        
        sortedContacts.forEach(c => {
            if (!linkedContacts.find(lc => lc.id === c.id)) {
                const isMatch = (c.company || '').toLowerCase() === (companyName || '').toLowerCase();
                select.innerHTML += `<option value="${c.id}">${c.name} ${isMatch ? '(Match)' : ''} - ${c.company || 'No Company'}</option>`;
            }
        });
    }

    window.unlinkContact = async (contactId, appId) => {
        const { error } = await supabase.from('contact_applications').delete().match({ contact_id: contactId, application_id: appId });
        if (!error) {
            contact_applications = contact_applications.filter(ca => !(ca.contact_id === contactId && ca.application_id === appId));
            const job = jobs.find(j => j.id === appId);
            if(job) renderAppLinkedContacts(appId, job.company);
        }
    };

    const appAddContactBtn = document.getElementById('appAddContactBtn');
    const appAddContactArea = document.getElementById('appAddContactArea');
    if(appAddContactBtn && appAddContactArea) {
        appAddContactBtn.addEventListener('click', () => {
            appAddContactArea.classList.toggle('hidden');
        });
    }

    const appLinkContactForm = document.getElementById('appLinkContactForm');
    if(appLinkContactForm) {
        appLinkContactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contactId = document.getElementById('app-existing-contact').value;
            const appId = document.getElementById('app-detail-id').value;
            if(!contactId || !appId) return;
            
            const { error, data } = await supabase.from('contact_applications').insert([{ contact_id: contactId, application_id: appId }]).select('*');
            if(!error && data) {
                contact_applications.push(data[0]);
                const job = jobs.find(j => j.id === appId);
                if(job) renderAppLinkedContacts(appId, job.company);
                appAddContactArea.classList.add('hidden');
            }
        });
    }
    
    document.getElementById('appCreateContactBtn')?.addEventListener('click', () => {
        // Open contact modal in "new" mode, with some pre-fills
        const appId = document.getElementById('app-detail-id').value;
        const job = jobs.find(j => j.id === appId);
        if(job) {
            document.getElementById('contact-detail-id').value = 'NEW_FOR_' + appId;
            document.getElementById('contact-detail-name').textContent = "New Contact";
            document.getElementById('contact-detail-role').textContent = `For ${job.company}`;
            document.getElementById('edit-contact-name').value = '';
            document.getElementById('edit-contact-company').value = job.company;
            // Clear others
            ['type', 'role', 'email', 'phone', 'channel', 'linkedin'].forEach(f => {
                const el = document.getElementById(`edit-contact-${f}`);
                if(el) el.value = '';
            });
            renderContactLinkedApps(null);
            renderContactInteractions(null);
            showModal('contactDetailModal');
        }
    });

    // --- Contact Detail Forms & Logic ---
    const contactDetailForm = document.getElementById('contactDetailForm');
    if (contactDetailForm) {
        contactDetailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('contact-detail-id').value;
            const btn = contactDetailForm.querySelector('button[type="submit"]');
            btn.textContent = 'Saving...';
            
            const payload = {
                name: document.getElementById('edit-contact-name').value,
                relationship_type: document.getElementById('edit-contact-type').value,
                role_title: document.getElementById('edit-contact-role').value,
                company: document.getElementById('edit-contact-company').value,
                email: document.getElementById('edit-contact-email').value,
                phone: document.getElementById('edit-contact-phone').value,
                preferred_channel: document.getElementById('edit-contact-channel').value,
                linkedin_url: document.getElementById('edit-contact-linkedin').value,
            };
            
            if (id && id.startsWith('NEW_FOR_')) {
                const appId = id.replace('NEW_FOR_', '');
                const { data, error } = await supabase.from('contacts').insert([payload]).select('*');
                if(!error && data) {
                    contacts.push(data[0]);
                    await supabase.from('contact_applications').insert([{ contact_id: data[0].id, application_id: appId }]);
                    contact_applications.push({ contact_id: data[0].id, application_id: appId });
                    renderAll();
                    // Go back to app
                    openAppDetail(appId);
                }
            } else {
                const { error } = await supabase.from('contacts').update(payload).eq('id', id);
                if (!error) {
                    const cIndex = contacts.findIndex(c => c.id === id);
                    if(cIndex > -1) {
                        contacts[cIndex] = { ...contacts[cIndex], ...payload };
                    }
                    document.getElementById('contact-detail-name').textContent = payload.name;
                    document.getElementById('contact-detail-role').textContent = (payload.role_title || '') + (payload.company ? ` at ${payload.company}` : '');
                    renderAll();
                }
            }
            btn.textContent = 'Save Details';
        });
    }

    function renderContactLinkedApps(contactId) {
        const container = document.getElementById('contact-linked-apps');
        if (!contactId) {
            container.innerHTML = '<p class="text-sm text-on-surface-variant">Save contact first.</p>';
            return;
        }
        
        const links = contact_applications.filter(ca => ca.contact_id === contactId);
        const linkedApps = links.map(l => jobs.find(j => j.id === l.application_id)).filter(Boolean);
        
        container.innerHTML = linkedApps.map(j => `
            <div class="p-2 bg-surface border border-outline-variant/30 rounded flex justify-between items-center cursor-pointer hover:border-secondary" onclick="openAppDetail('${j.id}')">
                <div>
                    <p class="text-sm font-medium text-on-surface">${j.company}</p>
                    <p class="text-xs text-on-surface-variant">${j.role_title} • <span class="text-primary">${j.status}</span></p>
                </div>
            </div>
        `).join('') || '<p class="text-sm text-on-surface-variant">No linked applications.</p>';
    }

    // --- Interactions Logic ---
    function renderAppInteractions(appId) {
        const container = document.getElementById('app-interactions-list');
        const appInts = interactions.filter(i => i.application_id === appId).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        
        container.innerHTML = appInts.map(i => {
            const contact = contacts.find(c => c.id === i.contact_id);
            return `
            <div class="p-2 border-b border-outline-variant/10 text-sm">
                <div class="flex justify-between text-xs text-on-surface-variant mb-1">
                    <span><span class="font-bold">${contact ? contact.name : 'Someone'}</span> • ${i.channel} (${i.direction})</span>
                    <span>${new Date(i.date).toLocaleDateString()}</span>
                </div>
                <p class="text-on-surface">${i.summary}</p>
                ${i.follow_up_needed ? `<p class="text-xs text-error mt-1">Follow-up: ${i.follow_up_date ? new Date(i.follow_up_date).toLocaleDateString() : 'Yes'}</p>` : ''}
            </div>
        `}).join('') || '<p class="text-sm text-on-surface-variant">No activity logged.</p>';
    }

    function renderContactInteractions(contactId) {
        const container = document.getElementById('contact-interactions-list');
        if (!contactId) {
            container.innerHTML = '<p class="text-sm text-on-surface-variant">Save contact first.</p>';
            return;
        }
        
        const cInts = interactions.filter(i => i.contact_id === contactId).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        
        container.innerHTML = cInts.map(i => {
            const app = jobs.find(j => j.id === i.application_id);
            return `
            <div class="p-2 border-b border-outline-variant/10 text-sm">
                <div class="flex justify-between text-xs text-on-surface-variant mb-1">
                    <span>${i.channel} (${i.direction}) ${app ? `• for ${app.company}` : ''}</span>
                    <span>${new Date(i.date).toLocaleDateString()}</span>
                </div>
                <p class="text-on-surface">${i.summary}</p>
                ${i.follow_up_needed ? `<p class="text-xs text-error mt-1">Follow-up: ${i.follow_up_date ? new Date(i.follow_up_date).toLocaleDateString() : 'Yes'}</p>` : ''}
            </div>
        `}).join('') || '<p class="text-sm text-on-surface-variant">No interactions logged.</p>';
    }

    // Forms
    document.getElementById('appAddInteractionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const appId = document.getElementById('app-detail-id').value;
        const channel = document.getElementById('app-int-channel').value;
        const direction = document.getElementById('app-int-dir').value;
        const summary = document.getElementById('app-int-summary').value;
        
        // Find the first linked contact to associate this with (simplification for app-level quick add)
        const link = contact_applications.find(ca => ca.application_id === appId);
        if(!link) {
            alert("Please link a contact to this application first before logging activity.");
            return;
        }
        
        const payload = {
            contact_id: link.contact_id,
            application_id: appId,
            channel, direction, summary, date: new Date().toISOString().split('T')[0]
        };
        
        const { data, error } = await supabase.from('interactions').insert([payload]).select('*');
        if(!error && data) {
            interactions.push(data[0]);
            document.getElementById('appAddInteractionForm').reset();
            renderAppInteractions(appId);
            
            // update contact last_contacted
            await supabase.from('contacts').update({ last_contacted: payload.date }).eq('id', payload.contact_id);
            const c = contacts.find(c => c.id === payload.contact_id);
            if(c) c.last_contacted = payload.date;
            renderAll();
        }
    });

    document.getElementById('contactAddInteractionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contactId = document.getElementById('contact-detail-id').value;
        const channel = document.getElementById('contact-int-channel').value;
        const direction = document.getElementById('contact-int-dir').value;
        const summary = document.getElementById('contact-int-summary').value;
        const followUpNeeded = document.getElementById('contact-int-fu').checked;
        const followUpDate = document.getElementById('contact-int-fudate').value || null;
        
        // Find first linked app to optionally associate
        const link = contact_applications.find(ca => ca.contact_id === contactId);
        const appId = link ? link.application_id : null;
        
        const payload = {
            contact_id: contactId,
            application_id: appId,
            channel, direction, summary, 
            follow_up_needed: followUpNeeded,
            follow_up_date: followUpDate,
            date: new Date().toISOString().split('T')[0]
        };
        
        const { data, error } = await supabase.from('interactions').insert([payload]).select('*');
        if(!error && data) {
            interactions.push(data[0]);
            document.getElementById('contactAddInteractionForm').reset();
            renderContactInteractions(contactId);
            
            // update contact last_contacted
            await supabase.from('contacts').update({ last_contacted: payload.date }).eq('id', contactId);
            const c = contacts.find(c => c.id === contactId);
            if(c) c.last_contacted = payload.date;
            renderAll();
        }
    });


    // --- Quick Add Modal ---
    const quickAddBtn = document.getElementById('quickAddBtn');
    const quickAddModal = document.getElementById('quickAddJobModal');
    const quickAddForm = document.getElementById('quickAddJobForm');

    if (quickAddBtn && quickAddModal) {
        quickAddBtn.addEventListener('click', () => {
            showModal('quickAddJobModal');
        });
    }

    if (quickAddForm) {
        quickAddForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const company = document.getElementById('qa-company').value;
            const role_title = document.getElementById('qa-role').value;
            const status = document.getElementById('qa-status').value;
            const priority_tier = document.getElementById('qa-priority').value;

            const newJob = {
                company,
                role_title,
                status,
                priority_tier,
                date_applied: (status !== 'Target' && status !== 'Rejected') ? new Date().toISOString().split('T')[0] : null
            };

            const submitBtn = quickAddForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            const { data, error } = await supabase.from('job_applications').insert([newJob]).select('*');
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save';

            if (!error && data) {
                // Success
                jobs.push(data[0]);
                quickAddForm.reset();
                quickAddModal.classList.add('hidden');
                quickAddModal.classList.remove('flex');
                document.getElementById('modalBackdrop')?.classList.add('hidden');
                document.getElementById('adminModals')?.classList.add('hidden');
                
                renderAll();
            } else {
                console.error("Failed to add job:", error);
                alert("Failed to add job. Check console.");
            }
        });
    }

    // --- Initial Load ---
    loadData();
});
