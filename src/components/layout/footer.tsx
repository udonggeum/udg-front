import Link from "next/link";

const footerLinks = {
  서비스: [
    { label: "금시세", href: "/prices" },
    { label: "매장찾기", href: "/stores" },
    { label: "이벤트", href: "#" },
  ],
  고객지원: [
    { label: "공지사항", href: "#" },
    { label: "자주 묻는 질문", href: "#" },
    { label: "1:1 문의", href: "#" },
  ],
  파트너: [
    { label: "매장 등록", href: "#" },
    { label: "광고 문의", href: "#" },
    { label: "제휴 문의", href: "#" },
  ],
  회사: [
    { label: "회사 소개", href: "#" },
    { label: "채용", href: "#" },
    { label: "블로그", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-100 py-12 px-5">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-[14px] font-semibold text-gray-900 mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-gray-500 hover:text-gray-900 smooth-transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-gray-700">
                우리동네금은방
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="#"
                className="text-[12px] text-gray-500 hover:text-gray-900 smooth-transition"
              >
                이용약관
              </Link>
              <Link
                href="#"
                className="text-[12px] font-semibold text-gray-700 hover:text-gray-900 smooth-transition"
              >
                개인정보처리방침
              </Link>
              <Link
                href="#"
                className="text-[12px] text-gray-500 hover:text-gray-900 smooth-transition"
              >
                위치기반서비스 이용약관
              </Link>
            </div>
          </div>
          <p className="text-[12px] text-gray-400 mt-4">
            © 2024 우리동네금은방. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
