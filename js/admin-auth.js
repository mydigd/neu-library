import { supabase } from './supabase.js'

// If already logged in as admin, redirect
const { data: { session } } = await supabase.auth.getSession()
if (session) {
  const { data: roleData } = await supabase
    .from('roles').select('role').eq('email', session.user.email).single()
  if (roleData?.role === 'admin') window.location.href = 'admin.html'
}

document.getElementById('google-btn').addEventListener('click', async () => {
  const errorMsg = document.getElementById('error-msg')
  const loadingMsg = document.getElementById('loading-msg')

  errorMsg.classList.add('hidden')
  loadingMsg.classList.remove('hidden')

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/admin-callback.html'
    }
  })

  if (error) {
    loadingMsg.classList.add('hidden')
    errorMsg.textContent = 'Sign in failed. Please try again.'
    errorMsg.classList.remove('hidden')
  }
})