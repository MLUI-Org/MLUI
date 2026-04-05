import { copyFile, mkdir } from 'node:fs/promises'

const source = new URL(
  '../../../node_modules/.bun/sql.js@1.14.1/node_modules/sql.js/dist/sql-wasm.wasm',
  import.meta.url
)
const targetDirectory = new URL('../dist', import.meta.url)
const target = new URL('../dist/sql-wasm.wasm', import.meta.url)

await mkdir(targetDirectory, { recursive: true })
await copyFile(source, target)
