import { supabase } from './supabase.js'

const form = document.getElementById('login-form')
const errorMsg = document.getElementById('error-msg')
const loginBtn = document.getElementById('login-btn')

// If already logged in as admin, go straight to dashboard
const { data: { session } } = await supabase.auth.getSession()
if (session) {
  window.location.href = 'admin.html'
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value

  errorMsg.classList.add('hidden')
  loginBtn.disabled = true
  loginBtn.querySelector('span').textContent = 'Signing in...'

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    showError('Invalid email or password. Please try again.')
    loginBtn.disabled = false
    loginBtn.querySelector('span').textContent = 'Sign In'
    return
  }

  
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('role')
    .eq('email', data.user.email)
    .single()

  if (roleError || !roleData || roleData.role !== 'admin') {
    await supabase.auth.signOut()
    showError('Access denied. This account does not have admin privileges.')
    loginBtn.disabled = false
    loginBtn.querySelector('span').textContent = 'Sign In'
    return
  }

  window.location.href = 'admin.html'
})

function showError(msg) {
  errorMsg.textContent = msg
  errorMsg.classList.remove('hidden')
}