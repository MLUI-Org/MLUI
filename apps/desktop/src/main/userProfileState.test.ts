import { describe, expect, it } from 'vitest'

import { DEFAULT_USER_PROFILE, type UserProfile } from '../shared/userProfile'
import { loadUserProfile, saveUserProfile } from './userProfileState'

describe('userProfileState', () => {
  it('returns the default profile in stateless mode', () => {
    expect(loadUserProfile()).toEqual(DEFAULT_USER_PROFILE)
  })

  it('returns validated profiles without persisting them', () => {
    const profile: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      displayName: 'Second',
      updatedAt: 2
    }

    expect(saveUserProfile(profile)).toEqual(profile)
    expect(loadUserProfile()).toEqual(DEFAULT_USER_PROFILE)
  })
})
