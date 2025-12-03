# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static HTML website for "우리동네금은방" (Our Neighborhood Gold Shop) - a Korean gold/jewelry marketplace platform. The site allows users to browse gold prices, find nearby jewelry stores, shop for products, and complete purchases.

## Technology Stack

- **HTML5** with Korean language (lang="ko")
- **Tailwind CSS** via CDN (`https://cdn.tailwindcss.com`)
- **Pretendard Font** (Korean web font via CDN)
- **Vanilla JavaScript** for interactions (localStorage-based auth, UI state management)

## File Structure

| File | Purpose |
|------|---------|
| `main.html` | Homepage with hero section, price display, product showcase, store listings |
| `login.html` | Login page with social auth (Kakao, Naver, Google, Apple) and email login |
| `signup.html` | Registration page with step indicators and form validation UI |
| `products.html` | Product listing with category tabs, sidebar filters, pagination |
| `product-detail.html` | Individual product page |
| `cart.html` | Shopping cart with store grouping, quantity controls, price summary |
| `checkout.html` | Checkout flow with address, payment methods, order summary |
| `order-detail.html` | Order confirmation/details |
| `price.html` | Real-time gold price information |
| `stores.html` | Store finder/locator |
| `mypage.html` | User account page |

## Design System

### Tailwind Configuration
Each HTML file includes inline Tailwind config with custom colors:
- `primary: #FFD700` (gold)
- `gray-900: #191F28` (dark text/buttons)
- Social colors: `kakao: #FEE500`, `naver: #03C75A`

### Common CSS Classes
- `.smooth-transition` - Standard 0.2s cubic-bezier transitions
- `.card-shadow` - Subtle box shadows for cards
- `.hover-lift` - translateY hover effect
- `.custom-checkbox` - Custom styled checkboxes
- `.num` - Tabular numeric font variant

### UI Patterns
- Responsive grid layouts (mobile-first with `md:` and `lg:` breakpoints)
- Sticky headers with `z-50`
- Mobile-fixed bottom bars for CTAs
- Korean number formatting with commas (e.g., "1,695,000원")

## Authentication State

Uses localStorage for demo auth state:
- `isLoggedIn` - boolean string
- `userName` - user display name

The `updateAuthUI()` function toggles between `#guest-buttons` and `#user-menu` elements.

## Navigation

All pages share a common header with:
- Logo linking to `main.html`
- Nav links: 금시세 (price.html), 매장찾기 (stores.html), 상품 (products.html), 커뮤니티
- `highlightCurrentPage()` adds active state based on current URL
