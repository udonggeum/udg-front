# 웹뷰 연동 가이드 (네이티브 개발자용)

## 개요

이 문서는 "우리동네금은방" 웹 애플리케이션을 네이티브 앱에 웹뷰로 통합하는 방법을 설명합니다.
웹 애플리케이션은 기존 웹 환경과 호환성을 유지하면서, 앱 환경에서 추가 기능을 제공하도록 설계되었습니다.

## 1. 웹뷰 설정

### iOS (WKWebView)

```swift
import WebKit

class ViewController: UIViewController, WKScriptMessageHandler {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        let config = WKWebViewConfiguration()
        let contentController = WKUserContentController()

        // JavaScript -> Native 메시지 핸들러 등록
        contentController.add(self, name: "reactNative")
        config.userContentController = contentController

        // Safe Area 대응
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // URL 로드
        let url = URL(string: "https://your-domain.com")!
        webView.load(URLRequest(url: url))

        view.addSubview(webView)
    }

    // Native -> JavaScript 메시지 전송
    func sendMessageToWeb(type: String, data: [String: Any]?) {
        let message = ["type": type, "data": data ?? [:]] as [String : Any]
        if let jsonData = try? JSONSerialization.data(withJSONObject: message),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            webView.evaluateJavaScript("window.postMessage('\(jsonString)', '*')")
        }
    }

    // JavaScript -> Native 메시지 수신
    func userContentController(_ userContentController: WKUserContentController,
                                didReceive message: WKScriptMessage) {
        guard let dict = message.body as? [String: Any],
              let type = dict["type"] as? String else { return }

        switch type {
        case "EXIT_APP":
            // 앱 종료 처리
            exit(0)
        case "PICK_IMAGE":
            // 이미지 선택기 표시
            showImagePicker(options: dict["data"] as? [String: Any])
        default:
            break
        }
    }
}
```

### Android (WebView)

```kotlin
import android.webkit.WebView
import android.webkit.WebChromeClient
import android.webkit.JavascriptInterface
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
            }

            // JavaScript 인터페이스 추가
            addJavascriptInterface(WebAppInterface(), "ReactNativeWebView")

            webChromeClient = WebChromeClient()

            // URL 로드
            loadUrl("https://your-domain.com")
        }

        setContentView(webView)
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun postMessage(jsonString: String) {
            val json = JSONObject(jsonString)
            val type = json.getString("type")

            when (type) {
                "EXIT_APP" -> finish()
                "PICK_IMAGE" -> {
                    val options = json.optJSONObject("data")
                    showImagePicker(options)
                }
            }
        }
    }

    // Native -> JavaScript 메시지 전송
    fun sendMessageToWeb(type: String, data: JSONObject?) {
        val message = JSONObject().apply {
            put("type", type)
            put("data", data ?: JSONObject())
        }

        runOnUiThread {
            webView.evaluateJavascript(
                "window.postMessage('${message}', '*')",
                null
            )
        }
    }

    // 뒤로가기 처리
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            // 웹에 뒤로가기 이벤트 전송
            sendMessageToWeb("BACK_BUTTON", null)
        }
    }
}
```

## 2. 메시지 프로토콜

### JavaScript → Native (웹 → 앱)

웹에서 네이티브로 전송하는 메시지 타입:

```typescript
{
  type: "EXIT_APP",           // 앱 종료 요청
  data: {}
}

{
  type: "PICK_IMAGE",         // 이미지 선택
  data: {
    multiple: true,           // 다중 선택 허용
    maxFiles: 5               // 최대 파일 수
  }
}

{
  type: "SHARE",              // 공유하기
  data: {
    title: "제목",
    text: "내용",
    url: "https://..."
  }
}

{
  type: "OPEN_EXTERNAL",      // 외부 브라우저 열기
  data: {
    url: "https://..."
  }
}

{
  type: "HAPTIC_FEEDBACK",    // 햅틱 피드백
  data: {
    style: "light" | "medium" | "heavy"
  }
}

{
  type: "SET_STATUS_BAR",     // 상태바 설정
  data: {
    style: "light" | "dark",
    backgroundColor: "#FFFFFF"
  }
}
```

