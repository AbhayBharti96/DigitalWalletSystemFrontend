// ─── ProfilePage.tsx ─────────────────────────────────────────────────────────
import { useState, useEffect, FormEvent } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAppSelector, useNotify } from '../../shared/hooks'
import { userService } from '../../core/api'
import { formatDate, getKycInfo } from '../../shared/utils'
import type { UserProfile } from '../../types'

export function ProfilePage() {
  const { user } = useAppSelector(s => s.auth)
  const notify = useNotify()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user?.id) load() }, [user?.id])

  const load = async () => {
    setLoading(true)
    try { const { data } = await userService.getProfile(user!.id); setProfile(data.data); setForm({ name: data.data.fullName || '', phone: data.data.phone || '' }) }
    catch { toast.error('Failed to load profile') } finally { setLoading(false) }
  }

  const save = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { const { data } = await userService.updateProfile(user!.id, form); setProfile(data.data); setEditing(false); notify('success', 'Profile Updated', 'Your profile has been updated.'); toast.success('Saved!') }
    catch { toast.error('Update failed') } finally { setSaving(false) }
  }

  const p = profile || user
  const kycI = getKycInfo(p?.kycStatus)
  const KycIcon = kycI.icon
  const initial = (p?.fullName?.[0] || 'U').toUpperCase()

  if (loading) return <div className="p-6 flex justify-center h-64 items-center"><div className="animate-spin w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} /></div>

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
      <div><h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>My Profile</h1></div>

      <motion.div className="card p-6 flex items-center gap-5" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#22c55e,#6366f1)' }} aria-hidden="true">{initial}</div>
        <div className="flex-1">
          <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{p?.fullName || 'User'}</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{p?.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>{user?.role}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: kycI.bg, color: kycI.color }}>
              <KycIcon fontSize="inherit" /> {p?.kycStatus}
            </span>
          </div>
        </div>
        <button onClick={() => setEditing(!editing)} className="btn-secondary py-2 px-4 text-xs">{editing ? 'Cancel' : 'Edit'}</button>
      </motion.div>

      {editing && (
        <motion.div className="card p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <form onSubmit={save} className="space-y-4" noValidate>
            <div><label htmlFor="pname" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
              <input id="pname" type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" minLength={2} maxLength={100} /></div>
            <div><label htmlFor="pphone" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Phone Number</label>
              <input id="pphone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" /></div>
            <button type="submit" disabled={saving} className="btn-primary py-2.5 text-sm">{saving ? 'Saving…' : 'Save Changes'}</button>
          </form>
        </motion.div>
      )}

      <motion.div className="card p-5" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Account Information</h3>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          {[['Email', p?.email], ['Phone', p?.phone || '—'], ['Status', p?.status || 'ACTIVE'], ['KYC', p?.kycStatus], ['Member Since', formatDate(p?.createdAt, 'DD MMM YYYY')], ['User ID', `#${user?.id}`]]
            .map(([k, v]) => (<div key={k as string}><dt className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{k}</dt><dd className="font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{v}</dd></div>))}
        </dl>
      </motion.div>
    </div>
  )
}
export default ProfilePage
