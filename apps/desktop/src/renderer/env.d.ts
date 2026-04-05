import type { UserProfile } from '../shared/userProfile'

declare global {
  interface Window {
    mlui: {
      profile: {
        load(): Promise<UserProfile>
        save(profile: UserProfile): Promise<UserProfile>
      }
      window: {
        minimize(): Promise<void>
        toggleMaximize(): Promise<boolean>
        close(): Promise<void>
      }
    }
  }
}

export {}
