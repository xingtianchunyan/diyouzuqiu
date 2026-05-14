from playwright.sync_api import sync_playwright


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

    page.goto("http://localhost:5173/media", wait_until="networkidle")
    page.screenshot(path="/workspace/mobile-step1.png", full_page=True)

    if "/login" in page.url:
      page.fill("#email", "admin@diyou.test")
      page.fill("#password", "diyou2024")
      page.click('button[type="submit"]')
      page.wait_for_timeout(1200)
      page.screenshot(path="/workspace/mobile-step2-after-login.png", full_page=True)
      page.goto("http://localhost:5173/media", wait_until="networkidle")
      page.screenshot(path="/workspace/mobile-step3-after-media.png", full_page=True)

    page.wait_for_selector(".filters-row", timeout=15000)
    page.wait_for_timeout(300)
    page.locator(".filters-row .dropdown-trigger").nth(1).click()
    page.wait_for_timeout(250)

    page.screenshot(path="/workspace/mobile-media.png", full_page=True)

    context.close()
    browser.close()


if __name__ == "__main__":
  main()
