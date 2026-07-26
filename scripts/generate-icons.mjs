import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgBuffer = readFileSync(resolve(__dirname, '..', 'public', 'favicon.svg'))

const sizes = [192, 512]

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(__dirname, '..', 'public', `icon-${size}.png`))
  console.log(`✓ generated icon-${size}.png (${size}×${size})`)
}