### Native → JavaScript (앱 → 웹)

네이티브에서 웹으로 전송하는 메시지 타입:

```typescript
{
  type: "BACK_BUTTON",        // 뒤로가기 버튼 클릭
  data: {}
}

{
  type: "APP_STATE_CHANGE",   // 앱 상태 변경
  data: {
    state: "active" | "background" | "inactive"
  }
}

{
  type: "IMAGE_SELECTED",     // 이미지 선택 완료
  data: {
    images: [
      {
        uri: "file://...",
        name: "image.jpg",
        type: "image/jpeg",
        size: 12345
      }
    ]
  }
}

{
  type: "KEYBOARD_SHOW",      // 키보드 표시
  data: {
    height: 300
  }
}

{
  type: "KEYBOARD_HIDE",      // 키보드 숨김
  data: {}
}

{
  type: "DEEP_LINK",          // 딥링크 진입
  data: {
    url: "myapp://community/posts/123/slug"
  }
}
```

## 3. Safe Area 처리

### iOS

```swift
// Safe Area Inset 정보를 웹에 전달
override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()

    let safeArea = view.safeAreaInsets
    let script = """
        document.documentElement.style.setProperty('--safe-area-inset-top', '\(safeArea.top)px');
        document.documentElement.style.setProperty('--safe-area-inset-bottom', '\(safeArea.bottom)px');
        document.documentElement.style.setProperty('--safe-area-inset-left', '\(safeArea.left)px');
        document.documentElement.style.setProperty('--safe-area-inset-right', '\(safeArea.right)px');
    """

    webView.evaluateJavaScript(script)
}
```

### Android

```kotlin
override fun onApplyWindowInsets(insets: WindowInsets): WindowInsets {
    val systemBars = insets.getInsets(WindowInsets.Type.systemBars())

    val script = """
        document.documentElement.style.setProperty('--safe-area-inset-top', '${systemBars.top}px');
        document.documentElement.style.setProperty('--safe-area-inset-bottom', '${systemBars.bottom}px');
        document.documentElement.style.setProperty('--safe-area-inset-left', '${systemBars.left}px');
        document.documentElement.style.setProperty('--safe-area-inset-right', '${systemBars.right}px');
    """.trimIndent()

    webView.evaluateJavascript(script, null)

    return super.onApplyWindowInsets(insets)
}
```

## 4. 앱 라이프사이클 통합

### iOS

```swift
override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)

    NotificationCenter.default.addObserver(
        self,
        selector: #selector(appDidBecomeActive),
        name: UIApplication.didBecomeActiveNotification,
        object: nil
    )

    NotificationCenter.default.addObserver(
        self,
        selector: #selector(appDidEnterBackground),
        name: UIApplication.didEnterBackgroundNotification,
        object: nil
    )
}

@objc func appDidBecomeActive() {
    sendMessageToWeb(type: "APP_STATE_CHANGE", data: ["state": "active"])
}

@objc func appDidEnterBackground() {
    sendMessageToWeb(type: "APP_STATE_CHANGE", data: ["state": "background"])
}
```

### Android

```kotlin
override fun onResume() {
    super.onResume()
    sendMessageToWeb("APP_STATE_CHANGE", JSONObject().apply {
        put("state", "active")
    })
}

override fun onPause() {
    super.onPause()
    sendMessageToWeb("APP_STATE_CHANGE", JSONObject().apply {
        put("state", "background")
    })
}
```

## 5. 키보드 처리

### iOS

```swift
override func viewDidLoad() {
    super.viewDidLoad()

    NotificationCenter.default.addObserver(
        self,
        selector: #selector(keyboardWillShow),
        name: UIResponder.keyboardWillShowNotification,
        object: nil
    )

    NotificationCenter.default.addObserver(
        self,
        selector: #selector(keyboardWillHide),
        name: UIResponder.keyboardWillHideNotification,
        object: nil
    )
}

@objc func keyboardWillShow(notification: Notification) {
    if let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect {
        sendMessageToWeb(type: "KEYBOARD_SHOW", data: ["height": keyboardFrame.height])
    }
}

@objc func keyboardWillHide(notification: Notification) {
    sendMessageToWeb(type: "KEYBOARD_HIDE", data: [:])
}
```

