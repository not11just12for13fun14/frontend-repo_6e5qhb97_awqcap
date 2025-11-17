import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || ''

const STYLES = [
  { value: 'city', label: 'City (Isometric Pixel Art)' },
  { value: 'forest', label: 'Forest (Isometric Pixel Art)' },
  { value: 'dungeon', label: 'Dungeon (Isometric Pixel Art)' },
]

const CAMERAS = [
  { value: 'isometric-wide', label: 'Isometric • Wide' },
  { value: 'isometric-close', label: 'Isometric • Close' },
  { value: 'topdown', label: 'Top-down' },
  { value: 'dolly-in', label: 'Dolly In' },
  { value: 'orbit', label: 'Orbit' },
]

function App() {
  const [view, setView] = useState('auth') // auth | app
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  // App state
  const [usage, setUsage] = useState(null)
  const [jobs, setJobs] = useState([])
  const [projects, setProjects] = useState([])

  // Create job form
  const [prompt, setPrompt] = useState('An adventurous robot runs across rooftops as neon billboards flicker')
  const [style, setStyle] = useState('city')
  const [camera, setCamera] = useState('isometric-wide')
  const [duration, setDuration] = useState(30)
  const [voiceId, setVoiceId] = useState('')
  const [continueProject, setContinueProject] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [creating, setCreating] = useState(false)

  const authHeader = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token])

  const readError = async (res) => {
    try {
      const data = await res.json()
      if (typeof data === 'string') return data
      if (data?.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
      if (data?.message) return data.message
      return JSON.stringify(data)
    } catch {
      try { return await res.text() } catch { return 'Request failed' }
    }
  }

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/auth/me`, { headers: authHeader })
        .then(r => r.ok ? r.json() : Promise.reject('Auth check failed'))
        .then(data => { setProfile(data); setView('app') })
        .catch(() => { setToken(''); localStorage.removeItem('token') })
    }
  }, [])

  useEffect(() => {
    if (!token) return
    refreshUsage()
    refreshJobs()
    const id = setInterval(() => refreshJobs(), 4000)
    return () => clearInterval(id)
  }, [token])

  const refreshUsage = async () => {
    try {
      const r = await fetch(`${API_BASE}/usage`, { headers: authHeader })
      if (r.ok) setUsage(await r.json())
    } catch {}
  }

  const refreshJobs = async () => {
    try {
      const r = await fetch(`${API_BASE}/jobs`, { headers: authHeader })
      if (!r.ok) return
      const data = await r.json()
      setJobs(data.jobs || [])
      const projMap = new Map()
      for (const j of data.jobs || []) {
        if (j.project_id) {
          const title = j.project_title || `Project ${j.project_id.slice(-4)}`
          projMap.set(j.project_id, title)
        }
      }
      const arr = Array.from(projMap.entries()).map(([id, title]) => ({ id, title }))
      setProjects(arr)
      if (!selectedProjectId && arr.length) setSelectedProjectId(arr[0].id)
    } catch {}
  }

  const register = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    const emailTrim = email.trim()
    if (!emailTrim || !password) {
      setError('Please enter email and password')
      setSubmitting(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setSubmitting(false)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrim, password }),
      })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      setToken(data.access_token)
      localStorage.setItem('token', data.access_token)
      const me = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${data.access_token}` } })
      setProfile(await me.json())
      setView('app')
    } catch (err) {
      setError(String(err?.message || err) || 'Sign up failed')
    } finally {
      setSubmitting(false)
    }
  }

  const login = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    const emailTrim = email.trim()
    if (!emailTrim || !password) {
      setError('Please enter email and password')
      setSubmitting(false)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrim, password }),
      })
      if (!res.ok) throw new Error(await readError(res))
      const data = await res.json()
      setToken(data.access_token)
      localStorage.setItem('token', data.access_token)
      const me = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${data.access_token}` } })
      setProfile(await me.json())
      setView('app')
    } catch (err) {
      setError(String(err?.message || err) || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  const logout = () => {
    setToken('')
    setProfile(null)
    localStorage.removeItem('token')
    setView('auth')
  }

  const createJob = async () => {
    setCreating(true)
    setError('')
    try {
      const body = {
        scene: {
          prompt,
          style,
          camera_preset: camera,
          duration_seconds: Number(duration),
          voice_id: voiceId || null,
        },
        continue_project: continueProject,
      }
      if (continueProject && selectedProjectId) {
        body.project_id = selectedProjectId
      } else {
        body.title = prompt.slice(0, 40) || 'New Project'
      }
      const r = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error(await r.text())
      await r.json()
      await Promise.all([refreshUsage(), refreshJobs()])
    } catch (e) {
      setError('Failed to create job')
    } finally {
      setCreating(false)
    }
  }

  const togglePlan = async () => {
    try {
      const plan = profile?.is_premium ? 'free' : 'premium'
      const r = await fetch(`${API_BASE}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ plan }),
      })
      if (r.ok) {
        await fetch(`${API_BASE}/auth/me`, { headers: authHeader }).then(async rr => setProfile(await rr.json()))
        await refreshUsage()
      }
    } catch {}
  }

  if (view === 'auth') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-2 text-gray-800">Funanimation</h1>
          <p className="text-gray-500 mb-6">Sign in with your email to continue</p>
          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
          <form className="space-y-4">
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} onClick={login} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg py-2 font-medium">{submitting ? 'Please wait…' : 'Log in'}</button>
              <button type="button" disabled={submitting} onClick={register} className="flex-1 bg-gray-900 hover:bg-black disabled:opacity-60 text-white rounded-lg py-2 font-medium">{submitting ? 'Please wait…' : 'Sign up'}</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const weeklyInfo = usage ? `${usage.used_this_week}/${usage.weekly_free_limit} free renders used this week` : 'Loading usage...'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div className="font-semibold">Funanimation</div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 hidden sm:block">{weeklyInfo}</div>
            {profile && (
              <div className="text-sm text-gray-600">{profile.email} {profile.is_premium ? '• Premium' : '• Free'}</div>
            )}
            <button onClick={togglePlan} className="text-sm bg-gray-900 text-white rounded-md px-3 py-1.5">
              {profile?.is_premium ? 'Switch to Free' : 'Go Premium ($4/mo)'}
            </button>
            <button onClick={logout} className="text-sm text-gray-700 hover:text-black">Log out</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white rounded-xl shadow-sm border p-5 lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Create video</h2>
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          <div className="space-y-3">
            <label className="block text-sm text-gray-700">Prompt</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={4} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Scene style</label>
                <select value={style} onChange={e=>setStyle(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Camera preset</label>
                <select value={camera} onChange={e=>setCamera(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  {CAMERAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Duration (sec)</label>
                <input type="number" value={duration} min={5} max={120} onChange={e=>setDuration(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Voice ID (optional)</label>
                <input value={voiceId} onChange={e=>setVoiceId(e.target.value)} placeholder="e.g. real-male-01" className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={continueProject} onChange={e=>setContinueProject(e.target.checked)} />
                Continue existing project
              </label>
              {continueProject ? (
                <select value={selectedProjectId} onChange={e=>setSelectedProjectId(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Select a project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              ) : (
                <p className="text-xs text-gray-500">A new project will be created automatically.</p>
              )}
            </div>

            <button disabled={creating} onClick={createJob} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg py-2 font-medium">
              {creating ? 'Queuing...' : 'Generate'}
            </button>
          </div>
        </section>

        <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-lg font-semibold mb-4">Recent jobs</h2>
          <div className="space-y-3">
            {jobs.length === 0 && (
              <div className="text-gray-500 text-sm">No jobs yet. Create your first render!</div>
            )}
            {jobs.map(job => (
              <div key={job.id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-500">{job.project_id ? `Project ${job.project_id.slice(-4)}` : 'Project —'}</div>
                  <div className="font-medium">{job.scene?.prompt?.slice(0, 80) || '—'}</div>
                  <div className="text-xs text-gray-500">{job.scene?.style} • {job.scene?.camera_preset} • {job.status}</div>
                </div>
                <div className="flex items-center gap-3">
                  {job.voice_url && <a href={job.voice_url} target="_blank" className="text-sm text-blue-600 underline">Voice</a>}
                  {job.result_url ? (
                    <a href={job.result_url} target="_blank" className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-md">Watch</a>
                  ) : (
                    <span className="text-xs text-gray-500">Processing…</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
