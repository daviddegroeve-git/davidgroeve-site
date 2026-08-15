const SUPABASE_URL = 'https://gbagcctlymqfefyjhqzu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_T7GC3hfaUA0DAul1E6o2Ww_aUYc15_6';

document.addEventListener('DOMContentLoaded', () => {
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const authError = document.getElementById('authError');

  // ── Sign-in form ──
  const signinForm      = document.getElementById('signinForm');
  const signinSubmitBtn = document.getElementById('signinSubmitBtn');

  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (authError) authError.style.display = 'none';
      if (signinSubmitBtn) signinSubmitBtn.disabled = true;

      const email    = document.getElementById('signinEmail').value;
      const password = document.getElementById('signinPassword').value;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const user    = data.user;
        const isAdmin = user?.user_metadata?.role === 'admin' ||
                        user?.email?.toLowerCase().includes('admin') ||
                        user?.email?.toLowerCase().includes('director@davidgroeve.com') ||
                        user?.email?.toLowerCase().includes('davidgroeve.com');

        if (isAdmin) {
          window.location.href = 'admin-panel.html';
        } else {
          // Route to the portal the user selected in the sign-in dropdown
          const portalSelect  = document.getElementById('portalSelect');
          const targetPortal  = portalSelect?.value || 'customer-portal.html';
          window.location.href = targetPortal;
        }
      } catch (err) {
        if (authError) {
          authError.style.display = 'block';
          authError.style.color   = '#ffb4ab';
          authError.textContent   = err.message;
        }
      } finally {
        if (signinSubmitBtn) signinSubmitBtn.disabled = false;
      }
    });
  }

  // ── Multi-step sign-up (dispatched by login.html inline script) ──
  document.addEventListener('doSignup', async (e) => {
    const { email, password, accountType, portal } = e.detail;
    const submitBtn = document.getElementById('signupSubmitBtn');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role:   accountType,   // e.g. 'student' | 'customer' | 'recruiter'
            portal: portal         // e.g. 'student-portal.html'
          }
        }
      });
      if (error) throw error;

      if (authError) {
        authError.style.display = 'block';
        authError.style.color   = '#86efac';
        authError.innerHTML     = 'Account created! Check your email to confirm, then sign in.';
      }

      // If Supabase auto-confirms (e.g. email confirmation disabled), redirect immediately
      if (data.session) {
        const user    = data.user;
        const isAdmin = user?.user_metadata?.role === 'admin' ||
                        user?.email?.toLowerCase().includes('admin') ||
                        user?.email?.toLowerCase().includes('director@davidgroeve.com');
        setTimeout(() => {
          window.location.href = isAdmin ? 'admin-panel.html' : (portal || 'customer-portal.html');
        }, 1500);
      }
    } catch (err) {
      if (authError) {
        authError.style.display = 'block';
        authError.style.color   = '#ffb4ab';
        authError.textContent   = err.message;
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account <span class="material-symbols-outlined text-base">check</span>';
      }
    }
  });

  // Forgot Password Form Handling
  const forgotForm = document.getElementById('forgotForm');
  const forgotSubmitBtn = document.getElementById('forgotSubmitBtn');
  const authMessage = document.getElementById('authMessage');

  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (authMessage) authMessage.style.display = 'none';
      if (forgotSubmitBtn) forgotSubmitBtn.disabled = true;

      const email = document.getElementById('email').value;
      const redirectTo = new URL('reset-password.html', window.location.href).href;

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo,
        });
        if (error) throw error;

        if (authMessage) {
          authMessage.style.display = 'block';
          authMessage.style.color = '#818cf8';
          authMessage.innerHTML = 'Password reset link sent successfully!<br>Please check your email inbox.';
        }
      } catch (error) {
        if (authMessage) {
          authMessage.style.display = 'block';
          authMessage.style.color = '#ffb4ab';
          authMessage.textContent = error.message;
        }
      } finally {
        if (forgotSubmitBtn) forgotSubmitBtn.disabled = false;
      }
    });
  }

  // Reset Password Form Handling
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const resetSubmitBtn = document.getElementById('resetSubmitBtn');

  if (resetPasswordForm) {
    // Listen for recovery state or link token parameters
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery token validated.');
      }
    });

    resetPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (authMessage) authMessage.style.display = 'none';

      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (newPassword !== confirmPassword) {
        if (authMessage) {
          authMessage.style.display = 'block';
          authMessage.style.color = '#ffb4ab';
          authMessage.textContent = 'Passwords do not match. Please verify and try again.';
        }
        return;
      }

      if (resetSubmitBtn) resetSubmitBtn.disabled = true;

      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        if (authMessage) {
          authMessage.style.display = 'block';
          authMessage.style.color = '#818cf8';
          authMessage.innerHTML = 'Password updated successfully!<br>Redirecting to login...';
        }

        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
      } catch (error) {
        if (authMessage) {
          authMessage.style.display = 'block';
          authMessage.style.color = '#ffb4ab';
          authMessage.textContent = error.message;
        }
      } finally {
        if (resetSubmitBtn) resetSubmitBtn.disabled = false;
      }
    });
  }
});
