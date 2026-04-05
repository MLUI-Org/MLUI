import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { Effect, Schema } from 'effect'
import initSqlJs from 'sql.js'

import {
  DEFAULT_USER_PROFILE,
  type UserProfile,
  UserProfileSchema
} from '../../shared/userProfile'

const decodeUserProfile = Schema.decodeUnknownSync(UserProfileSchema)

export class UserProfileStore {
  private readonly gate = Effect.runSync(Effect.makeSemaphore(1))

  private constructor(
    private readonly dbPath: string,
    private readonly db: any
  ) {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        last_graph_name TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
  }

  static async create(dbPath: string, assetBasePath = process.cwd()) {
    await mkdir(dirname(dbPath), { recursive: true })

    const SQL = await initSqlJs({
      locateFile: () => join(assetBasePath, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    })

    const db = (await fileExists(dbPath))
      ? new SQL.Database(new Uint8Array(await readFile(dbPath)))
      : new SQL.Database()

    return new UserProfileStore(dbPath, db)
  }

  async load(): Promise<UserProfile> {
    return this.runExclusive(() => {
      const result = this.db.exec(
        `
          SELECT
            id,
            display_name AS displayName,
            last_graph_name AS lastGraphName,
            updated_at AS updatedAt
          FROM user_profile
          WHERE id = ?
        `,
        [DEFAULT_USER_PROFILE.id]
      )

      const row = result[0]?.values?.[0]
      if (!row) return DEFAULT_USER_PROFILE

      return decodeUserProfile({
        id: row[0],
        displayName: row[1],
        lastGraphName: row[2],
        updatedAt: row[3]
      })
    })
  }

  async save(profileLike: unknown): Promise<UserProfile> {
    return this.runExclusive(async () => {
      const profile = decodeUserProfile(profileLike)

      this.db.run(
        `
          INSERT INTO user_profile (
            id,
            display_name,
            last_graph_name,
            updated_at
          ) VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            display_name = excluded.display_name,
            last_graph_name = excluded.last_graph_name,
            updated_at = excluded.updated_at
        `,
        [
          profile.id,
          profile.displayName,
          profile.lastGraphName,
          profile.updatedAt
        ]
      )

      await writeFile(this.dbPath, Buffer.from(this.db.export()))

      return profile
    })
  }

  close() {
    this.db.close?.()
  }

  private runExclusive<T>(task: () => T | Promise<T>): Promise<T> {
    return Effect.runPromise(
      this.gate.withPermits(1)(Effect.promise(() => Promise.resolve(task())))
    )
  }
}

async function fileExists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
