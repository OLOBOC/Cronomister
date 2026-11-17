import { Match } from '@/types';

export function mergeTeamMatches(
  localMatches: Match[],
  teamId: string,
  cloudMatches: Match[] | undefined
): Match[] {
  if (!cloudMatches) return localMatches;

  const otherTeamMatches = localMatches.filter((match) => match.teamId !== teamId);
  const teamMatches = new Map(
    localMatches
      .filter((match) => match.teamId === teamId)
      .map((match) => [match.id, match])
  );

  cloudMatches
    .filter((match) => match.teamId === teamId)
    .forEach((match) => {
      teamMatches.set(match.id, match);
    });

  return [...otherTeamMatches, ...teamMatches.values()];
}
