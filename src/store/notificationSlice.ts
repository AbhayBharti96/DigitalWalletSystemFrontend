import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Notification, NotifType } from '../types'

interface NotifState { items: Notification[]; unreadCount: number }

const STORAGE_KEY = 'payvault:notifications'

const saveNotifications = (state: NotifState) => {
  if (typeof globalThis.window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const loadNotifications = (): NotifState => {
  if (typeof globalThis.window === 'undefined') return { items: [], unreadCount: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { items: [], unreadCount: 0 }
    const parsed = JSON.parse(raw) as Partial<NotifState>
    const items = Array.isArray(parsed.items) ? parsed.items : []
    return {
      items,
      unreadCount: items.filter(item => !item.read).length,
    }
  } catch {
    return { items: [], unreadCount: 0 }
  }
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: loadNotifications(),
  reducers: {
    addNotification(state, { payload }: PayloadAction<{ type: NotifType; title: string; message: string }>) {
      state.items.unshift({ id: Date.now(), read: false, time: new Date().toISOString(), ...payload })
      state.unreadCount = state.items.filter(n => !n.read).length
      saveNotifications(state)
    },
    markAllRead(state) {
      state.items.forEach(n => { n.read = true })
      state.unreadCount = 0
      saveNotifications(state)
    },
    markRead(state, { payload }: PayloadAction<number>) {
      const n = state.items.find(n => n.id === payload)
      if (n) n.read = true
      state.unreadCount = state.items.filter(n => !n.read).length
      saveNotifications(state)
    },
    clearAll(state) {
      state.items = []
      state.unreadCount = 0
      saveNotifications(state)
    },
    seedNotifications(state) {
      if (state.items.length === 0) {
        state.items = [
          { id: 1, type: 'success', title: 'Welcome to PayVault!', message: 'Your account is ready. Complete KYC to unlock all features.', read: false, time: new Date().toISOString() },
          { id: 2, type: 'info', title: 'KYC Required', message: 'Submit your KYC documents to unlock wallet features.', read: false, time: new Date(Date.now() - 3600000).toISOString() },
        ]
        state.unreadCount = 2
        saveNotifications(state)
      }
    },
  },
})
export const { addNotification, markAllRead, markRead, clearAll, seedNotifications } = notificationSlice.actions
export default notificationSlice.reducer
