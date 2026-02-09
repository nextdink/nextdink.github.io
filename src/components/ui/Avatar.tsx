import { generateAvatarSvg } from '@/utils/avatarUtils';

type AvatarSize = 'small' | 'default' | 'large';

interface AvatarProps {
  /** URL of the user's profile photo (from OAuth provider) */
  src?: string | null;
  /** Alternative prop name for photo URL (alias for src) */
  photoUrl?: string | null;
  /** User ID for generating deterministic avatar when no photo */
  userId?: string;
  /** User's display name for initials on generated avatar */
  displayName?: string | null;
  /** Alt text for the avatar image */
  alt?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  small: 'w-8 h-8',
  default: 'w-10 h-10',
  large: 'w-16 h-16',
};

// SVG sizes for generating avatars at appropriate resolution
const svgSizes: Record<AvatarSize, number> = {
  small: 32,
  default: 40,
  large: 64,
};

export function Avatar({ 
  src, 
  photoUrl,
  userId, 
  displayName,
  alt = 'User', 
  size = 'default', 
  className = '' 
}: AvatarProps) {
  // Use src or photoUrl (photoUrl is an alias for src)
  const imageUrl = src || photoUrl;
  
  // If there's an OAuth photo URL, use it
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={`
          ${sizeStyles[size]}
          rounded-full object-cover
          bg-slate-100 dark:bg-slate-800
          ${className}
        `}
      />
    );
  }

  // Generate deterministic avatar based on user ID with initials
  // Use a fallback ID if none provided (shouldn't happen in practice)
  const effectiveUserId = userId || 'default-user';
  const generatedSrc = generateAvatarSvg(effectiveUserId, displayName, svgSizes[size]);

  return (
    <img
      src={generatedSrc}
      alt={alt}
      className={`
        ${sizeStyles[size]}
        rounded-full
        ${className}
      `}
    />
  );
}