### Android

```kotlin
window.decorView.viewTreeObserver.addOnGlobalLayoutListener {
    val rect = Rect()
    window.decorView.getWindowVisibleDisplayFrame(rect)

    val screenHeight = window.decorView.height
    val keyboardHeight = screenHeight - rect.bottom

    if (keyboardHeight > 200) { // 키보드 표시됨
        sendMessageToWeb("KEYBOARD_SHOW", JSONObject().apply {
            put("height", keyboardHeight)
        })
    } else { // 키보드 숨김
        sendMessageToWeb("KEYBOARD_HIDE", JSONObject())
    }
}
```

## 6. 이미지 선택 구현 예시

### iOS

```swift
func showImagePicker(options: [String: Any]?) {
    let multiple = options?["multiple"] as? Bool ?? false
    let maxFiles = options?["maxFiles"] as? Int ?? 1

    let picker = PHPickerViewController(configuration: {
        var config = PHPickerConfiguration()
        config.selectionLimit = multiple ? maxFiles : 1
        config.filter = .images
        return config
    }())

    picker.delegate = self
    present(picker, animated: true)
}

func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)

    var images: [[String: Any]] = []

    for result in results {
        result.itemProvider.loadFileRepresentation(forTypeIdentifier: "public.image") { url, error in
            if let url = url {
                images.append([
                    "uri": url.absoluteString,
                    "name": url.lastPathComponent,
                    "type": "image/jpeg"
                ])

                if images.count == results.count {
                    self.sendMessageToWeb(type: "IMAGE_SELECTED", data: ["images": images])
                }
            }
        }
    }
}
```

### Android

```kotlin
private val pickImageLauncher = registerForActivityResult(
    ActivityResultContracts.PickMultipleVisualMedia()
) { uris ->
    val images = uris.map { uri ->
        JSONObject().apply {
            put("uri", uri.toString())
            put("name", getFileName(uri))
            put("type", contentResolver.getType(uri))
        }
    }

    sendMessageToWeb("IMAGE_SELECTED", JSONObject().apply {
        put("images", JSONArray(images))
    })
}

fun showImagePicker(options: JSONObject?) {
    val maxFiles = options?.optInt("maxFiles", 1) ?: 1
    pickImageLauncher.launch(PickVisualMediaRequest(
        ActivityResultContracts.PickVisualMedia.ImageOnly
    ))
}
```

## 7. 딥링크 처리

### iOS

```swift
func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }

    sendMessageToWeb(type: "DEEP_LINK", data: ["url": url.absoluteString])
}
```

### Android

```kotlin
override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)

    intent?.data?.let { uri ->
        sendMessageToWeb("DEEP_LINK", JSONObject().apply {
            put("url", uri.toString())
        })
    }
}
```

## 8. 테스트

### 웹뷰 환경 테스트 방법

1. **User Agent 확인**
   ```javascript
   // 브라우저 개발자 도구 콘솔에서
   navigator.userAgent
   ```

2. **웹뷰 감지 확인**
   ```javascript
   // src/lib/webview.ts의 isWebView() 함수 사용
   import { isWebView, getWebViewType } from '@/lib/webview';
   console.log('Is WebView:', isWebView());
   console.log('WebView Type:', getWebViewType());
   ```

3. **Safe Area 확인**
   ```javascript
   // 브라우저 개발자 도구 콘솔에서
   getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')
   ```

## 9. 주의사항

1. **기존 웹 호환성**: 모든 앱뷰 기능은 웹 환경에서도 안전하게 동작합니다.
2. **에러 처리**: 네이티브 브릿지 통신 실패 시 웹은 정상 동작을 유지합니다.
3. **메시지 파싱**: JSON 파싱 실패 시 무시되도록 구현되어 있습니다.
4. **Performance**: WebSocket 연결은 앱 라이프사이클에 맞춰 자동으로 관리됩니다.

## 10. 문의

웹뷰 통합 관련 문의사항이 있으시면 웹 개발팀에 연락해주세요.
