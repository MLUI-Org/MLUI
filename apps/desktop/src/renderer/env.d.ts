declare global {
  interface Window {
    __MLUI_GRAPH_STATE_JSON__?: string
    mlui: {
      window: {
        minimize(): Promise<void>
        toggleMaximize(): Promise<boolean>
        close(): Promise<void>
      }
      workflow: {
        writePython(content: string): Promise<string>
      }
    }
  }
}

export {}
