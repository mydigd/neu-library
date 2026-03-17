 // ── LIVE CLOCK ──
    function updateClock() {
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-PH', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      })
      const dateStr = now.toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      document.getElementById('clock-time').textContent = timeStr
      document.getElementById('clock-date').textContent = dateStr
      updateStatus(now)
    }
 
    // ── OPEN / CLOSED STATUS ──
    function updateStatus(now) {
      const day = now.getDay() // 0=Sun, 1=Mon ... 6=Sat
      const hour = now.getHours()
      const min = now.getMinutes()
      const time = hour + min / 60
 
      let isOpen = false
      if (day >= 1 && day <= 5) isOpen = time >= 7.5 && time < 19      // Mon–Fri
      else if (day === 6) isOpen = time >= 8 && time < 17               // Saturday
      // Sunday = always closed
 
      const badge = document.getElementById('status-badge')
      const text = document.getElementById('status-text')
      badge.className = 'status-dot ' + (isOpen ? 'open' : 'closed')
      text.textContent = isOpen ? 'Open Now' : 'Closed'
    }
 
    updateClock()
    setInterval(updateClock, 1000)