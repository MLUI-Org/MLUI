import { mkdir, copyFile } from 'node:fs/promises'

const source = new URL('../public/css/litegraph.css', import.meta.url)
const targetDir = new URL('../dist', import.meta.url)
const target = new URL('../dist/litegraph.css', import.meta.url)

await mkdir(targetDir, { recursive: true })
await copyFile(source, target)
