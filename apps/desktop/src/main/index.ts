import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'

import { DEFAULT_USER_PROFILE } from '../shared/userProfile'
import { UserProfileStore } from './persistence/userProfileStore'

const devServerUrl = process.env.MLUI_DESKTOP_DEV_SERVER_URL
let mainWindow: BrowserWindow | null = null
let userProfileStore: UserProfileStore | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f172a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(app.getAppPath(), 'dist', 'preload', 'index.js')
    }
  })

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
    return
  }

  await mainWindow.loadFile(join(app.getAppPath(), 'dist', 'renderer', 'index.html'))
}

async function bootstrap() {
  userProfileStore = await UserProfileStore.create(
    join(app.getPath('userData'), 'mlui-user-profile.sqlite'),
    app.getAppPath()
  )

  ipcMain.handle('profile:load', async () => {
    return (await userProfileStore?.load()) || DEFAULT_USER_PROFILE
  })

  ipcMain.handle('profile:save', async (_, nextProfile) => {
    return (await userProfileStore?.save(nextProfile)) || DEFAULT_USER_PROFILE
  })

  await createWindow()
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow()
  }
})

app.on('before-quit', () => {
  userProfileStore?.close()
})
