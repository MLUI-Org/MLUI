import type { UserProfile } from '../shared/userProfile'

declare global {
  interface Window {
    mlui: {
      profile: {
        load(): Promise<UserProfile>
        save(profile: UserProfile): Promise<UserProfile>
      }
    }
  }
}

export {}
