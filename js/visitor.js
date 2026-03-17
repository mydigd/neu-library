import { supabase } from './supabase.js'

const form = document.getElementById('visitor-form')
const formError = document.getElementById('form-error')
const formSuccess = document.getElementById('form-success')
const submitBtn = document.getElementById('submit-btn')

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const name = document.getElementById('visitor-name').value.trim()
  const email = document.getElementById('visitor-email').value.trim()
  const college = document.getElementById('visitor-college').value
  const purpose = document.getElementById('visitor-purpose').value
  const isEmployee = document.querySelector('input[name="is_employee"]:checked').value === 'true'

  formError.classList.add('hidden')
  formSuccess.classList.add('hidden')

  // Validate institutional email
  if (!email.endsWith('.edu.ph')) {
    formError.textContent = 'Please enter a valid institutional email address (@edu.ph).'
    formError.classList.remove('hidden')
    return
  }

  submitBtn.disabled = true
  submitBtn.querySelector('span').textContent = 'Logging visit...'

  const { error } = await supabase.from('visits').insert([{
    name,
    email,
    college,
    reason: purpose,
    is_employee: isEmployee
  }])

  if (error) {
    formError.textContent = 'Something went wrong. Please try again.'
    formError.classList.remove('hidden')
    submitBtn.disabled = false
    submitBtn.querySelector('span').textContent = 'Log My Visit'
    return
  }

  formSuccess.textContent = `✓ Visit logged! Welcome to NEU Library, ${name}!`
  formSuccess.classList.remove('hidden')
  form.reset()
  submitBtn.disabled = false
  submitBtn.querySelector('span').textContent = 'Log My Visit'
  formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' })
})