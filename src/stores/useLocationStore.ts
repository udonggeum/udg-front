import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { formatLocationForDisplay } from "@/utils/location";

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationState {
  currentLocation: string | null;
  coordinates: Coordinates | null;
  isUsingGPS: boolean;
  lastUpdated: number | null;
}

interface LocationActions {
  setLocationFromGPS: (lat: number, lng: number, address: string) => void;
  setLocationFromAddress: (address: string, lat?: number, lng?: number) => void;
  clearLocation: () => void;
  initializeFromUserAddress: (userAddress?: string) => void;
}

type LocationStore = LocationState & LocationActions;

export const useLocationStore = create<LocationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentLocation: null,
      coordinates: null,
      isUsingGPS: false,
      lastUpdated: null,

      // Actions
      setLocationFromGPS: (lat, lng, address) =>
        set({
          currentLocation: address,
          coordinates: { lat, lng },
          isUsingGPS: true,
          lastUpdated: Date.now(),
        }),

      setLocationFromAddress: (address, lat, lng) =>
        set({
          currentLocation: address,
          coordinates: lat && lng ? { lat, lng } : null,
          isUsingGPS: false,
          lastUpdated: Date.now(),
        }),

      clearLocation: () =>
        set({
          currentLocation: null,
          coordinates: null,
          isUsingGPS: false,
          lastUpdated: null,
        }),

      initializeFromUserAddress: (userAddress) => {
        const state = get();
        // 이미 설정된 위치가 있으면 무시
        if (state.currentLocation) return;

        if (userAddress) {
          const formatted = formatLocationForDisplay(userAddress);
          set({
            currentLocation: formatted,
            coordinates: null,
            isUsingGPS: false,
            lastUpdated: Date.now(),
          });
        }
      },
    }),
    {
      name: "location-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
