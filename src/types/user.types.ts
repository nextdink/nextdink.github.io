export interface User {
  id: string;
  displayName: string;
  /**
   * Photo URL from OAuth provider (Google, Microsoft).
   * For users without an OAuth photo, a deterministic avatar is generated
   * client-side based on the user ID using the avatarUtils.
   */
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  displayName: string;
  /**
   * Photo URL from OAuth provider (Google, Microsoft).
   * For users without an OAuth photo, a deterministic avatar is generated
   * client-side based on the user ID using the avatarUtils.
   */
  photoUrl: string | null;
}