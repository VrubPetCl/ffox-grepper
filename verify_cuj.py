import os
import time
from playwright.sync_api import sync_playwright

def run_cuj():
    file_path = f"file://{os.path.abspath('test.html')}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            page.goto(file_path)
            page.wait_for_timeout(500)

            # Inject CSS and JS manually since we are simulating the extension behavior
            page.add_style_tag(path="content.css")
            page.add_script_tag(path="content.js")
            page.wait_for_timeout(500)

            # Toggle the UI
            page.evaluate("window.__wde_toggle()")
            page.wait_for_timeout(500)

            # Inside shadow DOM we have #content
            # Let's interact with it. Since shadow DOM locators work in newer Playwright versions via normal locators:

            # Click 'Select Target'
            page.locator('#wde-root').locator('button:has-text("Select Target")').click()
            page.wait_for_timeout(500)

            # Hover over `.product-card` and click it
            page.locator('.product-card').first.hover()
            page.wait_for_timeout(500)
            page.locator('.product-card').first.click()
            page.wait_for_timeout(500)

            # Now the iteration target is set, let's hover over the path buttons
            page.locator('#wde-root').locator('button.path-btn:has-text("[div.product-card]")').hover()
            page.wait_for_timeout(500)

            # Add Column
            page.locator('#wde-root').locator('button:has-text("+ Add Column")').click()
            page.wait_for_timeout(500)

            # Set name to Title
            page.locator('#wde-root').locator('input[placeholder="Column Name"]').first.fill("Title")

            # Click Select for the first column
            page.locator('#wde-root').locator('button:has-text("Select")').first.click()
            page.wait_for_timeout(500)

            # Click the title inside the product card
            page.locator('.product-card .title').first.hover()
            page.wait_for_timeout(500)
            page.locator('.product-card .title').first.click()
            page.wait_for_timeout(500)

            # Add another column for Link
            page.locator('#wde-root').locator('button:has-text("+ Add Column")').click()
            page.wait_for_timeout(500)

            # Set name to Link
            page.locator('#wde-root').locator('input[placeholder="Column Name"]').nth(1).fill("Link")

            # Click Select for the second column
            page.locator('#wde-root').locator('button:has-text("Select")').nth(1).click()
            page.wait_for_timeout(500)

            # Click the link inside the product card
            page.locator('.product-card .link').first.hover()
            page.wait_for_timeout(500)
            page.locator('.product-card .link').first.click()
            page.wait_for_timeout(500)

            # Change the type to 'href' for the second column
            page.locator('#wde-root').locator('select').nth(1).select_option("href")
            page.wait_for_timeout(500)

            # Click Grab Data
            page.locator('#wde-root').locator('button:has-text("Grab Data")').click()
            page.wait_for_timeout(1000)

            # Final screenshot
            page.screenshot(path="/home/jules/verification/screenshots/verification.png")
            page.wait_for_timeout(1000)
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    run_cuj()
