from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()

    print("=== Testing Groups on Production ===")

    # 1. Navigate to production
    page.goto("https://dc41c4c6.timecapsules.pages.dev")
    page.wait_for_load_state("networkidle")
    print("1. Page title: " + page.title())

    # 2. Try to access /groups without auth (should redirect to login)
    page.goto("https://dc41c4c6.timecapsules.pages.dev/groups")
    page.wait_for_load_state("networkidle")
    print("2. URL after /groups (unauthed): " + page.url)
    assert "/login" in page.url, "Should redirect to login page"
    print("   PASS: Redirects to login")

    # 3. Check login page elements
    email_input = page.locator('input[type="email"]')
    password_input = page.locator('input[type="password"]')
    print("3. Email input visible: " + str(email_input.is_visible()))
    print("   Password input visible: " + str(password_input.is_visible()))
    assert email_input.is_visible(), "Email input should be visible"
    assert password_input.is_visible(), "Password input should be visible"
    print("   PASS: Login form renders correctly")

    # 4. Check Google sign-in
    google_btn = page.get_by_label("Sign in with Google")
    print("4. Google sign-in button visible: " + str(google_btn.is_visible()))
    assert google_btn.is_visible(), "Google button should be visible"
    print("   PASS: Auth page has all expected elements")

    # 5. Navigate to /dashboard (also redirects)
    page.goto("https://dc41c4c6.timecapsules.pages.dev/dashboard")
    page.wait_for_load_state("networkidle")
    print("5. URL after /dashboard (unauthed): " + page.url)
    assert "/login" in page.url, "Should redirect to login page"
    print("   PASS: Dashboard redirects to login")

    # 6. Screenshot
    page.screenshot(path="/tmp/production_login.png", full_page=True)
    print("6. Screenshot saved: /tmp/production_login.png")

    print("\n=== ALL CHECKS PASSED ===")
    browser.close()
