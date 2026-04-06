import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Notification, NotifType } from '../types'

interface NotifState { items: Notification[]; unreadCount: number }

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0 } as NotifState,
  reducers: {
    addNotification(state, { payload }: PayloadAction<{ type: NotifType; title: string; message: string }>) {
      state.items.unshift({ id: Date.now(), read: false, time: new Date().toISOString(), ...payload })
      state.unreadCount = state.items.filter(n => !n.read).length
    },
    markAllRead(state) { state.items.forEach(n => { n.read = true }); state.unreadCount = 0 },
    markRead(state, { payload }: PayloadAction<number>) {
      const n = state.items.find(n => n.id === payload)
      if (n) n.read = true
      state.unreadCount = state.items.filter(n => !n.read).length
    },
    clearAll(state) { state.items = []; state.unreadCount = 0 },
    seedNotifications(state) {
      if (state.items.length === 0) {
        state.items = [
          { id: 1, type: 'success', title: 'Welcome to PayVault!', message: 'Your account is ready. Complete KYC to unlock all features.', read: false, time: new Date().toISOString() },
          { id: 2, type: 'info', title: 'KYC Required', message: 'Submit your KYC documents to unlock wallet features.', read: false, time: new Date(Date.now() - 3600000).toISOString() },
        ]
        state.unreadCount = 2
      }
    },
  },
})
export const { addNotification, markAllRead, markRead, clearAll, seedNotifications } = notificationSlice.actions
export default notificationSlice.reducer
