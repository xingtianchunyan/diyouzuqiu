from playwright.sync_api import sync_playwright


BASE = "http://localhost:5173"


def ensure_logged_in(page) -> None:
  page.goto(f"{BASE}/media", wait_until="networkidle")
  if "/login" not in page.url:
    return

  page.fill("#email", "admin@diyou.test")
  page.fill("#password", "diyou2024")
  page.click('button[type="submit"]')
  page.wait_for_timeout(1200)


def open_dropdown(page, index: int) -> None:
  page.wait_for_selector(".dropdown-trigger", timeout=15000)
  page.locator(".dropdown-trigger").nth(index).click()
  page.wait_for_timeout(250)


def main() -> None:
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
      viewport={"width": 390, "height": 844},
      device_scale_factor=2,
      is_mobile=True,
      has_touch=True,
    )
    page = context.new_page()

    ensure_logged_in(page)

    page.goto(f"{BASE}/media", wait_until="networkidle")
    open_dropdown(page, 1)
    page.screenshot(path="/workspace/mobile-media.png", full_page=True)

    page.goto(f"{BASE}/people", wait_until="networkidle")
    open_dropdown(page, 0)
    page.screenshot(path="/workspace/mobile-people.png", full_page=True)

    page.goto(f"{BASE}/upload", wait_until="networkidle")
    open_dropdown(page, 0)
    page.screenshot(path="/workspace/mobile-upload.png", full_page=True)

    context.close()
    browser.close()


if __name__ == "__main__":
  main()

