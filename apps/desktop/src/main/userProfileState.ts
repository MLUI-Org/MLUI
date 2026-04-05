import { Schema } from 'effect'

import {
  DEFAULT_USER_PROFILE,
  type UserProfile,
  UserProfileSchema
} from '../shared/userProfile'

const decodeUserProfile = Schema.decodeUnknownSync(UserProfileSchema)

export function loadUserProfile(): UserProfile {
  return DEFAULT_USER_PROFILE
}

export function saveUserProfile(profileLike: unknown): UserProfile {
  return decodeUserProfile(profileLike)
}
