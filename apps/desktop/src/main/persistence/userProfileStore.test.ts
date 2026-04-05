import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { afterEach, describe, expect, it } from 'vitest'

import type { UserProfile } from '../../shared/userProfile'
import { DEFAULT_USER_PROFILE } from '../../shared/userProfile'
import { UserProfileStore } from './userProfileStore'

const createdPaths: string[] = []

async function createStore() {
  const tempDirectory = await mkdtemp(join(tmpdir(), 'mlui-desktop-'))
  createdPaths.push(tempDirectory)
  const store = await UserProfileStore.create(
    join(tempDirectory, 'user-profile.sqlite')
  )
  return { store, tempDirectory }
}

afterEach(async () => {
  await Promise.all(
    createdPaths.splice(0).map((path) => rm(path, { force: true, recursive: true }))
  )
})

describe('UserProfileStore', () => {
  it('returns a default profile before anything is saved', async () => {
    const { store } = await createStore()

    const profile = await store.load()

    expect(profile.id).toBe(DEFAULT_USER_PROFILE.id)
    expect(profile.displayName).toBe(DEFAULT_USER_PROFILE.displayName)

    store.close()
  })

  it('serializes concurrent saves through an Effect semaphore', async () => {
    const { store } = await createStore()

    const firstProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      displayName: 'First',
      updatedAt: 1
    }
    const secondProfile: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      displayName: 'Second',
      updatedAt: 2
    }

    await Promise.all([store.save(firstProfile), store.save(secondProfile)])
    const savedProfile = await store.load()

    expect(savedProfile.displayName).toBe('Second')
    expect(savedProfile.updatedAt).toBe(2)

    store.close()
  })
})
