declare global {
  interface Window {
    mlui: {
      window: {
        minimize(): Promise<void>
        toggleMaximize(): Promise<boolean>
        close(): Promise<void>
      }
    }
  }
}

export {}
