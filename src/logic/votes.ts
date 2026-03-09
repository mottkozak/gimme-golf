export function resolveMajorityVoteWinnerId(
  votesByVoterId: Record<string, string | null>,
  validPlayerIds: Set<string>,
): string | null {
  const voteCounts: Record<string, number> = {}

  for (const votedPlayerId of Object.values(votesByVoterId)) {
    if (!votedPlayerId || !validPlayerIds.has(votedPlayerId)) {
      continue
    }

    voteCounts[votedPlayerId] = (voteCounts[votedPlayerId] ?? 0) + 1
  }

  const rankedVotes = Object.entries(voteCounts).sort((entryA, entryB) => entryB[1] - entryA[1])
  const topVoteCount = rankedVotes[0]?.[1] ?? 0
  const tieCount = rankedVotes.filter(([, count]) => count === topVoteCount).length

  if (topVoteCount === 0 || tieCount > 1) {
    return null
  }

  return rankedVotes[0]?.[0] ?? null
}
