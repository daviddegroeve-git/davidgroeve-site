const SUPABASE_URL = 'https://gbagcctlymqfefyjhqzu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_T7GC3hfaUA0DAul1E6o2Ww_aUYc15_6';

document.addEventListener('DOMContentLoaded', () => {
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const authForm = document.getElementById('authForm');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authTitle = document.getElementById('authTitle');
  const authSwitchLink = document.getElementById('authSwitchLink');
  const authSwitchText = document.getElementById('authSwitchText');
  const authError = document.getElementById('authError');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  let isLogin = true;

  if (authSwitchLink) {
    authSwitchLink.addEventListener('click', () => {
      isLogin = !isLogin;
      authTitle.textContent = isLogin ? 'Sign In' : 'Create Account';
      authSubmitBtn.textContent = isLogin ? 'Sign In' : 'Sign Up';
      authSwitchText.textContent = isLogin ? "Don't have an account? " : 'Already have an account? ';
      authSwitchLink.textContent = isLogin ? 'Sign Up' : 'Sign In';
      if (authError) authError.style.display = 'none';
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (authError) authError.style.display = 'none';
      authSubmitBtn.disabled = true;

      const email = emailInput.value;
      const password = passwordInput.value;

      try {
        if (isLogin) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;

          const user = data.user;
          const isAdmin = user?.user_metadata?.role === 'admin' || 
                          user?.email?.toLowerCase().includes('admin') || 
                          user?.email?.toLowerCase().includes('director@davidgroeve.com') ||
                          user?.email?.toLowerCase().includes('davidgroeve.com');

          if (isAdmin) {
            window.location.href = 'admin-panel.html';
          } else {
            const portalSelect = document.getElementById('portalSelect');
            const activeChip = document.querySelector('.role-chip.active');
            const targetPortal = portalSelect?.value || activeChip?.getAttribute('data-portal') || 'customer-portal.html';
            window.location.href = targetPortal;
          }
        } else {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;
          if (authError) {
            authError.style.display = 'block';
            authError.style.color = 'green';
            authError.innerHTML = 'Account created successfully!<br>You can now log in.';
          }
          if (data.session) {
             const user = data.user;
             const isAdmin = user?.user_metadata?.role === 'admin' || 
                             user?.email?.toLowerCase().includes('admin') || 
                             user?.email?.toLowerCase().includes('director@davidgroeve.com');

             if (isAdmin) {
               window.location.href = 'admin-panel.html';
             } else {
               const portalSelect = document.getElementById('portalSelect');
               const activeChip = document.querySelector('.role-chip.active');
               const targetPortal = portalSelect?.value || activeChip?.getAttribute('data-portal') || 'customer-portal.html';
               window.location.href = targetPortal;
             }
          }
        }
      } catch (error) {
        if (authError) {
          authError.style.display = 'block';
          authError.style.color = '#e53e3e';
          authError.textContent = error.message;
        }
      } finally {
        authSubmitBtn.disabled = false;
      }
    });
  }

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
