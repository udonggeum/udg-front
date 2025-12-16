import { useEffect } from "react";
import { useKakaoLoader as useKakaoLoaderOrigin } from "react-kakao-maps-sdk";

export default function useKakaoLoader() {
  const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || "4a5dd8cf96499bba011844ec47091c0f";

  useKakaoLoaderOrigin({
    appkey,
    libraries: ["services", "clusterer"],
    retries: 3,
  });

  // SDK 로딩 에러 감지
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.target instanceof HTMLScriptElement && e.target.src.includes("dapi.kakao.com")) {
        console.error("❌ Failed to load Kakao Maps SDK:", e.target.src);
        console.error("   Check your network connection and Kakao Maps API key");
      }
    };

    window.addEventListener("error", handleError, true);

    return () => {
      window.removeEventListener("error", handleError, true);
    };
  }, []);
}
