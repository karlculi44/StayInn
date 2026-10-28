import { apiBaseURL } from "../services/api";

const roomImages: Record<string, string> = {
  "Standard Room":
    "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=80",
  "Deluxe Room":
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
  "Family Room":
    "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
  Studio:
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
};

const defaultRoomImage = roomImages["Standard Room"];

export function getRoomTypeImage(
  roomTypeName: string,
  image?: string | null,
) {
  const imageUrl = image?.trim();
  if (imageUrl?.startsWith("/api/room-types/images/")) {
    return apiBaseURL.startsWith("/")
      ? imageUrl
      : `${new URL(apiBaseURL).origin}${imageUrl}`;
  }

  return imageUrl || roomImages[roomTypeName] || defaultRoomImage;
}
