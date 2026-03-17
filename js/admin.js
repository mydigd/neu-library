import { supabase } from './supabase.js'

// Auth guard — must be logged in as admin
const { data: { session } } = await supabase.auth.getSession()
if (!session) window.location.href = 'admin-login.html'

const user = session.user

const { data: roleData, error: roleError } = await supabase
  .from('roles').select('role').eq('email', user.email).single()

if (roleError || !roleData || roleData.role !== 'admin') {
  window.location.href = 'admin-login.html'
}

document.getElementById('admin-email').textContent = user.email

document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut()
  window.location.href = 'admin-login.html'
})

// Today's date
document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-PH', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})

// ============================================
// SIDEBAR NAV
// ============================================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault()
    const section = item.dataset.section
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'))
    item.classList.add('active')
    document.getElementById(`section-${section}`).classList.add('active')
    if (section === 'visitors') loadAllVisitors()
  })
})

// ============================================
// DATE RANGE HELPERS
// ============================================
let currentRange = 'today'
let customFrom = null
let customTo = null
let filterPurpose = ''
let filterCollege = ''
let filterEmployee = ''

function getDateRange(range) {
  const now = new Date()
  let from, to

  if (range === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  } else if (range === 'week') {
    const day = now.getDay()
    from = new Date(now)
    from.setDate(now.getDate() - day)
    from.setHours(0, 0, 0, 0)
    to = new Date(from)
    to.setDate(from.getDate() + 6)
    to.setHours(23, 59, 59, 999)
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

// ============================================
// TIME TABS
// ============================================
document.querySelectorAll('.time-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    currentRange = tab.dataset.range
    if (currentRange === 'custom') {
      document.getElementById('custom-range').classList.remove('hidden')
    } else {
      document.getElementById('custom-range').classList.add('hidden')
      loadDashboard()
    }
  })
})

document.getElementById('apply-range').addEventListener('click', () => {
  customFrom = document.getElementById('date-from').value
  customTo = document.getElementById('date-to').value
  if (!customFrom || !customTo) { alert('Please select both dates.'); return }
  loadDashboard()
})

// ============================================
// FILTERS
// ============================================
document.getElementById('apply-filters').addEventListener('click', () => {
  filterPurpose = document.getElementById('filter-purpose').value
  filterCollege = document.getElementById('filter-college').value
  filterEmployee = document.getElementById('filter-employee').value
  loadDashboard()
})

// ============================================
// LOAD DASHBOARD
// ============================================
async function loadDashboard() {
  const { from, to } = getDateRange(currentRange)

  let query = supabase
    .from('visits').select('*')
    .gte('visited_at', from)
    .lte('visited_at', to)

  if (filterPurpose) query = query.eq('reason', filterPurpose)
  if (filterCollege) query = query.eq('college', filterCollege)
  if (filterEmployee !== '') query = query.eq('is_employee', filterEmployee === 'true')

  const { data, error } = await query
  if (error) { console.error(error); return }

  const total = data.length
  const students = data.filter(v => !v.is_employee).length
  const employees = data.filter(v => v.is_employee).length

  const purposeCount = {}
  data.forEach(v => { purposeCount[v.reason] = (purposeCount[v.reason] || 0) + 1 })
  const topPurpose = Object.entries(purposeCount).sort((a, b) => b[1] - a[1])[0]

  document.getElementById('stat-total').textContent = total
  document.getElementById('stat-students').textContent = students
  document.getElementById('stat-employees').textContent = employees
  document.getElementById('stat-top-purpose').textContent = topPurpose ? `${topPurpose[0]} (${topPurpose[1]})` : '—'

  const collegeCount = {}
  data.forEach(v => { collegeCount[v.college] = (collegeCount[v.college] || 0) + 1 })

  const collegeGrid = document.getElementById('college-grid')
  if (Object.keys(collegeCount).length === 0) {
    collegeGrid.innerHTML = '<p style="color:var(--gray-400);font-size:0.9rem;padding:20px 0">No visitor data for this period.</p>'
  } else {
    collegeGrid.innerHTML = Object.entries(collegeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([college, count]) => `
        <div class="college-card">
          <div class="college-name">${college}</div>
          <div class="college-count">${count}</div>
          <div class="college-label">visitor${count !== 1 ? 's' : ''}</div>
        </div>
      `).join('')
  }
}

// ============================================
// LOAD VISITORS TABLE
// ============================================
async function loadAllVisitors(searchTerm = '') {
  const { data, error } = await supabase
    .from('visits').select('*')
    .order('visited_at', { ascending: false })

  if (error) { console.error(error); return }

  let filtered = data
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filtered = data.filter(v =>
      v.name?.toLowerCase().includes(term) ||
      v.email?.toLowerCase().includes(term) ||
      v.college?.toLowerCase().includes(term)
    )
  }

  const tbody = document.getElementById('visitors-tbody')
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No visitors found.</td></tr>'
    return
  }

  tbody.innerHTML = filtered.map(v => `
    <tr>
      <td><strong>${v.name || '—'}</strong></td>
      <td>${v.email || '—'}</td>
      <td>${v.college || '—'}</td>
      <td>${v.reason || '—'}</td>
      <td>
        <span class="badge ${v.is_employee ? 'badge-employee' : 'badge-student'}">
          ${v.is_employee ? 'Employee' : 'Student'}
        </span>
      </td>
      <td>${new Date(v.visited_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</td>
    </tr>
  `).join('')
}

document.getElementById('search-input').addEventListener('input', (e) => {
  loadAllVisitors(e.target.value)
})



loadDashboard()