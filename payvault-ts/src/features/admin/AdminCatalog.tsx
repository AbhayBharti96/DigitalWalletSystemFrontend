import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { adminService, rewardsService } from '../../services'
import { useAppSelector } from '../../shared/hooks'
import { ConfirmDialog, EmptyState, Skeleton } from '../../shared/components/ui'
import { Icon8 } from '../../shared/components/Icon8'
import type { AdminCatalogItemPayload, RewardItem, RewardItemType, RewardTier } from '../../types'
import { adminCatalogSchema, getFieldErrors, getFirstError } from '../../shared/validation'
import { formatCurrency, getTierStyle } from '../../shared/utils'

type FormState = {
  name: string
  description: string
  pointsRequired: string
  type: RewardItemType
  cashbackAmount: string
  tierRequired: '' | RewardTier
  stock: string
  expiryDays: string
  active: boolean
}

type FormErrors = Partial<Record<keyof FormState, string>>

const initialForm: FormState = {
  name: '',
  description: '',
  pointsRequired: '',
  type: 'COUPON',
  cashbackAmount: '',
  tierRequired: '',
  stock: '',
  expiryDays: '',
  active: true,
}

const rewardTypeLabel: Record<RewardItemType, string> = {
  CASHBACK: 'Cashback',
  COUPON: 'Coupon',
  VOUCHER: 'Voucher',
}

const getCashbackAmountError = (form: FormState) =>
  form.type === 'CASHBACK' && !form.cashbackAmount.trim()
    ? 'Cashback amount is required for cashback rewards'
    : ''

