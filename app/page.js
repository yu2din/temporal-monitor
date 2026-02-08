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

  // Load saved sessions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lcars-sessions')
    if (saved) {
      const parsed = JSON.parse(saved)
      setSessions(parsed)
      setSessionCount(parsed.filter(s =>
        new Date(s.completedAt).toDateString() === new Date().toDateString()
      ).length)
    }
    setStardate(getStardate())
    const sdInterval = setInterval(() => setStardate(getStardate()), 60000)
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
      document.title = `${time} ▶ LCARS Temporal Monitor`
    } else if (secondsLeft === 0) {
      document.title = '✅ Cycle Complete — LCARS Temporal Monitor'
    } else {
      document.title = 'LCARS Temporal Monitor'
    }
  }, [secondsLeft, isRunning])

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
    playSound('complete')
    const newSession = {
      id: Date.now(),
      duration: currentPreset,
      completedAt: new Date().toISOString(),
    }
    const updated = [...sessions, newSession]
    setSessions(updated)
    setSessionCount(prev => prev + 1)
    localStorage.setItem('lcars-sessions', JSON.stringify(updated))
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

  const todaySessions = sessions.filter(s =>
    new Date(s.completedAt).toDateString() === new Date().toDateString()
  )

  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0)

  return (
    <div className="min-h-screen p-4 max-w-screen overflow-x-hidden">
      {/* LCARS Top Bar */}
      <div className="flex items-stretch gap-0 mb-0">
        <div className="w-28 min-w-[7rem] h-16 rounded-tl-[2rem]" style={{backgroundColor: 'var(--lcars-orange)'}} />
        <div className="flex-1 h-16 flex items-center justify-between px-6 min-w-0" style={{backgroundColor: 'var(--lcars-peach)'}}>
          <span className="text-black text-xs tracking-widest uppercase opacity-60 hidden md:block">
            Stardate {stardate}
          </span>
          <span className="text-black font-bold text-xl tracking-widest uppercase">
            Temporal Monitor
          </span>
          <span className="text-black text-xs tracking-widest uppercase opacity-60 hidden md:block">
            Space: Play/Pause • R: Reset
          </span>
        </div>
        <div className="w-20 min-w-[5rem] h-16 rounded-tr-[2rem]" style={{backgroundColor: 'var(--lcars-purple)'}} />
      </div>

      {/* Elbow connector - top */}
      <div className="flex gap-0 mb-2">
        <div className="w-28 min-w-[7rem] h-4" style={{backgroundColor: 'var(--lcars-orange)'}} />
        <div className="w-8 h-4" style={{backgroundColor: 'var(--lcars-orange)', borderBottomRightRadius: '1rem'}} />
        <div className="flex-1" />
        <div className="w-8 h-4" style={{backgroundColor: 'var(--lcars-purple)', borderBottomLeftRadius: '1rem'}} />
        <div className="w-20 min-w-[5rem] h-4" style={{backgroundColor: 'var(--lcars-purple)'}} />
      </div>

      {/* Main Content Area */}
      <div className="flex gap-0">
        {/* Left Sidebar */}
        <div className="w-28 min-w-[7rem] flex flex-col gap-2">
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
        <div className="flex-1 flex flex-col items-center justify-center py-8 min-w-0">
          {/* Session Stats Bar */}
          <div className="flex gap-8 mb-8">
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
                {currentPreset}m
              </div>
              <div className="text-xs tracking-widest uppercase" style={{color: 'var(--lcars-gold)'}}>
                Current Cycle
              </div>
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-center mb-8">
            <div className="text-8xl font-bold tracking-wider" style={{color: 'var(--lcars-text)'}}>
              {formatTime(secondsLeft)}
            </div>
            <div className="text-lg mt-2 tracking-widest uppercase" style={{color: 'var(--lcars-text-light)'}}>
              {isRunning ? 'Cycle Active' : secondsLeft === 0 ? 'Cycle Complete' : 'Standing By'}
            </div>
          </div>

          {/* Control Buttons */}
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

          {/* Preset Buttons */}
          <div className="flex gap-3 mt-6">
            {[
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
                    className="flex items-center justify-between px-4 py-2 rounded-full text-sm"
                    style={{backgroundColor: 'rgba(255, 153, 102, 0.1)'}}
                  >
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
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-20 min-w-[5rem] flex flex-col gap-2">
          <div className="h-12 rounded-r-full" style={{backgroundColor: 'var(--lcars-lavender)'}} />
          <div className="h-12 rounded-r-full" style={{backgroundColor: 'var(--lcars-blue)'}} />
          <div className="h-12 rounded-r-full" style={{backgroundColor: 'var(--lcars-gold)'}} />
          <div className="flex-1" style={{minHeight: '220px'}} />
        </div>
      </div>

      {/* Elbow connector - bottom */}
      <div className="flex gap-0 mt-2">
        <div className="w-28 min-w-[7rem] h-4" style={{backgroundColor: 'var(--lcars-orange)'}} />
        <div className="w-8 h-4" style={{backgroundColor: 'var(--lcars-orange)', borderTopRightRadius: '1rem'}} />
        <div className="flex-1" />
        <div className="w-8 h-4" style={{backgroundColor: 'var(--lcars-purple)', borderTopLeftRadius: '1rem'}} />
        <div className="w-20 min-w-[5rem] h-4" style={{backgroundColor: 'var(--lcars-purple)'}} />
      </div>

      {/* LCARS Bottom Bar */}
      <div className="flex items-stretch gap-0 mt-0">
        <div className="w-28 min-w-[7rem] h-10 rounded-bl-[2rem]" style={{backgroundColor: 'var(--lcars-orange)'}} />
        <div className="flex-1 h-10" style={{backgroundColor: 'var(--lcars-gold)'}} />
        <div className="w-20 min-w-[5rem] h-10 rounded-br-[2rem]" style={{backgroundColor: 'var(--lcars-purple)'}} />
      </div>
    </div>
  )
}