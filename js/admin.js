import { supabase } from './supabase.js'

// ── AUTH GUARD ──
const { data: { session } } = await supabase.auth.getSession()
if (!session) window.location.href = 'admin-login.html'

const { data: roleData } = await supabase
  .from('roles').select('role').eq('email', session.user.email).single()
if (!roleData || roleData.role !== 'admin') window.location.href = 'admin-login.html'

const currentAdminEmail = session.user.email
document.getElementById('admin-email').textContent = currentAdminEmail
document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-PH', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})

// ── LOGOUT ──
document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut()
  window.location.href = 'admin-login.html'
})

// ── SIDEBAR NAV ──
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault()
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'))
    item.classList.add('active')
    const section = item.dataset.section
    document.getElementById(`section-${section}`).classList.add('active')
    if (section === 'visit-logs') loadVisitLogs()
    if (section === 'visitors') loadVisitors()
    if (section === 'admins') loadAdmins()
  })
})

// ── MODAL HELPERS ──
window.closeModal = (id) => document.getElementById(id).classList.add('hidden')
window.openModal = (id) => document.getElementById(id).classList.remove('hidden')

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden')
  })
})

// ============================================
// DASHBOARD
// ============================================
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
  let query = supabase.from('visits')
    .select('*, visitors(full_name, student_number)')
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
        <div class="college-label">visit${n !== 1 ? 's' : ''}</div>
      </div>`).join('')
  }
}

// ============================================
// VISIT LOGS
// ============================================
let allLogs = []

async function loadVisitLogs(search = '') {
  const { data, error } = await supabase
    .from('visits')
    .select('*, visitors(full_name)')
    .order('visited_at', { ascending: false })

  if (error) { console.error(error); return }
  allLogs = data
  renderLogs(search)
}

function renderLogs(search = '') {
  let filtered = allLogs
  if (search) {
    const term = search.toLowerCase()
    filtered = allLogs.filter(v =>
      v.visitors?.full_name?.toLowerCase().includes(term) ||
      v.email?.toLowerCase().includes(term) ||
      v.student_number?.toLowerCase().includes(term) ||
      v.college?.toLowerCase().includes(term)
    )
  }

  const tbody = document.getElementById('logs-tbody')
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No visit logs found.</td></tr>'
    return
  }

  tbody.innerHTML = filtered.map(v => `
    <tr>
      <td><strong>${v.visitors?.full_name || '—'}</strong><br><small style="color:var(--gray-400)">${v.email}</small></td>
      <td class="student-no-cell">${v.student_number || '—'}</td>
      <td>${v.college || '—'}</td>
      <td>${v.reason || '—'}</td>
      <td><span class="badge ${v.is_employee ? 'badge-employee' : 'badge-student'}">${v.is_employee ? 'Employee' : 'Student'}</span></td>
      <td>${new Date(v.visited_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</td>
      <td>
        <button class="btn-icon btn-icon-danger" onclick="deleteLog('${v.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </td>
    </tr>`).join('')
}

document.getElementById('logs-search').addEventListener('input', e => renderLogs(e.target.value))

window.deleteLog = (id) => {
  showConfirm(
    'Delete Visit Log',
    'Are you sure you want to delete this visit log? This action cannot be undone.',
    async () => {
      const { error } = await supabase.from('visits').delete().eq('id', id)
      if (error) { alert('Failed to delete. Please try again.'); return }
      closeModal('confirm-modal')
      loadVisitLogs()
    }
  )
}

// ============================================
// VISITORS
// ============================================
let allVisitors = []

async function loadVisitors(search = '') {
  const { data, error } = await supabase
    .from('visitors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.error(error); return }
  allVisitors = data
  renderVisitors(search)
}

function renderVisitors(search = '') {
  let filtered = allVisitors
  if (search) {
    const term = search.toLowerCase()
    filtered = allVisitors.filter(v =>
      v.full_name?.toLowerCase().includes(term) ||
      v.email?.toLowerCase().includes(term) ||
      v.student_number?.toLowerCase().includes(term) ||
      v.college?.toLowerCase().includes(term)
    )
  }

  const tbody = document.getElementById('visitors-tbody')
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No visitors found.</td></tr>'
    return
  }

  tbody.innerHTML = filtered.map(v => `
    <tr>
      <td><strong>${v.full_name || '—'}</strong></td>
      <td><small style="color:var(--gray-400)">${v.email}</small></td>
      <td class="student-no-cell">${v.student_number || '—'}</td>
      <td>${v.college || '—'}</td>
      <td><span class="badge ${v.is_employee ? 'badge-employee' : 'badge-student'}">${v.is_employee ? 'Employee' : 'Student'}</span></td>
      <td>${new Date(v.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</td>
      <td class="action-cell">
        <button class="btn-icon btn-icon-edit" onclick='openEditVisitor(${JSON.stringify(v)})'>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon btn-icon-danger" onclick="deleteVisitor('${v.id}', '${v.full_name}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </td>
    </tr>`).join('')
}

document.getElementById('visitors-search').addEventListener('input', e => renderVisitors(e.target.value))

// Add Visitor
document.getElementById('add-visitor-btn').addEventListener('click', () => openModal('add-visitor-modal'))

document.getElementById('add-visitor-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = document.getElementById('add-name').value.trim()
  const email = document.getElementById('add-email').value.trim()
  const college = document.getElementById('add-college').value
  const is_employee = document.getElementById('add-employee').value === 'true'
  const errEl = document.getElementById('add-visitor-error')
  errEl.classList.add('hidden')

  const year = new Date().getFullYear()
  const student_number = `NEU-${year}-${Math.floor(10000 + Math.random() * 90000)}`

  const { error } = await supabase.from('visitors').insert([{ email, full_name: name, student_number, college, is_employee }])
  if (error) {
    errEl.textContent = error.message || 'Failed to add visitor.'
    errEl.classList.remove('hidden')
    return
  }

  closeModal('add-visitor-modal')
  document.getElementById('add-visitor-form').reset()
  loadVisitors()
})

// Edit Visitor
window.openEditVisitor = (visitor) => {
  document.getElementById('edit-visitor-id').value = visitor.id
  document.getElementById('edit-name').value = visitor.full_name || ''
  document.getElementById('edit-college').value = visitor.college || ''
  document.getElementById('edit-employee').value = String(visitor.is_employee)
  openModal('edit-visitor-modal')
}

document.getElementById('edit-visitor-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const id = document.getElementById('edit-visitor-id').value
  const full_name = document.getElementById('edit-name').value.trim()
  const college = document.getElementById('edit-college').value
  const is_employee = document.getElementById('edit-employee').value === 'true'
  const errEl = document.getElementById('edit-visitor-error')
  errEl.classList.add('hidden')

  const { error } = await supabase.from('visitors').update({ full_name, college, is_employee }).eq('id', id)
  if (error) {
    errEl.textContent = 'Failed to update visitor.'
    errEl.classList.remove('hidden')
    return
  }

  closeModal('edit-visitor-modal')
  loadVisitors()
})

// Delete Visitor
window.deleteVisitor = (id, name) => {
  showConfirm(
    'Delete Visitor',
    `Are you sure you want to delete "${name}"? This will also delete all their visit logs. This cannot be undone.`,
    async () => {
      await supabase.from('visits').delete().eq('visitor_id', id)
      const { error } = await supabase.from('visitors').delete().eq('id', id)
      if (error) { alert('Failed to delete visitor.'); return }
      closeModal('confirm-modal')
      loadVisitors()
    }
  )
}

// ============================================
// ADMINS
// ============================================
async function loadAdmins() {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('role', 'admin')
    .order('created_at', { ascending: true })

  if (error) { console.error(error); return }

  const tbody = document.getElementById('admins-tbody')
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No admins found.</td></tr>'
    return
  }

  tbody.innerHTML = data.map(a => `
    <tr>
      <td><strong>${a.email}</strong> ${a.email === currentAdminEmail ? '<span class="badge badge-student" style="margin-left:8px">You</span>' : ''}</td>
      <td><span class="badge badge-employee">Admin</span></td>
      <td>${new Date(a.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</td>
      <td>
        ${a.email !== currentAdminEmail ? `
        <button class="btn-icon btn-icon-danger" onclick="deleteAdmin('${a.id}', '${a.email}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>` : '<span style="color:var(--gray-400);font-size:0.8rem">Protected</span>'}
      </td>
    </tr>`).join('')
}

// Add Admin
document.getElementById('add-admin-btn').addEventListener('click', () => openModal('add-admin-modal'))

document.getElementById('add-admin-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('add-admin-email').value.trim()
  const errEl = document.getElementById('add-admin-error')
  errEl.classList.add('hidden')

  const { error } = await supabase.from('roles').insert([{ email, role: 'admin' }])
  if (error) {
    errEl.textContent = error.code === '23505' ? 'This email is already an admin.' : 'Failed to add admin.'
    errEl.classList.remove('hidden')
    return
  }

  closeModal('add-admin-modal')
  document.getElementById('add-admin-form').reset()
  loadAdmins()
})

// Delete Admin
window.deleteAdmin = (id, email) => {
  showConfirm(
    'Remove Admin',
    `Are you sure you want to remove admin access for "${email}"? They will no longer be able to access this dashboard.`,
    async () => {
      const { error } = await supabase.from('roles').delete().eq('id', id)
      if (error) { alert('Failed to remove admin.'); return }
      closeModal('confirm-modal')
      loadAdmins()
    }
  )
}

// ============================================
// CONFIRM MODAL
// ============================================
function showConfirm(title, message, onConfirm) {
  document.getElementById('confirm-title').textContent = title
  document.getElementById('confirm-message').textContent = message
  const btn = document.getElementById('confirm-action-btn')
  btn.onclick = onConfirm
  openModal('confirm-modal')
}

// Initial load
loadDashboard()