export default function AdminCatalog() {
  const { user } = useAppSelector(s => s.auth)
  const role = user?.role || 'ADMIN'
  const [items, setItems] = useState<RewardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<RewardItem | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    void loadCatalog()
  }, [])

  const loadCatalog = async () => {
    setLoading(true)
    try {
      const { data } = await rewardsService.catalog()
      setItems(data.data || [])
    } catch {
      toast.error('Could not load reward catalog')
    } finally {
      setLoading(false)
    }
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => {
      const nextForm = {
        ...prev,
        [key]: value,
        ...(key === 'type' && value !== 'CASHBACK' ? { cashbackAmount: '' } : {}),
      }

      setErrors(prevErrors => ({
        ...prevErrors,
        [key]: '',
        cashbackAmount: getCashbackAmountError(nextForm),
      }))

      return nextForm
    })
  }

  const resetForm = () => {
    setForm(initialForm)
    setErrors({})
    setEditingId(null)
  }

  const startEdit = (item: RewardItem) => {
    setEditingId(item.id)
    setErrors({})
    setForm({
      name: item.name,
      description: item.description || '',
      pointsRequired: String(item.pointsRequired),
      type: item.type,
      cashbackAmount: item.cashbackAmount ? String(item.cashbackAmount) : '',
      tierRequired: item.tierRequired || '',
      stock: String(item.stock),
      expiryDays: item.expiryDays ? String(item.expiryDays) : '',
      active: item.active,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cashbackAmountError = getCashbackAmountError(form)
    if (cashbackAmountError) {
      setErrors(prev => ({ ...prev, cashbackAmount: cashbackAmountError }))
      toast.error(cashbackAmountError)
      return
    }

    const result = adminCatalogSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors = getFieldErrors(result.error)
      setErrors({
        name: fieldErrors.name?.[0],
        description: fieldErrors.description?.[0],
        pointsRequired: fieldErrors.pointsRequired?.[0],
        type: fieldErrors.type?.[0],
        cashbackAmount: fieldErrors.cashbackAmount?.[0],
        tierRequired: fieldErrors.tierRequired?.[0],
        stock: fieldErrors.stock?.[0],
        expiryDays: fieldErrors.expiryDays?.[0],
        active: fieldErrors.active?.[0],
      })
      toast.error(getFirstError(result.error))
      return
    }

    const payload: AdminCatalogItemPayload = {
      name: result.data.name,
      description: result.data.description || undefined,
      pointsRequired: result.data.pointsRequired,
      type: result.data.type,
      cashbackAmount: result.data.cashbackAmount === '' ? undefined : result.data.cashbackAmount,
      tierRequired: result.data.tierRequired === '' ? undefined : result.data.tierRequired,
      stock: result.data.stock,
      expiryDays: result.data.expiryDays === '' ? undefined : result.data.expiryDays,
      active: result.data.active,
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await adminService.updateCatalogItem(editingId, payload, role)
        await loadCatalog()
        toast.success('Catalog item updated')
      } else {
        await adminService.addCatalogItem(payload, role)
        await loadCatalog()
        toast.success('Catalog item added')
      }
      resetForm()
    } catch {
      toast.error(editingId ? 'Could not update catalog item' : 'Could not add catalog item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item: RewardItem) => {
    setDeletingId(item.id)
    try {
      await adminService.deleteCatalogItem(item.id, role)
      await loadCatalog()
      if (editingId === item.id) {
        resetForm()
      }
      setConfirmDeleteItem(null)
      toast.success('Catalog item deleted')
    } catch {
      toast.error('Could not delete catalog item')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      <ConfirmDialog
        open={!!confirmDeleteItem}
        onClose={() => setConfirmDeleteItem(null)}
        onConfirm={() => confirmDeleteItem && void handleDelete(confirmDeleteItem)}
        title="Delete Catalog Item"
        message={confirmDeleteItem ? `Delete "${confirmDeleteItem.name}" from the reward catalog?` : ''}
        confirmLabel="Delete"
        loading={confirmDeleteItem ? deletingId === confirmDeleteItem.id : false}
        danger
      />

      <div>
        <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Reward Catalog</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Create reward items for users, including stock, expiry days, cashback value, and tier rules.
        </p>
      </div>

      <div className="grid xl:grid-cols-[420px_minmax(0,1fr)] gap-5">
        <motion.form
          onSubmit={handleSubmit}
          className="card p-5 space-y-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>
              <Icon8 name="rewards" size={20} />
            </div>
            <div>
              <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Edit Catalog Item' : 'Add Catalog Item'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {editingId ? `Editing item #${editingId}` : 'Admin-only reward creation'}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="catalog-name" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Reward Name</label>
            <input id="catalog-name" value={form.name} onChange={e => setField('name', e.target.value)} className="input-field" placeholder="Weekend cashback" />
            {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="catalog-description" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea id="catalog-description" value={form.description} onChange={e => setField('description', e.target.value)} className="input-field min-h-24" placeholder="Describe what the user gets" />
            {errors.description && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.description}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="catalog-type" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Reward Type</label>
              <select id="catalog-type" value={form.type} onChange={e => setField('type', e.target.value as RewardItemType)} className="input-field">
                {(['CASHBACK', 'COUPON', 'VOUCHER'] as const).map(type => <option key={type} value={type}>{rewardTypeLabel[type]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="catalog-points" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Points Required</label>
              <input id="catalog-points" type="number" min={1} value={form.pointsRequired} onChange={e => setField('pointsRequired', e.target.value)} className="input-field" placeholder="250" />
              {errors.pointsRequired && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.pointsRequired}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="catalog-cashback" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Cashback Amount</label>
              <input
                id="catalog-cashback"
                type="number"
                min={1}
                required={form.type === 'CASHBACK'}
                disabled={form.type !== 'CASHBACK'}
                value={form.cashbackAmount}
                onChange={e => setField('cashbackAmount', e.target.value)}
                className="input-field"
                placeholder="100"
              />
              {errors.cashbackAmount && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.cashbackAmount}</p>}
            </div>
            <div>
              <label htmlFor="catalog-stock" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Stock</label>
              <input id="catalog-stock" type="number" min={1} value={form.stock} onChange={e => setField('stock', e.target.value)} className="input-field" placeholder="50" />
              {errors.stock && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.stock}</p>}
            </div>
            <div>
              <label htmlFor="catalog-expiry" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Expiry Days</label>
              <input id="catalog-expiry" type="number" min={1} value={form.expiryDays} onChange={e => setField('expiryDays', e.target.value)} className="input-field" placeholder="30" />
              {errors.expiryDays && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{errors.expiryDays}</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="catalog-tier" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Tier Required</label>
              <select id="catalog-tier" value={form.tierRequired} onChange={e => setField('tierRequired', e.target.value as '' | RewardTier)} className="input-field">
                <option value="">All tiers</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="w-full flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={form.active} onChange={e => setField('active', e.target.checked)} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Active for users</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="flex-1 btn-primary py-3 text-sm">
              {submitting ? (editingId ? 'Saving changes...' : 'Adding item...') : (editingId ? 'Save Changes' : 'Add Catalog Item')}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="flex-1 btn-secondary py-3 text-sm">
                Cancel Edit
              </button>
            )}
          </div>
        </motion.form>

        <motion.div className="card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Existing Catalog</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{items.length} item(s)</p>
            </div>
            <button type="button" onClick={() => void loadCatalog()} className="btn-secondary py-2 px-4 text-xs">Refresh</button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon={<Icon8 name="rewards" size={34} />} title="No catalog items yet" description="Add the first reward item from the form." />
          ) : (
            <div className="space-y-3">
              {items.map(item => {
                const tierStyle = getTierStyle(item.tierRequired)
                return (
                  <div key={item.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{item.name}</h3>
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--brand-light)', color: 'var(--brand)' }}>
                            {rewardTypeLabel[item.type]}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: item.active ? '#dcfce7' : '#fee2e2', color: item.active ? '#15803d' : '#b91c1c' }}>
                            {item.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          {item.tierRequired && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: tierStyle.bg, color: tierStyle.text }}>
                              {item.tierRequired}+
                            </span>
                          )}
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            ID #{item.id}
                          </span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{item.description || 'No description provided.'}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{item.pointsRequired.toLocaleString()} pts</div>
                        {item.cashbackAmount
                          ? <div className="text-xs mt-1" style={{ color: 'var(--brand)' }}>{formatCurrency(item.cashbackAmount)} cashback</div>
                          : null}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3 mt-4 text-xs">
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Stock</div>
                        <div className="font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{item.stock}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Expiry Days</div>
                        <div className="font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{item.expiryDays ?? '-'}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)' }}>Catalog ID</div>
                        <div className="font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>#{item.id}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button type="button" onClick={() => startEdit(item)} className="btn-secondary py-2 px-4 text-xs">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteItem(item)}
                        disabled={deletingId === item.id}
                        className="py-2 px-4 rounded-xl text-xs font-semibold"
                        style={{ background: '#fee2e2', color: '#b91c1c' }}
                      >
                        {deletingId === item.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
