import { supabase } from './supabase.js'

// Auth guard
const { data: { session } } = await supabase.auth.getSession()
if (!session) window.location.href = 'admin-login.html'

const { data: roleData } = await supabase
  .from('roles').select('role').eq('email', session.user.email).single()
if (!roleData || roleData.role !== 'admin') window.location.href = 'admin-login.html'

document.getElementById('admin-email').textContent = session.user.email
document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-PH', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut()
  window.location.href = 'admin-login.html'
})

// Sidebar nav
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault()
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'))
    item.classList.add('active')
    document.getElementById(`section-${item.dataset.section}`).classList.add('active')
    if (item.dataset.section === 'visitors') loadAllVisitors()
  })
})

// State
let currentRange = 'today', customFrom = null, customTo = null
let filterPurpose = '', filterCollege = '', filterEmployee = ''

function getDateRange(range) {
  const now = new Date()
  let from, to
  if (range === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  } else if (range === 'week') {
    from = new Date(now); from.setDate(now.getDate() - now.getDay()); from.setHours(0,0,0,0)
    to = new Date(from); to.setDate(from.getDate() + 6); to.setHours(23,59,59,999)
  } else if (range === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  } else if (range === 'custom' && customFrom && customTo) {
    from = new Date(customFrom + 'T00:00:00')
    to = new Date(customTo + 'T23:59:59')
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  }
  return { from: from.toISOString(), to: to.toISOString() }
}

// Time tabs
document.querySelectorAll('.time-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    currentRange = tab.dataset.range
    document.getElementById('custom-range').classList.toggle('hidden', currentRange !== 'custom')
    if (currentRange !== 'custom') loadDashboard()
  })
})

document.getElementById('apply-range').addEventListener('click', () => {
  customFrom = document.getElementById('date-from').value
  customTo = document.getElementById('date-to').value
  if (!customFrom || !customTo) { alert('Please select both dates.'); return }
  loadDashboard()
})

document.getElementById('apply-filters').addEventListener('click', () => {
  filterPurpose = document.getElementById('filter-purpose').value
  filterCollege = document.getElementById('filter-college').value
  filterEmployee = document.getElementById('filter-employee').value
  loadDashboard()
})

async function loadDashboard() {
  const { from, to } = getDateRange(currentRange)

  let query = supabase.from('visits').select(`*, visitors(full_name, student_number)`)
    .gte('visited_at', from).lte('visited_at', to)

  if (filterPurpose) query = query.eq('reason', filterPurpose)
  if (filterCollege) query = query.eq('college', filterCollege)
  if (filterEmployee !== '') query = query.eq('is_employee', filterEmployee === 'true')

  const { data, error } = await query
  if (error) { console.error(error); return }

  document.getElementById('stat-total').textContent = data.length
  document.getElementById('stat-students').textContent = data.filter(v => !v.is_employee).length
  document.getElementById('stat-employees').textContent = data.filter(v => v.is_employee).length

  const purposeCount = {}
  data.forEach(v => { purposeCount[v.reason] = (purposeCount[v.reason] || 0) + 1 })
  const top = Object.entries(purposeCount).sort((a,b) => b[1]-a[1])[0]
  document.getElementById('stat-top-purpose').textContent = top ? `${top[0]} (${top[1]})` : '—'

  const collegeCount = {}
  data.forEach(v => { collegeCount[v.college] = (collegeCount[v.college] || 0) + 1 })
  const grid = document.getElementById('college-grid')
  if (!Object.keys(collegeCount).length) {
    grid.innerHTML = '<p style="color:var(--gray-400);font-size:0.9rem;padding:20px 0">No data for this period.</p>'
  } else {
    grid.innerHTML = Object.entries(collegeCount).sort((a,b) => b[1]-a[1]).map(([c,n]) => `
      <div class="college-card">
        <div class="college-name">${c}</div>
        <div class="college-count">${n}</div>
        <div class="college-label">visitor${n !== 1 ? 's' : ''}</div>
      </div>`).join('')
  }
}

async function loadAllVisitors(search = '') {
  let query = supabase.from('visits')
    .select(`*, visitors(full_name, student_number)`)
    .order('visited_at', { ascending: false })

  const { data, error } = await query
  if (error) { console.error(error); return }

  let filtered = data
  if (search) {
    const term = search.toLowerCase()
    filtered = data.filter(v =>
      v.visitors?.full_name?.toLowerCase().includes(term) ||
      v.email?.toLowerCase().includes(term) ||
      v.student_number?.toLowerCase().includes(term) ||
      v.college?.toLowerCase().includes(term)
    )
  }

  const tbody = document.getElementById('visitors-tbody')
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No visitors found.</td></tr>'
    return
  }

  tbody.innerHTML = filtered.map(v => `
    <tr>
      <td><strong>${v.visitors?.full_name || '—'}</strong><br><small style="color:var(--gray-400)">${v.email}</small></td>
      <td style="font-family:'Cormorant Garamond',serif;font-size:1rem;font-weight:600;color:var(--navy)">${v.student_number || '—'}</td>
      <td>${v.college || '—'}</td>
      <td>${v.reason || '—'}</td>
      <td><span class="badge ${v.is_employee ? 'badge-employee' : 'badge-student'}">${v.is_employee ? 'Employee' : 'Student'}</span></td>
      <td>${new Date(v.visited_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</td>
    </tr>`).join('')
}

document.getElementById('search-input').addEventListener('input', e => loadAllVisitors(e.target.value))

loadDashboard()