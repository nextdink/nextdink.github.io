/**
 * Avatar wrapper for nextdink
 * Re-exports shared Avatar component with nextdink's default theme
 */
import {
  Avatar as SharedAvatar,
  type AvatarProps,
} from "@shared/components/ui/Avatar";
export type { AvatarProps, AvatarSize } from "@shared/components/ui/Avatar";

// Map old size names to shared component sizes for backwards compatibility
type LegacySize = "xsmall" | "small" | "default" | "large";

interface NextdinkAvatarProps extends Omit<AvatarProps, "size"> {
  size?: LegacySize;
}

const sizeMapping: Record<LegacySize, AvatarProps["size"]> = {
  xsmall: "xs",
  small: "small",
  default: "default",
  large: "large",
};

/**
 * Nextdink Avatar - uses vibrant theme by default
 */
export function Avatar({ size = "default", ...props }: NextdinkAvatarProps) {
  return (
    <SharedAvatar
      theme="vibrant"
      pattern="shapes"
      size={sizeMapping[size]}
      {...props}
    />
  );
}

export default Avatar;
