import { contextBridge, ipcRenderer } from 'electron'

import type { UserProfile } from '../shared/userProfile'

const desktopApi = {
  profile: {
    load: () => ipcRenderer.invoke('profile:load') as Promise<UserProfile>,
    save: (profile: UserProfile) =>
      ipcRenderer.invoke('profile:save', profile) as Promise<UserProfile>
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
    toggleMaximize: () =>
      ipcRenderer.invoke('window:toggle-maximize') as Promise<boolean>,
    close: () => ipcRenderer.invoke('window:close') as Promise<void>
  }
}

contextBridge.exposeInMainWorld('mlui', desktopApi)
