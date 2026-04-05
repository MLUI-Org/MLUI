import { contextBridge, ipcRenderer } from 'electron'

import type { UserProfile } from '../shared/userProfile'

const desktopApi = {
  profile: {
    load: () => ipcRenderer.invoke('profile:load') as Promise<UserProfile>,
    save: (profile: UserProfile) =>
      ipcRenderer.invoke('profile:save', profile) as Promise<UserProfile>
  }
}

contextBridge.exposeInMainWorld('mlui', desktopApi)
