import { useState } from "react";
import { apiBaseURL } from "../../services/api";

type ProfileAvatarProps = {
  profilePictureUrl: string | null;
  initials?: string;
  className?: string;
};

export default function ProfileAvatar({
  profilePictureUrl,
  initials,
  className = "size-9",
}: ProfileAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  let imageUrl: string | null = null;
  if (profilePictureUrl) {
    try {
      imageUrl = new URL(
        profilePictureUrl,
        new URL(apiBaseURL, window.location.origin),
      ).toString();
    } catch {
      imageUrl = null;
    }
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-sage/10 text-sage ${className}`}
    >
      {imageUrl && failedUrl !== profilePictureUrl ? (
        <img
          src={imageUrl}
          alt=""
          crossOrigin={imageUrl.startsWith("blob:") ? undefined : "use-credentials"}
          onError={() => setFailedUrl(profilePictureUrl)}
          className="size-full object-cover"
        />
      ) : initials ? (
        <span className="text-xs font-semibold uppercase">{initials}</span>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-1/2"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.5 20a6.5 6.5 0 0 1 13 0"
          />
        </svg>
      )}
    </span>
  );
}
