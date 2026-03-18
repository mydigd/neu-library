import { supabase } from './supabase.js'

// Auth guard
const { data: { session } } = await supabase.auth.getSession()
if (!session) window.location.href = 'index.html'

const user = session.user
const email = user.email

// Validate NEU email
if (!email.endsWith('@neu.edu.ph')) {
  await supabase.auth.signOut()
  window.location.href = 'index.html'
}

// Get name directly from Google account
const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0]

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut()
  window.location.href = 'index.html'
})

// Set avatar initials from Google name
function setAvatar(name) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  document.getElementById('user-avatar').textContent = initials
}

// Generate student number: NEU-YYYY-XXXXX
function generateStudentNumber() {
  const year = new Date().getFullYear()
  const random = Math.floor(10000 + Math.random() * 90000)
  return `NEU-${year}-${random}`
}

// ── LOAD VISITOR PROFILE ──
async function loadProfile() {
  const { data: visitor, error } = await supabase
    .from('visitors')
    .select('*')
    .eq('email', email)
    .single()

  setAvatar(fullName)
  document.getElementById('user-name').textContent = fullName

  if (error || !visitor) {
    // First time — show setup card
    const studentNo = generateStudentNumber()
    document.getElementById('sn-display').textContent = studentNo
    document.getElementById('student-number-preview').classList.remove('hidden')
    document.getElementById('user-student-no').textContent = 'New Account'
    showSetupCard()
  } else {
    // Returning visitor — show visit card
    document.getElementById('user-student-no').textContent = visitor.student_number
    document.getElementById('welcome-sub').textContent =
      `Welcome back, ${fullName.split(' ')[0]}! What brings you in today?`
    showVisitCard()
  }
}

function showSetupCard() {
  document.getElementById('setup-card').classList.remove('hidden')
  document.getElementById('visit-card').classList.add('hidden')
}

function showVisitCard() {
  document.getElementById('setup-card').classList.add('hidden')
  document.getElementById('visit-card').classList.remove('hidden')
}

// ── SETUP FORM — first time only (college + employee) ──
document.getElementById('setup-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const college = document.getElementById('setup-college').value
  const is_employee = document.querySelector('input[name="setup_employee"]:checked').value === 'true'
  const student_number = document.getElementById('sn-display').textContent

  const setupError = document.getElementById('setup-error')
  setupError.classList.add('hidden')

  const btn = document.getElementById('setup-btn')
  btn.disabled = true
  btn.querySelector('span').textContent = 'Saving...'

  // Save visitor profile — name comes from Google
  const { error } = await supabase.from('visitors').insert([{
    email,
    full_name: fullName,
    student_number,
    college,
    is_employee
  }])

  if (error) {
    setupError.textContent = 'Failed to save profile. Please try again.'
    setupError.classList.remove('hidden')
    btn.disabled = false
    btn.querySelector('span').textContent = 'Save & Continue'
    return
  }

  document.getElementById('user-student-no').textContent = student_number
  document.getElementById('welcome-sub').textContent =
    `Welcome, ${fullName.split(' ')[0]}! What brings you in today?`
  showVisitCard()
})

// ── VISIT FORM — purpose only ──
document.getElementById('visit-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const purposeEl = document.querySelector('input[name="purpose"]:checked')
  const visitError = document.getElementById('visit-error')
  const visitSuccess = document.getElementById('visit-success')

  visitError.classList.add('hidden')
  visitSuccess.classList.add('hidden')

  if (!purposeEl) {
    visitError.textContent = 'Please select your purpose of visit.'
    visitError.classList.remove('hidden')
    return
  }

  const btn = document.getElementById('visit-btn')
  btn.disabled = true
  btn.querySelector('span').textContent = 'Logging visit...'

  // Get visitor profile for college + student number
  const { data: visitor } = await supabase
    .from('visitors').select('*').eq('email', email).single()

  const { error } = await supabase.from('visits').insert([{
    visitor_id: visitor.id,
    email,
    student_number: visitor.student_number,
    college: visitor.college,
    reason: purposeEl.value,
    is_employee: visitor.is_employee
  }])

  if (error) {
    visitError.textContent = 'Failed to log visit. Please try again.'
    visitError.classList.remove('hidden')
    btn.disabled = false
    btn.querySelector('span').textContent = 'Log My Visit'
    return
  }

  visitSuccess.textContent = `✓ Visit logged! Enjoy your time at NEU Library, ${fullName.split(' ')[0]}!`
  visitSuccess.classList.remove('hidden')

  // Reset purpose selection
  document.querySelectorAll('input[name="purpose"]').forEach(r => r.checked = false)
  document.querySelectorAll('.purpose-card').forEach(c => c.classList.remove('selected'))

  btn.disabled = false
  btn.querySelector('span').textContent = 'Log My Visit'
  visitSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

// Purpose card visual highlight
document.querySelectorAll('.purpose-card input').forEach(input => {
  input.addEventListener('change', () => {
    document.querySelectorAll('.purpose-card').forEach(c => c.classList.remove('selected'))
    input.closest('.purpose-card').classList.add('selected')
  })
})

loadProfile()