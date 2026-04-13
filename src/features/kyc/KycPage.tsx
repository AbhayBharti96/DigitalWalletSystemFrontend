import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAppDispatch, useAppSelector, useNotify, useTheme } from '../../shared/hooks'
import { kycService } from '../../core/api/kycService'
import { updateKycStatus } from '../../store/authSlice'
import { formatDate, getKycInfo } from '../../shared/utils'
import type { DocType, KycStatusResponse } from '../../types'
import { Icon8 } from '../../shared/components/Icon8'

const DOC_TYPES: DocType[] = ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE']
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export function KycPage() {
  const dispatch = useAppDispatch()
  const notify = useNotify()
  const { isDark } = useTheme()
  const { user } = useAppSelector(s => s.auth)
  const [kycData, setKycData] = useState<KycStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [docType, setDocType] = useState<DocType>('AADHAAR')
  const [docNumber, setDocNumber] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.id) void fetchStatus()
  }, [user?.id])

  const fetchStatus = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data } = await kycService.status(user.id)
      setKycData(data.data)
      if (data.data?.status) dispatch(updateKycStatus(data.data.status))
    } catch {
      setKycData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFile = (f: File) => {
    if (f.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (f.size / (1024 * 1024)).toFixed(2)
      const msg = `File is ${sizeMb}MB. Maximum allowed is ${MAX_FILE_SIZE_MB}MB.`
      setFileError(msg)
      setFile(null)
      toast.error(msg)
      return
    }
    setFileError(null)
    setFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docNumber.trim()) {
      toast.error('Enter your document number')
      return
    }
    if (!file) {
      toast.error(fileError || 'Upload your document')
      return
    }
    if (!user?.id) return
    setSubmitting(true)
    try {
      const { data } = await kycService.submit(user.id, docType, docNumber, file)
      setKycData(data.data)
      dispatch(updateKycStatus('PENDING'))
      notify('info', 'KYC Submitted', 'Your documents are under review.')
      toast.success("KYC submitted! We'll review it within 24-48 hours.")
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !kycData || kycData.status === 'REJECTED' || kycData.status === 'NOT_SUBMITTED'
  if (loading) {
    return (
      <div className="p-6 flex justify-center h-64 items-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2" style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  const kycI = kycData ? getKycInfo(kycData.status) : null
  const KycIcon = kycI?.icon
  const kycDetailRows: [string, string][] = kycData
    ? [
        ['Doc Type', kycData.docType],
        ['Doc Number', kycData.docNumber],
        ['Submitted', formatDate(kycData.submittedAt, 'DD MMM YYYY')],
        ...(kycData.updatedAt ? [['Updated', formatDate(kycData.updatedAt, 'DD MMM YYYY')]] as [string, string][] : []),
      ]
    : []

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>KYC Verification</h1>
        <p className="text-sm mt-0.5" style={{ color: isDark ? '#9fb4d7' : 'var(--text-secondary)' }}>
          Verify your identity to unlock all wallet features
        </p>
      </div>

      {kycData && kycI && (
        <motion.div
          className="card p-5"
          style={{
            borderColor: `${kycI.color}50`,
            background: isDark ? 'linear-gradient(180deg, #101d35 0%, #0f1a30 100%)' : 'var(--bg-card)',
          }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: kycI.bg, color: kycI.color }}>
              {KycIcon && <KycIcon fontSize="inherit" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold" style={{ color: kycI.color }}>{kycI.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: kycI.bg, color: kycI.color }}>{kycData.status}</span>
              </div>
              {kycData.status === 'REJECTED' && kycData.rejectionReason && (
                <p className="text-sm mb-2" style={{ color: 'var(--danger)' }}>Reason: {kycData.rejectionReason}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {kycDetailRows.map(([k, v]) => (
                  <div key={k}>
                    <div style={{ color: isDark ? '#8ca0c1' : 'var(--text-muted)' }}>{k}</div>
                    <div className="font-semibold font-mono tracking-wide" style={{ color: isDark ? '#eef4ff' : 'var(--text-primary)' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {canSubmit && (
        <motion.div className="card p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="font-display font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {kycData?.status === 'REJECTED' ? 'Resubmit KYC' : 'Submit KYC Documents'}
          </h2>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            Accepted: Aadhaar, PAN, Passport, Driving License | Max {MAX_FILE_SIZE_MB}MB
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="docType" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Document Type
              </label>
              <select id="docType" value={docType} onChange={e => setDocType(e.target.value as DocType)} className="input-field">
                {DOC_TYPES.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="docNumber" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Document Number
              </label>
              <input
                id="docNumber"
                type="text"
                placeholder="e.g. ABCDE1234F"
                value={docNumber}
                onChange={e => setDocNumber(e.target.value)}
                className="input-field font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Upload Document</label>
              <div
                className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
                style={{
                  borderColor: fileError ? 'var(--danger)' : (drag || file ? 'var(--brand)' : 'var(--border)'),
                  background: drag || file ? 'var(--brand-light)' : 'var(--bg-primary)',
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDrag(false)
                  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
                }}
                role="button"
                tabIndex={0}
                aria-label="Upload document file"
                onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                  aria-hidden="true"
                />
                {file ? (
                  <>
                    <div className="inline-flex mb-1"><Icon8 name="kyc" size={30} /></div>
                    <div className="font-medium text-sm" style={{ color: 'var(--brand)' }}>{file.name}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB | Max {MAX_FILE_SIZE_MB}MB | Click to replace
                    </div>
                  </>
                ) : (
                  <>
                    <div className="inline-flex mb-1"><Icon8 name="overview" size={30} /></div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Drag and drop or click to upload</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>PNG, JPG, PDF | Max {MAX_FILE_SIZE_MB}MB</div>
                  </>
                )}
              </div>
              {fileError && (
                <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--danger)' }}>{fileError}</p>
              )}
            </div>

            <button type="submit" disabled={submitting} className="w-full btn-primary py-3 text-sm">
              {submitting ? 'Submitting...' : 'Submit KYC'}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  )
}

export default KycPage
