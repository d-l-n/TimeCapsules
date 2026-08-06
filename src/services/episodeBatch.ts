import { addWatchedEpisode, batchUpdateStats } from './showService'
import { createGroupWatchEvent } from './groupService'

/**
 * Marks a batch of resolved episode ids as watched: writes to Firestore,
 * updates stats and (optionally) emits group watch events.
 * Shared by catch-up and mark-season-as-watched flows.
 */
export async function applyWatchedBatch(uid: string, showId: number, realIds: number[], groupId?: string | null) {
  await Promise.all(realIds.map(realId => addWatchedEpisode(uid, realId, showId)))
  await batchUpdateStats(uid, realIds.length)
  if (groupId) {
    await Promise.all(realIds.map(realId => createGroupWatchEvent(groupId, realId, showId, uid)))
  }
}
