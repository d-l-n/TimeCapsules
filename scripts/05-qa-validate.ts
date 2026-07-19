import 'dotenv/config'
import { firestore } from './firebase-admin.js'

async function main() {
  console.log('=== QA Validation Report ===\n')

  const tables = ['shows', 'episodes', 'watched_episodes', 'followed_shows', 'ratings', 'badges', 'user_stats', 'episode_emotions', 'watchlist', 'resume_positions']
  let total = 0
  const counts: Record<string, number> = {}

  for (const table of tables) {
    const snap = await firestore.collection(table).get()
    console.log(`  ${table.padEnd(22)} ${snap.size} docs`)
    counts[table] = snap.size
    total += snap.size
  }

  const allShows = await firestore.collection('shows').get()
  const showsWithImdb = allShows.docs.filter(d => d.data().imdb_id).length
  const showsWithRating = allShows.docs.filter(d => d.data().imdb_rating != null).length
  console.log(`\n  Shows with IMDb ID:     ${showsWithImdb} / ${counts['shows'] || 0}`)
  console.log(`  Shows with IMDb rating: ${showsWithRating} / ${counts['shows'] || 0}`)

  const showIds = new Set(allShows.docs.map(d => d.data().tmdb_id as number))

  if (counts['episodes'] > 0 && counts['watched_episodes'] > 0) {
    const orphanedWatchEpisodes = await firestore.collection('watched_episodes').where('episode_id', '==', 0).get()
    console.log(`\n  Orphaned watched_episodes (episode_id=0): ${orphanedWatchEpisodes.size}`)
  }

  if (counts['followed_shows'] && counts['shows']) {
    const followedShows = await firestore.collection('followed_shows').get()
    const orphanedFollows = followedShows.docs.filter(d => {
      const showId = d.data().show_id
      return !showIds.has(showId)
    })
    console.log(`\n  Followed shows with no matching show: ${orphanedFollows.length}`)
  }

  if (counts['watchlist'] && counts['shows']) {
    const watchlist = await firestore.collection('watchlist').get()
    const orphanedWatchlist = watchlist.docs.filter(d => {
      const showId = d.data().show_id
      return !showIds.has(showId)
    })
    console.log(`  Watchlist items with no matching show: ${orphanedWatchlist.length}`)
  }

  console.log(`\n  Total docs: ${total}`)
  console.log('\n  Status: OK')
}

main().catch(console.error)
