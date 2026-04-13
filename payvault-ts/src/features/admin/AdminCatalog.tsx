import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { adminService } from '../../core/api/adminService'
import { rewardsService } from '../../core/api/rewardsService'
import { useAppSelector, useDebounce } from '../../shared/hooks'
import { EmptyState, Modal, Skeleton, StatusBadge } from '../../shared/components/ui'
import { formatCurrency } from '../../shared/utils'
import type { RewardItem, RewardItemType, RewardTier } from '../../types'
import { Icon8 } from '../../shared/components/Icon8'

type CatalogFormState = {
  name: string
  description: string
  pointsRequired: string
  type: RewardItemType
  cashbackAmount: string
  tierRequired: '' | RewardTier
  stock: string
  active: boolean
}

const emptyForm: CatalogFormState = {
  name: '',
  description: '',
  pointsRequired: '',
  type: 'CASHBACK',
  cashbackAmount: '',
  tierRequired: '',
  stock: '',
  active: true,
}

const typeAccent: Record<RewardItemType, { bg: string; text: string }> = {
  CASHBACK: { bg: '#dcfce7', text: '#15803d' },
  COUPON: { bg: '#ede9fe', text: '#7c3aed' },
  VOUCHER: { bg: '#fef3c7', text: '#b45309' },
}

const toForm = (item: RewardItem): CatalogFormState => ({
  name: item.name ?? '',
  description: item.description ?? '',
  pointsRequired: item.pointsRequired ? String(item.pointsRequired) : '',
  type: item.type,
  cashbackAmount: item.cashbackAmount ? String(item.cashbackAmount) : '',
  tierRequired: item.tierRequired ?? '',
  stock: String(item.stock ?? 0),
  active: item.active,
})

