'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

const SOUNDS = {
  start: '/sounds/tos_bridge_1_activate-Start-Pomodoro.mp3',
  complete: '/sounds/alarm03_End-Pomodoro.mp3',
  pause: '/sounds/forcefield_disable_Negative-Pause-Focus.mp3',
  breakStart: '/sounds/alert19-StartShortBreak.mp3',
  breakOver: '/sounds/tos_shipannouncement-BreakOver.mp3',
  skipBreak: '/sounds/securityauthorisationaccepted_clean-SkipBreak.mp3',
  longBreak: '/sounds/priorityclearancealphaone_ep-TakeLongBreak.mp3',
  spock: '/sounds/voice_spock_mostillogical-SkipFocus.mp3',
}

function getStardate() {
  const now = new Date()
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT']
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}.${days[now.getDay()]}.${months[now.getMonth()]}.${day}`
}

export default function Home() {
  const [isRunning, setIsRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [currentPreset, setCurrentPreset] = useState(25)
  const [sessions, setSessions] = useState([])
  const [sessionCount, setSessionCount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [stardate, setStardate] = useState('')
  const [currentObjective, setCurrentObjective] = useState('')
  const [cycleType, setCycleType] = useState('FOCUS') // 'FOCUS' or 'BREAK'
  const [showChoiceMenu, setShowChoiceMenu] = useState(false)
  const audioRef = useRef(null)
  const soundEnabledRef = useRef(true)

  // Keep ref in sync with state so timer callback can read it
  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  const playSound = useCallback((soundKey) => {
    if (!soundEnabledRef.current) return
    try {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      audioRef.current = new Audio(SOUNDS[soundKey])
      audioRef.current.volume = 0.7
      audioRef.current.play().catch(() => {})
    } catch (e) {}
  }, [])

  const showNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'lcars-timer',
          requireInteraction: true
        })
      } catch (e) {
        console.log('Notification failed:', e)
      }
    }
  }

  // Load saved sessions and objective from localStorage + request notification permission
  useEffect(() => {
    const saved = localStorage.getItem('lcars-sessions')
    if (saved) {
      const parsed = JSON.parse(saved)
      setSessions(parsed)
      setSessionCount(parsed.filter(s =>
        new Date(s.completedAt).toDateString() === new Date().toDateString()
      ).length)
    }
    const savedObjective = localStorage.getItem('lcars-objective')
    if (savedObjective) {
      setCurrentObjective(savedObjective)
    }
    setStardate(getStardate())
    const sdInterval = setInterval(() => setStardate(getStardate()), 60000)
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    
    return () => clearInterval(sdInterval)
  }, [])

  // Timer countdown
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false)
          completeSession()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  // Browser tab title shows countdown
  useEffect(() => {
    const mins = Math.floor(secondsLeft / 60)
    const secs = secondsLeft % 60
    const time = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    if (isRunning) {
      document.title = `${time} ${cycleType === 'FOCUS' ? '🔶' : '🔵'} ${cycleType} — LCARS Temporal Monitor`
    } else if (secondsLeft === 0) {
      document.title = `✅ ${cycleType} Complete — LCARS Temporal Monitor`
    } else {
      document.title = 'LCARS Temporal Monitor'
    }
  }, [secondsLeft, isRunning, cycleType])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        handleStartPauseRef.current()
      }
      if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        handleResetRef.current()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const completeSession = () => {
    if (cycleType === 'FOCUS') {
      // Focus cycle completed - save session and show choice menu
      playSound('complete')
      const newSession = {
        id: Date.now(),
        duration: currentPreset,
        objective: currentObjective,
        completedAt: new Date().toISOString(),
      }
      const updated = [...sessions, newSession]
      setSessions(updated)
      setSessionCount(prev => prev + 1)
      localStorage.setItem('lcars-sessions', JSON.stringify(updated))
      
      // Show notification
      const notificationBody = currentObjective 
        ? `"${currentObjective}" - ${currentPreset} minute focus cycle complete!`
        : `${currentPreset} minute focus cycle complete!`
      showNotification('Focus Cycle Complete!', notificationBody)
      
      // Show choice menu instead of auto-switching
      setShowChoiceMenu(true)
      
    } else {
      // Break completed - start new focus cycle
      playSound('breakOver')
      showNotification('Break Complete!', 'Time to get back to work! Starting new focus cycle.')
      setCycleType('FOCUS')
      setSecondsLeft(currentPreset * 60)
      setTimeout(() => {
        playSound('start')
        setIsRunning(true)
      }, 1000)
    }
  }

  const handleBreakChoice = () => {
    setShowChoiceMenu(false)
    setCycleType('BREAK')
    setSecondsLeft(5 * 60)
  }

  const handleContinueFocus = () => {
    setShowChoiceMenu(false)
    setCycleType('FOCUS')
    setSecondsLeft(currentPreset * 60)
  }

  const handleStartPause = () => {
    if (isRunning) {
      playSound('pause')
      setIsRunning(false)
    } else {
      playSound('start')
      setIsRunning(true)
    }
  }

  const handleReset = () => {
    playSound('skipBreak')
    setIsRunning(false)
    setCycleType('FOCUS')
    setSecondsLeft(currentPreset * 60)
  }

  const handleStartPauseRef = useRef(handleStartPause)
  const handleResetRef = useRef(handleReset)
  useEffect(() => {
    handleStartPauseRef.current = handleStartPause
    handleResetRef.current = handleReset
  })

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const formatSessionTime = (isoString) => {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const selectPreset = (mins) => {
    setIsRunning(false)
    setSecondsLeft(mins * 60)
    setCurrentPreset(mins)
  }

  const handleObjectiveChange = (e) => {
    const value = e.target.value
    setCurrentObjective(value)
    localStorage.setItem('lcars-objective', value)
  }

  const exportToCSV = () => {
    if (sessions.length === 0) return

    const csvHeaders = ['Date', 'Time', 'Duration (min)', 'Objective']
    const csvRows = sessions.map(session => {
      const date = new Date(session.completedAt)
      const dateStr = date.toLocaleDateString()
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const objective = session.objective || ''
      return [dateStr, timeStr, session.duration, `"${objective}"`]
    })

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `lcars-mission-log-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    playSound('skipBreak')
  }

  const todaySessions = sessions.filter(s =>
    new Date(s.completedAt).toDateString() === new Date().toDateString()
  )

  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0)

  // Calculate efficiency percentage
  const calculateEfficiency = () => {
    if (todaySessions.length === 0) return 0
    
    const now = new Date()
    const firstSessionToday = todaySessions.reduce((earliest, session) => {
      const sessionDate = new Date(session.completedAt)
      return sessionDate < earliest ? sessionDate : earliest
    }, new Date(todaySessions[0].completedAt))
    
    // Get start of day for first session
    const startOfFirstSession = new Date(firstSessionToday)
    startOfFirstSession.setHours(firstSessionToday.getHours(), firstSessionToday.getMinutes() - todaySessions.find(s => s.completedAt === firstSessionToday.toISOString())?.duration || 0, 0, 0)
    
    const totalElapsedMinutes = Math.floor((now - startOfFirstSession) / (1000 * 60))
    
    if (totalElapsedMinutes <= 0) return 0
    
    return Math.round((todayMinutes / totalElapsedMinutes) * 100)
  }

  const efficiencyPercentage = calculateEfficiency()

  return (
    <div className="min-h-screen p-4 w-full overflow-hidden">
      {/* LCARS Top Bar */}
      <div className="flex items-stretch gap-0 mb-0 overflow-hidden">
        <div className="w-28 min-w-[7rem] h-16 rounded-tl-[2rem] flex-shrink-0" style={{backgroundColor: 'var(--lcars-orange)'}} />
        <div className="flex-1 h-16 flex items-center justify-between px-6 min-w-0 overflow-hidden" style={{backgroundColor: 'var(--lcars-peach)'}}>
          <span className="text-black text-xs tracking-widest uppercase opacity-60 hidden md:block whitespace-nowrap overflow-hidden text-ellipsis">
            Stardate {stardate}
          </span>
          <span className="text-black font-bold text-xl tracking-widest uppercase whitespace-nowrap overflow-hidden text-ellipsis">
            Temporal Monitor
          </span>
          <span className="text-black text-xs tracking-widest uppercase opacity-60 hidden md:block whitespace-nowrap overflow-hidden text-ellipsis">
            Space: Play/Pause • R: Reset
          </span>
        </div>
        <div className="w-20 min-w-[5rem] h-16 rounded-tr-[2rem] flex-shrink-0" style={{backgroundColor: 'var(--lcars-purple)'}} />
      </div>

      {/* Elbow connector - top */}
      <div className="flex gap-0 mb-2 overflow-hidden">
        <div className="w-28 min-w-[7rem] h-4 flex-shrink-0" style={{backgroundColor: 'var(--lcars-orange)'}} />
        <div className="w-8 h-4 flex-shrink-0" style={{backgroundColor: 'var(--lcars-orange)', borderBottomRightRadius: '1rem'}} />
        <div className="flex-1" />
        <div className="w-8 h-4 flex-shrink-0" style={{backgroundColor: 'var(--lcars-purple)', borderBottomLeftRadius: '1rem'}} />
        <div className="w-20 min-w-[5rem] h-4 flex-shrink-0" style={{backgroundColor: 'var(--lcars-purple)'}} />
      </div>

      {/* Main Content Area */}
      <div className="flex gap-0 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-28 min-w-[7rem] flex flex-col gap-2 flex-shrink-0">
          <div className="h-12 rounded-l-full" style={{backgroundColor: 'var(--lcars-gold)'}} />
          <div className="h-12 rounded-l-full" style={{backgroundColor: 'var(--lcars-tan)'}} />
          <div className="h-12 rounded-l-full" style={{backgroundColor: 'var(--lcars-lavender)'}} />
          <div className="flex-1" style={{minHeight: '180px'}} />
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-12 rounded-l-full text-black font-bold text-xs uppercase tracking-wider"
            style={{backgroundColor: soundEnabled ? 'var(--status-active)' : 'var(--lcars-red)'}}
          >
            {soundEnabled ? '🔊 Sound' : '🔇 Muted'}
          </button>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center py-8 min-w-0 overflow-hidden">
          {/* Session Stats Bar */}
          <div className="flex gap-6 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold" style={{color: 'var(--lcars-peach)'}}>
                {sessionCount}
              </div>
              <div className="text-xs tracking-widest uppercase" style={{color: 'var(--lcars-gold)'}}>
                Cycles Today
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{color: 'var(--lcars-peach)'}}>
                {todayMinutes}
              </div>
              <div className="text-xs tracking-widest uppercase" style={{color: 'var(--lcars-gold)'}}>
                Minutes Logged
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{color: 'var(--lcars-peach)'}}>
                {efficiencyPercentage}%
              </div>
              <div className="text-xs tracking-widest uppercase" style={{color: 'var(--lcars-gold)'}}>
                Efficiency
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold" style={{color: 'var(--lcars-peach)'}}>
                {cycleType === 'FOCUS' ? `${currentPreset}m` : '5m'}
              </div>
              <div className="text-xs tracking-widest uppercase" style={{color: 'var(--lcars-gold)'}}>
                Current {cycleType}
              </div>
            </div>
          </div>

          {/* Current Objective Input */}
          <div className="w-full max-w-lg mb-6">
            <div className="text-xs tracking-widest uppercase mb-2" style={{color: 'var(--lcars-gold)'}}>
              Current Objective
            </div>
            <input
              type="text"
              value={currentObjective}
              onChange={handleObjectiveChange}
              placeholder="Enter mission objective..."
              className="w-full px-4 py-3 bg-transparent border-2 rounded-full text-center font-bold tracking-wider placeholder-opacity-50 focus:outline-none focus:border-opacity-100 transition-all"
              style={{
                color: 'var(--lcars-text)',
                borderColor: 'var(--lcars-orange)',
                fontSize: '16px'
              }}
            />
          </div>

          {/* LCARS Progress Bar */}
          <div className="w-full max-w-lg mb-8">
            <div className="relative h-2 rounded-full overflow-hidden" style={{backgroundColor: 'rgba(255, 153, 102, 0.1)'}}>
              <div 
                className="absolute right-0 top-0 h-full rounded-full transition-all duration-1000 ease-linear"
                style={{
                  backgroundColor: secondsLeft <= 60 
                    ? 'var(--lcars-red)' 
                    : cycleType === 'FOCUS' ? 'var(--lcars-orange)' : 'var(--lcars-blue)',
                  width: `${(secondsLeft / (cycleType === 'FOCUS' ? currentPreset * 60 : 5 * 60)) * 100}%`,
                  transitionDuration: isRunning ? '1s' : '0s'
                }}
              />
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="text-8xl font-bold tracking-wider" style={{color: 'var(--lcars-text)'}}>
              {formatTime(secondsLeft)}
            </div>
            <div className="text-lg mt-2 tracking-widest uppercase" style={{color: 'var(--lcars-text-light)'}}>
              <span style={{color: cycleType === 'FOCUS' ? 'var(--lcars-orange)' : 'var(--lcars-blue)'}}>
                {cycleType}
              </span>
              {' — '}
              {isRunning ? 'Active' : secondsLeft === 0 ? 'Complete' : 'Standing By'}
            </div>
          </div>

          {/* Control Buttons or Choice Menu */}
          {showChoiceMenu ? (
            <div className="text-center">
              <div className="text-lg mb-4 tracking-widest uppercase" style={{color: 'var(--lcars-gold)'}}>
                Focus Cycle Complete — Choose Next Action
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleBreakChoice}
                  className="px-6 py-3 rounded-full text-black font-bold text-lg uppercase tracking-wider hover:brightness-110 transition"
                  style={{backgroundColor: 'var(--lcars-blue)'}}
                >
                  Take Break (5 min)
                </button>
                <button
                  onClick={handleContinueFocus}
                  className="px-6 py-3 rounded-full text-black font-bold text-lg uppercase tracking-wider hover:brightness-110 transition"
                  style={{backgroundColor: 'var(--lcars-orange)'}}
                >
                  Continue Focus
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={handleStartPause}
                className="px-8 py-3 rounded-full text-black font-bold text-lg uppercase tracking-wider hover:brightness-110 transition"
                style={{backgroundColor: isRunning ? 'var(--lcars-red)' : 'var(--status-active)'}}
              >
                {isRunning ? 'Pause' : 'Engage'}
              </button>
              <button
                onClick={handleReset}
                className="px-8 py-3 rounded-full text-black font-bold text-lg uppercase tracking-wider hover:brightness-110 transition"
                style={{backgroundColor: 'var(--lcars-purple)'}}
              >
                Reset
              </button>
            </div>
          )}

          {/* Preset Buttons */}
          {!showChoiceMenu && (
            <div className="flex gap-3 mt-6 flex-wrap justify-center">
            {[
              { label: '30 SEC', mins: 0.5 },
              { label: '1 MIN', mins: 1 },
              { label: '5 MIN', mins: 5 },
              { label: '15 MIN', mins: 15 },
              { label: '25 MIN', mins: 25 },
              { label: '50 MIN', mins: 50 },
            ].map(preset => (
              <button
                key={preset.mins}
                onClick={() => selectPreset(preset.mins)}
                className="px-4 py-2 rounded-full text-black font-bold text-sm uppercase tracking-wider hover:brightness-110 transition"
                style={{
                  backgroundColor: currentPreset === preset.mins
                    ? 'var(--lcars-orange)'
                    : 'var(--lcars-tan)'
                }}
              >
                {preset.label}
              </button>
            ))}
            </div>
          )}

          {/* Session History */}
          {todaySessions.length > 0 && (
            <div className="mt-10 w-full max-w-md">
              <div className="text-xs tracking-widest uppercase mb-3" style={{color: 'var(--lcars-gold)'}}>
                Mission Log — Today
              </div>
              <div className="flex flex-col gap-1">
                {todaySessions.slice().reverse().map((session, i) => (
                  <div
                    key={session.id}
                    className="px-4 py-2 rounded-full text-sm"
                    style={{backgroundColor: 'rgba(255, 153, 102, 0.1)'}}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{color: 'var(--lcars-text-light)'}}>
                        Cycle {todaySessions.length - i}
                      </span>
                      <span style={{color: 'var(--lcars-peach)'}}>
                        {session.duration} min
                      </span>
                      <span style={{color: 'var(--lcars-gold)'}}>
                        {formatSessionTime(session.completedAt)}
                      </span>
                    </div>
                    {session.objective && (
                      <div className="text-xs mt-1 italic" style={{color: 'var(--lcars-text-light)'}}>
                        "{session.objective}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CSV Export Button */}
          {sessions.length > 0 && (
            <div className="mt-6">
              <button
                onClick={exportToCSV}
                className="px-6 py-3 rounded-full text-black font-bold text-sm uppercase tracking-wider hover:brightness-110 transition"
                style={{backgroundColor: 'var(--lcars-gold)'}}
              >
                📊 Export Mission Log
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-20 min-w-[5rem] flex flex-col gap-2 flex-shrink-0">
          <div className="h-12 rounded-r-full" style={{backgroundColor: 'var(--lcars-lavender)'}} />
          <div className="h-12 rounded-r-full" style={{backgroundColor: 'var(--lcars-blue)'}} />
          <div className="h-12 rounded-r-full" style={{backgroundColor: 'var(--lcars-gold)'}} />
          <div className="flex-1" style={{minHeight: '220px'}} />
        </div>
      </div>

      {/* Elbow connector - bottom */}
      <div className="flex gap-0 mt-2 overflow-hidden">
        <div className="w-28 min-w-[7rem] h-4 flex-shrink-0" style={{backgroundColor: 'var(--lcars-orange)'}} />
        <div className="w-8 h-4 flex-shrink-0" style={{backgroundColor: 'var(--lcars-orange)', borderTopRightRadius: '1rem'}} />
        <div className="flex-1" />
        <div className="w-8 h-4 flex-shrink-0" style={{backgroundColor: 'var(--lcars-purple)', borderTopLeftRadius: '1rem'}} />
        <div className="w-20 min-w-[5rem] h-4 flex-shrink-0" style={{backgroundColor: 'var(--lcars-purple)'}} />
      </div>

      {/* LCARS Bottom Bar */}
      <div className="flex items-stretch gap-0 mt-0 overflow-hidden">
        <div className="w-28 min-w-[7rem] h-10 rounded-bl-[2rem] flex-shrink-0" style={{backgroundColor: 'var(--lcars-orange)'}} />
        <div className="flex-1 h-10 overflow-hidden" style={{backgroundColor: 'var(--lcars-gold)'}} />
        <div className="w-20 min-w-[5rem] h-10 rounded-br-[2rem] flex-shrink-0" style={{backgroundColor: 'var(--lcars-purple)'}} />
      </div>
    </div>
  )
}