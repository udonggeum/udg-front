import { useKakaoLoader as useKakaoLoaderOrigin } from "react-kakao-maps-sdk";

export default function useKakaoLoader() {
  useKakaoLoaderOrigin({
    appkey: "4a5dd8cf96499bba011844ec47091c0f",
    libraries: ["services"],
  });
}
