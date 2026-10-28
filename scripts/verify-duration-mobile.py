#!/usr/bin/env python3
"""Phase 1 mobile regression: duration is visible, readable and does not
overflow service cards at narrow viewports.

Prerequisites: `npm run dev` on :3000 and Playwright for Python with Chromium
installed. Run: python3 scripts/verify-duration-mobile.py
"""
import os
import re
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE_URL", "http://localhost:3000")
VIEWPORTS = [(360, 740), (390, 844)]
DURATION_RE = re.compile(r"^\d+\s+(?:Min\.|min)$")


def main() -> int:
    failures = []

    def check(name, condition):
        if condition:
            print(f"ok   {name}")
        else:
            print(f"FAIL {name}")
            failures.append(name)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width, height in VIEWPORTS:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.goto(f"{BASE}/services", wait_until="networkidle")

            names = page.locator("h3.line-clamp-3")
            durations = page.locator("p.text-xs.tabular-nums")
            check(f"{width}px: all 27 service cards rendered", names.count() == 27)
            check(f"{width}px: every card has a duration", durations.count() == 27)

            duration_texts = [durations.nth(i).inner_text().strip() for i in range(durations.count())]
            check(f"{width}px: every duration uses the minutes label",
                  all(DURATION_RE.match(t) for t in duration_texts))

            overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
            check(f"{width}px: /services has no horizontal overflow", not overflow)

            outside = []
            for i in range(durations.count()):
                box = durations.nth(i).bounding_box()
                if not box or box["width"] <= 0 or box["height"] <= 0:
                    outside.append(i)
                elif box["x"] < -1 or box["x"] + box["width"] > width + 1:
                    outside.append(i)
            check(f"{width}px: every duration badge stays inside the viewport", not outside)

            # Booking header (selection -> confirmation entry point).
            page.goto(f"{BASE}/booking/damen-waschen-foehnen-kurz", wait_until="networkidle")
            header = page.locator("p.text-sm.text-muted").first.inner_text()
            check(f"{width}px: booking header shows the duration", bool(re.search(r"·\s*30\s+(?:Min\.|min)", header)))
            overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
            check(f"{width}px: booking page has no horizontal overflow", not overflow)
            page.close()

        browser.close()

    print(f"\n{'PASS' if not failures else 'FAIL'} ({len(failures)} failure(s))")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
