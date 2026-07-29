import fs from 'fs'
import path from 'path'
import { createGunzip } from 'zlib'
import { createReadStream } from 'fs'
import { parse } from 'csv-parse'
import 'dotenv/config'
import { firestore } from './firebase-admin.js'

async function download(url: string, dest: string) {
  if (fs.existsSync(dest)) { console.log(`  Already exists: ${dest}`); return }
  console.log(`  Downloading...`)
  const res = await fetch(url)
  const buffer = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buffer)
}

function parseTsvGz<T>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const results: T[] = []
    createReadStream(filePath).pipe(createGunzip())
      .pipe(parse({ delimiter: '\t', columns: true, relaxColumnCount: true }))
      .on('data', (r: T) => results.push(r))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

async function main() {
  const DATA_DIR = './imdb_data'
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

  const ratingsPath = path.join(DATA_DIR, 'title.ratings.tsv.gz')
  await download('https://datasets.imdbws.com/title.ratings.tsv.gz', ratingsPath)

  const ratings = await parseTsvGz<{ tconst: string; averageRating: string; numVotes: string }>(ratingsPath)
  const ratingMap = new Map(ratings.map(r => [r.tconst, { imdb_rating: parseFloat(r.averageRating), imdb_votes: parseInt(r.numVotes) }]))
  console.log(`Parsed ${ratings.length} ratings`)

  const allShows = await firestore.collection('shows').get()
  let updated = 0
  for (const doc of allShows.docs) {
    const data = doc.data()
    if (data.imdb_rating !== null || !data.imdb_id) continue
    const imdb = ratingMap.get(data.imdb_id as string)
    if (!imdb) continue
    await doc.ref.update({ imdb_rating: imdb.imdb_rating, imdb_votes: imdb.imdb_votes })
    updated++
  }
  console.log(`Updated ${updated} shows`)
}

main().catch(console.error)