export default function AdminCatalog() {
  const { user } = useAppSelector(s => s.auth)
  const role = user?.role || 'ADMIN'
  const [catalog, setCatalog] = useState<RewardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const query = useDebounce(search, 300)
  const [filterType, setFilterType] = useState<'ALL' | RewardItemType>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RewardItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RewardItem | null>(null)
  const [form, setForm] = useState<CatalogFormState>(emptyForm)

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await rewardsService.catalog()
      setCatalog(data?.data || [])
    } catch {
      toast.error('Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadCatalog() }, [loadCatalog])

  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return catalog.filter(item => {
      const matchesQuery = !normalized
        || item.name.toLowerCase().includes(normalized)
        || (item.description || '').toLowerCase().includes(normalized)
      const matchesType = filterType === 'ALL' || item.type === filterType
      const matchesStatus = statusFilter === 'ALL'
        || (statusFilter === 'ACTIVE' ? item.active : !item.active)
      return matchesQuery && matchesType && matchesStatus
    })
  }, [catalog, filterType, query, statusFilter])

  const openCreate = () => {
    setEditingItem(null)
    setForm(emptyForm)
    setEditorOpen(true)
  }

  const openEdit = (item: RewardItem) => {
    setEditingItem(item)
    setForm(toForm(item))
    setEditorOpen(true)
  }

  const updateForm = <K extends keyof CatalogFormState>(key: K, value: CatalogFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    const pointsRequired = Number(form.pointsRequired)
    const stock = Number(form.stock)
    const cashbackAmount = form.cashbackAmount ? Number(form.cashbackAmount) : undefined

    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!Number.isFinite(pointsRequired) || pointsRequired <= 0) { toast.error('Points must be greater than 0'); return }
    if (!Number.isFinite(stock) || stock < 0) { toast.error('Stock cannot be negative'); return }
    if (form.type === 'CASHBACK' && (!cashbackAmount || cashbackAmount <= 0)) { toast.error('Cashback amount is required'); return }

    const payload: Partial<RewardItem> = {
      name: form.name.trim(),
      description: form.description.trim(),
      pointsRequired,
      type: form.type,
      cashbackAmount: form.type === 'CASHBACK' ? cashbackAmount : undefined,
      tierRequired: form.tierRequired || undefined,
      stock,
      active: form.active,
    }

    setSaving(true)
    try {
      if (editingItem) {
        await adminService.updateCatalogItem(editingItem.id, payload, role)
        toast.success('Catalog item updated')
      } else {
        await adminService.addCatalogItem(payload, role)
        toast.success('Catalog item created')
      }
      setEditorOpen(false)
      setEditingItem(null)
      setForm(emptyForm)
      await loadCatalog()
    } catch {
      toast.error(editingItem ? 'Failed to update catalog item' : 'Failed to create catalog item')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (item: RewardItem) => {
    try {
      await adminService.toggleCatalogItem(item.id, !item.active, role)
      toast.success(item.active ? 'Catalog item disabled' : 'Catalog item enabled')
      await loadCatalog()
    } catch {
      toast.error('Failed to change catalog status')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await adminService.deleteCatalogItem(deleteTarget.id, role)
      toast.success('Catalog item deleted')
      setDeleteTarget(null)
      await loadCatalog()
    } catch {
      toast.error('Failed to delete catalog item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Catalog Management</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Create, edit, activate, and remove reward catalog items for points and cashback.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2 py-2.5 px-4 text-sm">
          <Icon8 name="new" size={16} />
          <span>Add Catalog Item</span>
        </button>
      </div>

      <div className="card p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-[1.7fr_1fr_1fr]">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex pointer-events-none" style={{ color: 'var(--text-muted)' }} aria-hidden="true">
              <Icon8 name="search" size={16} />
            </span>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search catalog by name or description..."
              className="input-field py-2.5 text-sm"
              style={{ paddingLeft: '4rem' }}
              aria-label="Search catalog items"
            />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)} className="input-field py-2.5 text-sm" aria-label="Filter catalog by type">
            <option value="ALL">All types</option>
            <option value="CASHBACK">Cashback</option>
            <option value="COUPON">Coupon</option>
            <option value="VOUCHER">Voucher</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="input-field py-2.5 text-sm" aria-label="Filter catalog by status">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Showing {filteredCatalog.length} of {catalog.length} catalog items.
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)}
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Icon8 name="rewards" size={42} />}
            title="No catalog items found"
            description="Create your first item or change the filters to see more results."
            action={{ label: 'Add item', onClick: openCreate }}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCatalog.map((item, index) => {
            const accent = typeAccent[item.type]
            return (
              <motion.div
                key={item.id}
                className="card overflow-hidden"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: accent.text }}>{item.type}</div>
                      <h3 className="font-display font-bold text-lg mt-1" style={{ color: 'var(--text-primary)' }}>{item.name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={item.active ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                  </div>

                  <p className="text-sm min-h-[2.5rem]" style={{ color: 'var(--text-secondary)' }}>
                    {item.description || 'No description added.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                      <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Points</div>
                      <div className="font-bold text-base mt-1" style={{ color: 'var(--text-primary)' }}>{item.pointsRequired.toLocaleString()}</div>
                    </div>
                    <div className="rounded-2xl p-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                      <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stock</div>
                      <div className="font-bold text-base mt-1" style={{ color: item.stock > 0 ? 'var(--text-primary)' : 'var(--danger)' }}>{item.stock}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {item.type === 'CASHBACK' && (
                      <span className="px-2.5 py-1 rounded-full font-semibold" style={{ background: '#dcfce7', color: '#15803d' }}>
                        Cashback {formatCurrency(item.cashbackAmount || 0)}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full font-semibold" style={{ background: accent.bg, color: accent.text }}>
                      Tier {item.tierRequired || 'SILVER+'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => openEdit(item)} className="btn-secondary py-2.5 text-sm">Edit</button>
                    <button onClick={() => handleToggle(item)} className="btn-secondary py-2.5 text-sm">
                      {item.active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => openEdit(item)} className="btn-primary py-2.5 text-sm col-span-1">Update</button>
                    <button onClick={() => setDeleteTarget(item)} className="btn-danger py-2.5 text-sm col-span-1">Delete</button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => { if (!saving) setEditorOpen(false) }}
        title={editingItem ? 'Update Catalog Item' : 'Create Catalog Item'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Item Name</span>
              <input value={form.name} onChange={e => updateForm('name', e.target.value)} className="input-field py-2.5 text-sm" placeholder="Weekend cashback booster" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Type</span>
              <select value={form.type} onChange={e => updateForm('type', e.target.value as RewardItemType)} className="input-field py-2.5 text-sm">
                <option value="CASHBACK">Cashback</option>
                <option value="COUPON">Coupon</option>
                <option value="VOUCHER">Voucher</option>
              </select>
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Description</span>
              <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} className="input-field min-h-[110px] text-sm" placeholder="Describe the reward, payout, and any restrictions." />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Points Required</span>
              <input type="number" min={1} value={form.pointsRequired} onChange={e => updateForm('pointsRequired', e.target.value)} className="input-field py-2.5 text-sm" placeholder="500" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stock</span>
              <input type="number" min={0} value={form.stock} onChange={e => updateForm('stock', e.target.value)} className="input-field py-2.5 text-sm" placeholder="50" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cashback Amount</span>
              <input type="number" min={0} value={form.cashbackAmount} onChange={e => updateForm('cashbackAmount', e.target.value)} className="input-field py-2.5 text-sm" placeholder={form.type === 'CASHBACK' ? '100' : 'Optional'} disabled={form.type !== 'CASHBACK'} />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tier Required</span>
              <select value={form.tierRequired} onChange={e => updateForm('tierRequired', e.target.value as CatalogFormState['tierRequired'])} className="input-field py-2.5 text-sm">
                <option value="">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
            <input type="checkbox" checked={form.active} onChange={e => updateForm('active', e.target.checked)} />
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Active item</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Inactive items stay in catalog management but are hidden from redemption.</div>
            </div>
          </label>

          <div className="flex justify-end gap-3">
            <button onClick={() => setEditorOpen(false)} className="btn-secondary py-2.5 px-4 text-sm" disabled={saving}>Cancel</button>
            <button onClick={handleSave} className="btn-primary py-2.5 px-4 text-sm" disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteTarget !== null} onClose={() => { if (!saving) setDeleteTarget(null) }} title="Delete Catalog Item" size="sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {deleteTarget ? `Delete "${deleteTarget.name}" from the reward catalog? This action cannot be undone.` : ''}
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary py-2.5 px-4 text-sm" disabled={saving}>Cancel</button>
            <button onClick={handleDelete} className="btn-danger py-2.5 px-4 text-sm" disabled={saving}>
              {saving ? 'Deleting...' : 'Delete Item'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
