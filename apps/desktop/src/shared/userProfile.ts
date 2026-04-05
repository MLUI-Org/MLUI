import { Schema } from 'effect'

export type UserProfile = {
  id: string
  displayName: string
  lastGraphName: string
  updatedAt: number
}

export const UserProfileSchema = Schema.Struct({
  id: Schema.String,
  displayName: Schema.String,
  lastGraphName: Schema.String,
  updatedAt: Schema.Number
})

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'default',
  displayName: 'Alexis',
  lastGraphName: 'Getting Started',
  updatedAt: Date.now()
}
