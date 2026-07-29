from playwright.sync_api import sync_playwright
import sys

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()

    # Log all console messages
    page.on("console", lambda msg: print(f"[BROWSER] {msg.type}: {msg.text}"))

    # Log all requests and their results
    page.on("request", lambda req: print(f"[REQ] {req.method} {req.url}"))
    page.on("requestfailed", lambda req: print(f"[FAIL] {req.url} -> {req.failure}"))
    page.on("response", lambda res: print(f"[RES] {res.status} {res.url}"))

    # Navigate to local app
    page.goto("http://localhost:5173")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="/tmp/debug_login.png", full_page=True)
    print(f"\nCurrent URL: {page.url}")

    # Check if login form is visible
    email_input = page.locator('input[type="email"]')
    print(f"Email input visible: {email_input.is_visible()}")

    browser.close()
