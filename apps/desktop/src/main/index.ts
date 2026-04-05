import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { DEFAULT_USER_PROFILE } from '../shared/userProfile'
import { loadUserProfile, saveUserProfile } from './userProfileState'

const devServerUrl = process.env.MLUI_DESKTOP_DEV_SERVER_URL
let mainWindow: BrowserWindow | null = null

function getLogFilePath() {
  return join(app.getPath('userData'), 'desktop.log')
}

function log(message: string, error?: unknown) {
  const detail = error instanceof Error ? `\n${error.stack ?? error.message}` : ''
  const line = `[${new Date().toISOString()}] ${message}${detail}\n`
  console.log(line.trim())
  if (!app.isReady()) return
  void appendFile(getLogFilePath(), line, 'utf8').catch(() => {})
}

function getPreloadPath() {
  return join(app.getAppPath(), 'dist', 'preload', 'index.cjs')
}

function getRendererIndexPath() {
  return join(app.getAppPath(), 'dist', 'renderer', 'index.html')
}

async function showFatalError(message: string, error?: unknown) {
  const detail =
    error instanceof Error ? error.stack ?? error.message : String(error ?? '')
  const body = `
    <html>
      <body style="margin:0;font-family:ui-monospace,monospace;background:#0f172a;color:#e2e8f0;padding:24px;">
        <h2 style="margin-top:0;">MLUI Desktop failed to start</h2>
        <p>Check the log file for details:</p>
        <pre style="white-space:pre-wrap;background:#020617;padding:16px;border-radius:10px;">${getLogFilePath()}</pre>
        <p>Error:</p>
        <pre style="white-space:pre-wrap;background:#020617;padding:16px;border-radius:10px;">${escapeHtml(
          `${message}\n\n${detail}`.trim()
        )}</pre>
      </body>
    </html>
  `

  if (!mainWindow) {
    mainWindow = new BrowserWindow({
      width: 1100,
      height: 760,
      backgroundColor: '#0f172a',
      autoHideMenuBar: true
    })
  }

  await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(body)}`)
}

async function createWindow() {
  const preloadPath = getPreloadPath()
  const rendererIndexPath = getRendererIndexPath()
  log(`Creating window with preload: ${preloadPath}`)
  log(`Renderer entry: ${rendererIndexPath}`)

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f172a',
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath
    }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    log('Renderer finished load')
  })

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL) => {
      log(
        `Renderer failed to load (${errorCode}) ${errorDescription} @ ${validatedURL}`
      )
    }
  )

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log(`Renderer process gone: ${details.reason}`)
  })

  mainWindow.webContents.on(
    'console-message',
    (_event, level, message, line, sourceId) => {
      if (level >= 2) log(`Renderer console[${level}] ${sourceId}:${line} ${message}`)
    }
  )

  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
    return
  }

  await mainWindow.loadFile(rendererIndexPath)
}

async function bootstrap() {
  await mkdir(app.getPath('userData'), { recursive: true })
  log('Bootstrap start')
  Menu.setApplicationMenu(null)

  ipcMain.handle('profile:load', async () => {
    return loadUserProfile()
  })

  ipcMain.handle('profile:save', async (_, nextProfile) => {
    return saveUserProfile(nextProfile)
  })

  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:toggle-maximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
      return false
    }
    mainWindow.maximize()
    return true
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  await createWindow()
  log(`Stateless profile mode enabled for ${DEFAULT_USER_PROFILE.id}`)
}

process.on('uncaughtException', (error) => {
  log('Uncaught exception', error)
  void showFatalError('Uncaught exception', error)
})

process.on('unhandledRejection', (reason) => {
  log('Unhandled rejection', reason)
  void showFatalError('Unhandled rejection', reason)
})

app.whenReady()
  .then(bootstrap)
  .catch((error) => {
    log('Bootstrap failed', error)
    void showFatalError('Bootstrap failed', error)
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow()
  }
})

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
