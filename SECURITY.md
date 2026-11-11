# Security policy

Reelskin restyles pages on the supported video sites and adds player tools. It has no server and collects nothing,
but it runs on those sites and stores your themes and settings. Please report anything that could let a web page,
a theme file or a backup make Reelskin run code, read data it shouldn't, reach sites beyond its permissions, or leak
what you watch.

## Reporting a vulnerability

**Don't open a public issue.** Use GitHub's private form: the repository's **Security** tab → **Report a
vulnerability**. Include what you found, how to reproduce it, the version (Studio → About) and your browser and OS.

You'll get an answer within 7 days. Fixes are released as soon as they are ready, and you'll be credited in the
release notes unless you prefer otherwise.

## Supported versions

The latest release.

## Design notes

- Everything from storage, backups, theme files and pages is validated (`parseSettings`, `parseTheme`,
  `parseImport`); backdrop pictures must be `data:image/(png|jpeg|webp|gif|avif)` URLs.
- The content script builds its UI with DOM APIs (no `innerHTML`) inside a closed shadow root.
- The service worker fetches stylesheets only for its own content scripts and only from the hosts in `CSS_HOSTS`
  (`src/core/platforms.ts`), and only `text/css` responses.
- What each permission is for: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §5 and [`docs/PRIVACY.md`](docs/PRIVACY.md).

---

**Tiếng Việt:** Đừng báo lỗ hổng bảo mật bằng issue công khai. Hãy dùng biểu mẫu riêng tư của GitHub: tab
**Security** → **Report a vulnerability**, kèm cách tái hiện và phiên bản (Studio → Giới thiệu). Bạn sẽ nhận phản
hồi trong vòng 7 ngày.
