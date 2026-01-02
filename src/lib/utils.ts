import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 사용자 이미지 URL을 가져옵니다.
 * Admin 사용자의 경우 매장 이미지를 우선 사용하고, 없으면 프로필 이미지를 사용합니다.
 * 일반 사용자는 프로필 이미지를 사용합니다.
 */
export function getUserImageUrl(user: {
  role?: string;
  profile_image?: string;
  store?: { image_url?: string } | null;
}): string | undefined {
  if (user.role === "admin" && user.store?.image_url) {
    return user.store.image_url;
  }
  return user.profile_image;
}

/**
 * 사용자 표시명을 가져옵니다.
 * Admin 사용자이고 매장명이 있으면 매장명을 표시하고, 없으면 닉네임 또는 이름을 표시합니다.
 */
export function getUserDisplayName(user: {
  role?: string;
  nickname?: string;
  name?: string;
  store?: { name?: string } | null;
}): string {
  if (user.role === "admin" && user.store?.name) {
    return user.store.name;
  }
  return user.nickname || user.name || "알 수 없음";
}
