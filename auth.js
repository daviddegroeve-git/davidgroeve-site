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
      authError.style.display = 'none';
      emailInput.value = '';
      passwordInput.value = '';
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      authError.style.display = 'none';
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
          window.location.href = 'dashboard.html';
        } else {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;
          authError.style.display = 'block';
          authError.style.color = 'green';
          authError.textContent = 'Account created successfully! You can now log in.';
          // Automatically log them in if email confirmation is off, else ask to verify.
          if (data.session) {
             window.location.href = 'dashboard.html';
          }
        }
      } catch (error) {
        authError.style.display = 'block';
        authError.style.color = '#e53e3e';
        authError.textContent = error.message;
      } finally {
        authSubmitBtn.disabled = false;
      }
    });
  }
});
