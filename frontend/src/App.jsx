import { useEffect, useMemo, useState } from 'react'
import { Menu, Sparkles, Download, Film, Mic, Image as ImageIcon, Layers, Bot, Crown } from 'lucide-react'
import Spline from '@splinetool/react-spline'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function PlanBadge({ plan }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
      plan === 'premium' ? 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/40' : 'bg-white/10 text-white/80 ring-1 ring-white/20'
    }`}>
      {plan === 'premium' ? <Crown size={14} /> : <Sparkles size={14} />}
      {plan}
    </span>
  )
}

function Hero() {
  return (
    <section className="relative h-[70vh] w-full overflow-hidden">
      <Spline scene="https://prod.spline.design/atN3lqky4IzF-KEP/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center text-center px-6">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">Funanimation</h1>
          <p className="mt-3 md:mt-4 text-base md:text-lg text-white/80">Turn text into 2-minute, isometric pixel-art videos with custom voices. Characters, environments, and props—auto storyboarded and ready to download.</p>
        </div>
      </div>
    </section>
  )
}

function FeatureGrid() {
  const features = [
    { icon: <Bot />, title: 'Text-to-Animation', desc: 'Describe any scene. We auto-script and assemble a 2-minute video.' },
    { icon: <Mic />, title: 'Custom Voices', desc: 'Pick a voice for your character lines and narration.' },
    { icon: <Layers />, title: 'Isometric Pixel Art', desc: 'Crisp, game-like isometric style across scenes.' },
    { icon: <Film />, title: 'Instant Download', desc: 'Export MP4 when it’s ready. Keep and share anywhere.' },
  ]
  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-zinc-900 to-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="text-white/90">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-white/70 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Generator() {
  const [userId] = useState(() => {
    const id = localStorage.getItem('fun_user_id')
    if (id) return id
    const nid = crypto.randomUUID()
    localStorage.setItem('fun_user_id', nid)
    return nid
  })
  const [plan, setPlan] = useState('free')
  const [usage, setUsage] = useState({ count: 0, limit: 3 })
  const [prompt, setPrompt] = useState('A brave pixel knight runs across rooftops at sunset')
  const [category, setCategory] = useState('character')
  const [voice, setVoice] = useState('RetroNarrator')
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState([])

  async function refreshUsage() {
    const r = await fetch(`${BACKEND_URL}/usage?user_id=${userId}`)
    const j = await r.json()
    setPlan(j.plan)
    setUsage({ count: j.generated_this_week, limit: j.weekly_limit ?? null })
  }
  async function refreshJobs() {
    const r = await fetch(`${BACKEND_URL}/jobs?user_id=${userId}`)
    const j = await r.json()
    setJobs(j)
  }

  useEffect(() => {
    refreshUsage()
    refreshJobs()
  }, [])

  async function generate() {
    setLoading(true)
    try {
      const r = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, prompt, category, voice })
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: 'Error' }))
        alert(err.detail || 'Generation failed')
      }
      await refreshUsage()
      await refreshJobs()
    } finally {
      setLoading(false)
    }
  }

  async function subscribe() {
    const r = await fetch(`${BACKEND_URL}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, plan: 'premium' })
    })
    if (r.ok) {
      await refreshUsage()
    }
  }

  const quotaText = useMemo(() => {
    if (plan === 'premium') return 'Unlimited videos • $4/month'
    return `Free plan: ${usage.count}/3 videos this week`
  }, [plan, usage])

  return (
    <section className="bg-black py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-semibold text-white">Create</h2>
            <PlanBadge plan={plan} />
            <span className="text-white/60 text-sm">{quotaText}</span>
          </div>
          {plan !== 'premium' && (
            <button onClick={subscribe} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition">
              <Crown size={16} /> Go Premium ($4)
            </button>
          )}
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-5">
            <label className="text-sm text-white/70">Describe your video</label>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={6} className="mt-2 w-full rounded-lg bg-black/60 border border-white/10 p-3 text-white placeholder:text-white/40" placeholder="e.g. A cozy isometric pixel village with rain and a wandering merchant" />
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-white/60">Type</label>
                <select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full rounded-lg bg-black/60 border border-white/10 p-2 text-white">
                  <option value="character">Character</option>
                  <option value="environment">Environment</option>
                  <option value="object">Object / Prop</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60">Voice</label>
                <input value={voice} onChange={e=>setVoice(e.target.value)} className="mt-1 w-full rounded-lg bg-black/60 border border-white/10 p-2 text-white" />
              </div>
              <div className="flex items-end">
                <button onClick={generate} disabled={loading} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-400 disabled:opacity-60 transition">
                  <Sparkles size={18} /> {loading ? 'Generating...' : 'Generate 2:00 video'}
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-white font-medium">Your videos</h3>
            <div className="mt-3 space-y-3 max-h-80 overflow-auto pr-2">
              {jobs.length === 0 && <p className="text-white/60 text-sm">No videos yet</p>}
              {jobs.map(j => (
                <div key={j.id} className="rounded-lg bg-black/50 border border-white/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 text-sm">{j.status.toUpperCase()}</span>
                    {j.download_url && (
                      <a href={j.download_url} target="_blank" className="inline-flex items-center gap-1 text-indigo-300 hover:text-indigo-200 text-sm">
                        <Download size={14} /> Download
                      </a>
                    )}
                  </div>
                  <p className="text-white/60 text-xs mt-1 line-clamp-2">{j.script?.[0]?.description || 'Script ready'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Menu className="text-white/70" size={20} />
            <span className="font-semibold">Funanimation</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-white/70">
            <a href="#create" className="hover:text-white">Create</a>
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
          </nav>
        </div>
      </header>

      <Hero />
      <div id="features"><FeatureGrid /></div>
      <div id="create"><Generator /></div>

      <section id="pricing" className="py-14 bg-gradient-to-b from-black to-zinc-900">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-2xl font-semibold">Pricing</h3>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h4 className="text-white font-medium">Free</h4>
              <p className="text-white/70 text-sm mt-1">Generate up to 3 videos per week.</p>
              <p className="text-3xl font-bold mt-3">$0</p>
            </div>
            <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-6 ring-1 ring-yellow-500/30">
              <h4 className="text-white font-medium flex items-center gap-2">Premium <Crown size={18} className="text-yellow-400" /></h4>
              <p className="text-white/80 text-sm mt-1">Unlimited generations and downloads.</p>
              <p className="text-3xl font-bold mt-3">$4<span className="text-white/60 text-base font-normal">/month</span></p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-white/10 bg-black/80">
        <div className="max-w-6xl mx-auto px-6 text-white/60 text-sm">
          © {new Date().getFullYear()} Funanimation. Built for playful creators.
        </div>
      </footer>
    </div>
  )
}
