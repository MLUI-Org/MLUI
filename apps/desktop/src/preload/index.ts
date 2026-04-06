import { contextBridge, ipcRenderer } from 'electron'

const desktopApi = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
    toggleMaximize: () =>
      ipcRenderer.invoke('window:toggle-maximize') as Promise<boolean>,
    close: () => ipcRenderer.invoke('window:close') as Promise<void>
  },
  workflow: {
    writePython: (content: string) =>
      ipcRenderer.invoke('workflow:write-python', content) as Promise<string>
  }
}

contextBridge.exposeInMainWorld('mlui', desktopApi)
