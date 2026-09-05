import type { Member } from "../../types/database";

export const stickyColors = ["#F2D58B", "#B8DCE1"] as const;

export function stickyColorFor(authorId: string, members: Member[]) {
  const ordered = [...members].sort(
    (a, b) =>
      a.joined_at.localeCompare(b.joined_at) || a.user_id.localeCompare(b.user_id),
  );
  const index = ordered.findIndex((member) => member.user_id === authorId);
  return stickyColors[index < 0 ? 0 : index % stickyColors.length];
}
