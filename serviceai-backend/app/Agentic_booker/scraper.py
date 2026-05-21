

"""
Google Business Scraper — click card → click Reviews row → scroll & parse
--------------------------------------------------------------------------
Usage:
    python scraper.py "electrician" "Lahore"
    python scraper.py "plumber" "Karachi" --results 10 --reviews 20 --out ./output
    python scraper.py "electrician" "Lahore" --headless
"""

import os
import re
import time
import random
import argparse
from datetime import datetime
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException, NoSuchElementException, StaleElementReferenceException
)

# ── constants ─────────────────────────────────────────────────────────────────

EMAIL_RE    = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
PHONE_RE    = re.compile(r'(\+?[\d][\d\s\-().]{6,}[\d])')
JUNK_EMAILS = ('example', 'noreply', 'no-reply', 'sentry', 'test@',
               'youremail', 'email@', 'user@', 'domain', 'yoursite')

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept-Language': 'en-US,en;q=0.9',
}


# ── helpers ───────────────────────────────────────────────────────────────────

def pause(lo: float = 1.5, hi: float = 3.5):
    time.sleep(random.uniform(lo, hi))


def clean_phones(raw: list) -> list:
    out = set()
    for p in raw:
        digits_only = re.sub(r'\D', '', p)
        if 7 <= len(digits_only) <= 15:
            out.add(re.sub(r'[\s\-().]+', '', p))
    return list(out)


def parse_emails(html: str) -> list:
    found = EMAIL_RE.findall(html)
    return [e for e in set(found)
            if not any(j in e.lower() for j in JUNK_EMAILS)]


def parse_phones(text: str) -> list:
    return clean_phones(PHONE_RE.findall(text))


def fetch_website_emails(url: str) -> list:
    emails = []
    for path in ['', '/contact', '/contact-us', '/about', '/about-us']:
        try:
            r = requests.get(url.rstrip('/') + path, headers=HEADERS, timeout=10)
            emails.extend(parse_emails(r.text))
            if emails:
                break
        except Exception:
            pass
    return list(set(emails))


# ── driver ────────────────────────────────────────────────────────────────────

def get_chrome_major_version() -> int:
    import platform
    if platform.system() == "Windows":
        try:
            import winreg
            reg_paths = [
                (winreg.HKEY_CURRENT_USER, r"Software\Google\Chrome\BLBeacon"),
                (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Google Chrome"),
                (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Google Chrome")
            ]
            for hkey, path in reg_paths:
                try:
                    key = winreg.OpenKey(hkey, path)
                    value, _ = winreg.QueryValueEx(key, "version" if "BLBeacon" in path else "DisplayVersion")
                    if value:
                        return int(value.split('.')[0])
                except Exception:
                    pass
        except Exception:
            pass
        return 148  # Default known version from tracebacks
    return None

def make_driver(headless: bool = False) -> uc.Chrome:
    opts = uc.ChromeOptions()
    opts.add_argument('--lang=en-US')
    opts.add_argument('--no-first-run')
    opts.add_argument('--no-default-browser-check')
    opts.add_argument('--window-size=1400,900')
    opts.add_argument('--disable-notifications')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--disable-dev-shm-usage')
    opts.add_argument('--disable-gpu')
    # Opened visibly as requested so you can monitor progress.
    if headless:
        opts.add_argument('--headless=new')
    
    v_main = get_chrome_major_version()
    print(f"[scraper] Detected Chrome major version: {v_main}")
    try:
        return uc.Chrome(options=opts, use_subprocess=False, version_main=v_main)
    except Exception as e:
        print(f"[scraper] uc.Chrome init failed with version_main={v_main}: {e}. Retrying without version_main...")
        try:
            return uc.Chrome(options=opts, use_subprocess=False)
        except Exception as e2:
            print(f"[scraper] uc.Chrome fallback failed: {e2}. Attempting simple selenium chrome driver...")
            from selenium import webdriver
            from selenium.webdriver.chrome.options import Options
            co = Options()
            co.add_argument('--headless')
            co.add_argument('--no-sandbox')
            co.add_argument('--disable-dev-shm-usage')
            co.add_argument('--disable-gpu')
            return webdriver.Chrome(options=co)


def dismiss_consent(driver):
    for label in ('Accept all', 'I agree', 'Accept'):
        try:
            btn = driver.find_element(
                By.XPATH, f'//button[normalize-space()="{label}"]'
            )
            btn.click()
            pause(0.8, 1.5)
            return
        except Exception:
            pass


# ── Google search ─────────────────────────────────────────────────────────────

def google_search(driver, query: str) -> str:
    url = f'https://www.google.com/search?q={quote_plus(query)}&hl=en&gl=us&tbm=lcl'
    driver.get(url)
    pause(2, 4)
    dismiss_consent(driver)
    pause(1, 2)
    return url


# ── local-pack card list ──────────────────────────────────────────────────────

def get_business_card_elements(driver) -> list:
    """Return clickable Local Pack list items."""
    selectors = [
        'div.VkpGBb',
        'div.rl_li',
        'div.rllt__details',
        'div[jscontroller][data-cid]',
        '[data-cid]',
        'a.vw6aTb',
        'div.uMdZh',
        'div.cXedhc',
    ]
    for sel in selectors:
        try:
            cards = driver.find_elements(By.CSS_SELECTOR, sel)
            if len(cards) >= 2:
                print(f'    [cards] selector "{sel}" -> {len(cards)} cards')
                return cards
        except Exception:
            pass
    return []


def quick_info_from_card(card_el) -> dict:
    info = {'name': '', 'rating': '', 'review_count': '',
            'address': '', 'phone': ''}
    try:
        soup = BeautifulSoup(card_el.get_attribute('outerHTML'), 'html.parser')
        for ns in ['div.dbg0pd', 'span.OSrXXb', 'div[role="heading"]',
                   '.rllt__details div:first-child', 'span.e5s1Wf',
                   'div.fontHeadlineSmall']:
            el = soup.select_one(ns)
            if el and el.text.strip():
                info['name'] = el.text.strip()
                break
        phones = parse_phones(soup.get_text())
        if phones:
            info['phone'] = phones[0]
    except Exception:
        pass
    return info


# ── detail panel ─────────────────────────────────────────────────────────────

def wait_for_detail_panel(driver, timeout: int = 8) -> bool:
    """Wait for the right-side detail panel."""
    # Check for the tab bar (Overview/Reviews/Photos)
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((
                By.XPATH, '//span[normalize-space(text())="Overview" or normalize-space(text())="Reviews"]'
            ))
        )
        return True
    except TimeoutException:
        pass

    # Fallback: if we can see a business name, panel is loaded enough
    try:
        WebDriverWait(driver, 3).until(
            EC.presence_of_element_located((By.XPATH, '//span[contains(@class,"PbOY2e")]'))
        )
        return True
    except TimeoutException:
        pass

    return False


def extract_detail_panel(driver) -> dict:
    """Scrape name / rating / phone / website from the open detail panel."""
    info = {'name': '', 'rating': '', 'review_count': '',
            'address': '', 'phone': '', 'website': ''}
    soup = BeautifulSoup(driver.page_source, 'html.parser')

    for sel in ['h2.qrShPb span', 'h2[data-attrid="title"] span',
                'div.SPZz6b span', '[data-attrid="title"]',
                'div.fontHeadlineLarge']:
        el = soup.select_one(sel)
        if el and el.text.strip():
            info['name'] = el.text.strip()
            break

    # numeric rating (e.g. "5.0") — ZjTWef confirmed from DOM inspection
    for sel in ['span.ZjTWef', 'span.Aq14fc', 'div.BHMmbe']:
        el = soup.select_one(sel)
        if el:
            txt = el.text.strip()
            if txt and re.match(r'^\d+\.?\d*$', txt) and float(txt) <= 5:
                info['rating'] = txt
                break
    # fallback: aria-label on star image
    if not info['rating']:
        for sel in ['[aria-label*="star"]', '[aria-label*="Star"]',
                    '[aria-label*="rated"]', '[aria-label*="Rated"]']:
            el = soup.select_one(sel)
            if el:
                aria = el.get('aria-label', '')
                m = re.search(r'(\d+(?:\.\d+)?)\s*(?:out of|/)', aria, re.I)
                if not m:
                    m = re.search(r'(\d+(?:\.\d+)?)', aria)
                if m and float(m.group(1)) <= 5:
                    info['rating'] = m.group(1)
                    break

    # review count — leIgTe confirmed from DOM inspection
    for sel in ['div.leIgTe', 'span.RDApEe', 'div.pVA7K']:
        el = soup.select_one(sel)
        if el:
            t = re.sub(r'[()]', '', el.text).strip()
            if t and re.search(r'\d+', t):
                info['review_count'] = t
                break
    # fallback: aria-label containing review count
    if not info['review_count']:
        for el in soup.find_all(
                attrs={'aria-label': re.compile(r'\d+.*review', re.I)}):
            m = re.search(r'(\d[\d,]*)', el.get('aria-label', ''))
            if m:
                info['review_count'] = m.group(1).replace(',', '')
                break
    # live DOM fallback
    if not info['review_count']:
        for css in ['div.leIgTe', 'span.RDApEe']:
            try:
                el = driver.find_element(By.CSS_SELECTOR, css)
                t = re.sub(r'[()]', '',
                           driver.execute_script(
                               'return arguments[0].innerText', el) or '').strip()
                if t and re.search(r'\d+', t):
                    info['review_count'] = t
                    break
            except Exception:
                pass

    for a in soup.find_all('a', href=re.compile(r'^tel:')):
        num = a['href'].replace('tel:', '').strip()
        if num:
            info['phone'] = num
            break
    if not info['phone']:
        phones = parse_phones(soup.get_text())
        if phones:
            info['phone'] = phones[0]

    for a in soup.find_all('a', href=True):
        href = a['href']
        if (href.startswith('http')
                and 'google.com' not in href
                and 'goo.gl' not in href):
            info['website'] = href
            break

    HOURS_PAT = re.compile(r'^(open|closed|hours|\d+\s*(am|pm))', re.I)

    # primary: confirmed path a > div > div.C9waJd > div > span
    # The intermediate <div> child ensures we skip sibling "Open 24 hrs" spans
    for sel in ['div.C9waJd > div > span', 'div.y7xX3d > div > span']:
        el = soup.select_one(sel)
        if el:
            t = el.text.strip()
            if t and len(t) > 5 and not HOURS_PAT.match(t):
                info['address'] = t
                break

    # fallback: Directions <a> link — iterate spans, require a comma
    if not info['address']:
        for a in soup.find_all('a', href=re.compile(r'maps\.google\.com|/maps/', re.I)):
            for span in a.find_all('span'):
                t = span.text.strip()
                if (t and ',' in t and len(t) > 10
                        and not HOURS_PAT.match(t)
                        and not re.match(r'^[\d\s\-+().]+$', t)):
                    info['address'] = t
                    break
            if info['address']:
                break

    # live DOM — scroll panel first (address may be below fold), then re-query
    if not info['address']:
        try:
            driver.execute_script("""
                const targets = ['#rhs', '#rhs_column', '[id*="kp-wp-tab"]',
                                 'div.knowledge-panel', 'div[class*="kp-blk"]'];
                for (const sel of targets) {
                    const el = document.querySelector(sel);
                    if (el && el.scrollHeight > el.clientHeight + 20) {
                        el.scrollTop += 700; return;
                    }
                }
            """)
        except Exception:
            pass
        time.sleep(0.8)

        for css in ['div.C9waJd > div > span', 'div.y7xX3d > div > span',
                    '[data-attrid*="address"] span', 'span.LrzXr',
                    '.Io6YTe.fontBodyMedium', 'span.y0K5Df']:
            try:
                el = driver.find_element(By.CSS_SELECTOR, css)
                t = (driver.execute_script(
                    'return arguments[0].innerText', el) or '').strip()
                if t and len(t) > 5 and not HOURS_PAT.match(t):
                    info['address'] = t
                    break
            except Exception:
                pass

    return info


# ══════════════════════════════════════════════════════════════════════════════
#  REVIEWS  —  click the "5.0 ★★★★★ · N Reviews  >" highlighted row
# ══════════════════════════════════════════════════════════════════════════════

def click_reviews_row(driver) -> bool:
    """
    DOM structure (confirmed via DevTools):
        <div role="button" tabindex="0" ...>        ← THIS is what we click
          <div class="aep93e zlzEbc">
            <div class="o7nARe" aria-hidden="true"></div>
            <span class="PbOY2e">Reviews</span>
          </div>
        </div>
    """
    pause(2.5, 3.5)  # let panel fully settle — longer wait reduces extraction failures

    # ── Strategy 1: role="button" ancestor of the "Reviews" span (most precise)
    try:
        btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((
                By.XPATH,
                '//span[normalize-space(text())="Reviews"]'
                '/ancestor::div[@role="button"][1]'
            ))
        )
        driver.execute_script('arguments[0].scrollIntoView({block:"center"})', btn)
        pause(0.4, 0.8)
        driver.execute_script('arguments[0].click()', btn)
        pause(2.5, 3.5)
        print('        [reviews] clicked role=button ancestor of Reviews span')
        return True
    except Exception as e:
        print(f'        [reviews] strategy 1 failed: {e}')

    # ── Strategy 2: tabindex="0" ancestor of the "Reviews" span
    try:
        btn = driver.find_element(
            By.XPATH,
            '//span[normalize-space(text())="Reviews"]'
            '/ancestor::div[@tabindex="0"][1]'
        )
        driver.execute_script('arguments[0].click()', btn)
        pause(2.5, 3.5)
        print('        [reviews] clicked tabindex=0 ancestor of Reviews span')
        return True
    except Exception as e:
        print(f'        [reviews] strategy 2 failed: {e}')

    # ── Strategy 3: click the span itself (sometimes enough)
    try:
        span = driver.find_element(
            By.XPATH, '//span[normalize-space(text())="Reviews"]'
        )
        driver.execute_script('arguments[0].click()', span)
        pause(2.5, 3.5)
        print('        [reviews] clicked Reviews span directly')
        return True
    except Exception as e:
        print(f'        [reviews] strategy 3 failed: {e}')

    # ── Strategy 4: JS click by finding span by text, then walking up to button
    try:
        clicked = driver.execute_script("""
            const spans = document.querySelectorAll('span.PbOY2e');
            for (const span of spans) {
                if (span.innerText.trim() === 'Reviews') {
                    let el = span;
                    for (let i = 0; i < 5; i++) {
                        el = el.parentElement;
                        if (!el) break;
                        if (el.getAttribute('role') === 'button' ||
                            el.getAttribute('tabindex') === '0') {
                            el.click();
                            return true;
                        }
                    }
                    span.click();
                    return true;
                }
            }
            return false;
        """)
        if clicked:
            pause(2.5, 3.5)
            print('        [reviews] clicked via JS walk-up')
            return True
        print('        [reviews] strategy 4: Reviews span not found in DOM')
    except Exception as e:
        print(f'        [reviews] strategy 4 failed: {e}')

    # ── Strategy 5: click the star-rating / review-count row (div.leIgTe or
    #    any role=button ancestor of the review-count element)
    try:
        clicked = driver.execute_script("""
            const candidates = [
                ...document.querySelectorAll('div.leIgTe, span.RDApEe, div.pVA7K')
            ];
            for (const el of candidates) {
                if (!/\\d/.test(el.innerText)) continue;
                let cur = el;
                for (let i = 0; i < 6; i++) {
                    cur = cur.parentElement;
                    if (!cur) break;
                    if (cur.getAttribute('role') === 'button' ||
                        cur.getAttribute('tabindex') === '0') {
                        cur.click();
                        return true;
                    }
                }
                el.click();
                return true;
            }
            return false;
        """)
        if clicked:
            pause(2.5, 3.5)
            print('        [reviews] clicked star-rating row (strategy 5)')
            return True
        print('        [reviews] strategy 5: no rating row found')
    except Exception as e:
        print(f'        [reviews] strategy 5 failed: {e}')

    print('        [reviews] all strategies failed')
    return False


def scroll_reviews_in_panel(driver, max_reviews: int = 20):
    """Scroll the reviews list inside the panel until enough cards load."""
    prev_count = 0
    stale_rounds = 0

    for attempt in range(30):
        cards = driver.find_elements(
            By.CSS_SELECTOR,
            'div.bwb7ce, div.gws-localreviews__google-review'
        )
        count = len(cards)
        print(f'        [scroll] round {attempt + 1}: {count} cards')

        if count >= max_reviews:
            break
        if count == prev_count:
            stale_rounds += 1
            # Give more patience on the first few rounds (cards may load slowly)
            limit = 3 if count == 0 else 6
            if stale_rounds >= limit:
                print('        [scroll] no new cards — stopping')
                break
        else:
            stale_rounds = 0
        prev_count = count

        # Scroll the panel — try known Knowledge Panel containers first,
        # then the closest scrollable ancestor of the last card, then window.
        scrolled = driver.execute_script("""
            const PANEL_SELS = [
                '#rhs', '#rhs_column', 'div[id^="kp-wp"]',
                'div.knowledge-panel', 'div[class*="kp-blk"]',
                'div[jsname="ScrollingCarousel"]',
            ];
            for (const sel of PANEL_SELS) {
                const el = document.querySelector(sel);
                if (el && el.scrollHeight > el.clientHeight + 50) {
                    el.scrollTop += 1500;
                    return 'panel:' + sel;
                }
            }
            // Walk up from the last review card to find scrollable ancestor
            const cards = document.querySelectorAll('div.bwb7ce, div.gws-localreviews__google-review');
            if (cards.length) {
                let el = cards[cards.length - 1];
                for (let i = 0; i < 12; i++) {
                    el = el.parentElement;
                    if (!el) break;
                    const style = window.getComputedStyle(el);
                    if ((style.overflow === 'auto' || style.overflow === 'scroll' ||
                         style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                        el.scrollHeight > el.clientHeight + 50) {
                        el.scrollTop += 1500;
                        return 'ancestor';
                    }
                }
                // scrollIntoView on last card as fallback
                cards[cards.length - 1].scrollIntoView({block: 'end'});
                return 'scrollIntoView';
            }
            window.scrollBy(0, 1000);
            return 'window';
        """)
        _ = scrolled  # logged only when debugging

        pause(1.2, 2.0)

    # Expand any "More" buttons for full review text
    for xpath in [
        '//button[contains(@aria-label,"See more")]',
        '//button[contains(text(),"More")]',
    ]:
        for btn in driver.find_elements(By.XPATH, xpath):
            try:
                driver.execute_script('arguments[0].click()', btn)
            except Exception:
                pass
    pause(0.5, 1.0)


def parse_review_elements(driver) -> list:
    """
    Confirmed DOM structure (from live debug):
      div.bwb7ce          ← full review block
        [role=img]        ← star rating (aria-label)
        div.OA1nbd        ← review text
        div[data-review-id] ← photo carousel (empty innerText — was misleading us)

    innerText of div.bwb7ce is structured as:
      Line 0 : author name
      Line 1 : "N review·N photo"  ← skip
      Line 2 : "X months/weeks ago" ← date
      Line 3 : review text          ← also in div.OA1nbd
      Line 4 : reaction e.g. "❤️3"  ← skip
      Line 5+: "BusinessName (Owner)\ndate\nreply" ← skip
    """
    DATE_PAT  = re.compile(r'\d+\s*(second|minute|hour|day|week|month|year)s?\s*ago', re.I)
    INFO_PAT  = re.compile(r'^\d+\s*(review|photo|local\s*guide)', re.I)
    REACT_PAT = re.compile(r'^[\U0001F000-\U0001FFFF❤️👍🎉\s\d]+$')

    reviews = []

    # ── primary selector confirmed from debug ────────────────────────────
    card_els = driver.find_elements(By.CSS_SELECTOR, 'div.bwb7ce')

    # ── fallback: old-format reviews ─────────────────────────────────────
    if not card_els:
        card_els = driver.find_elements(
            By.CSS_SELECTOR, 'div.gws-localreviews__google-review'
        )

    print(f'        [parse] {len(card_els)} review blocks (div.bwb7ce) found')

    for card in card_els:
        rv = {'author': '', 'stars': '', 'date': '', 'text': ''}

        # stars ── aria-label on the star image span
        try:
            star_el = card.find_element(By.CSS_SELECTOR, '[role="img"][aria-label]')
            aria = star_el.get_attribute('aria-label') or ''
            m = re.search(r'(\d+(?:\.\d+)?)', aria)
            if m:
                rv['stars'] = f"{m.group(1)}/5"
        except Exception:
            pass

        # review text ── div.OA1nbd is the direct text container
        try:
            text_el = card.find_element(By.CSS_SELECTOR, 'div.OA1nbd')
            t = (driver.execute_script('return arguments[0].innerText', text_el) or '').strip()
            if t:
                rv['text'] = t
        except Exception:
            pass

        # author + date ── parse innerText of the whole block
        try:
            raw   = driver.execute_script('return arguments[0].innerText', card) or ''
            lines = [l.strip() for l in raw.split('\n') if l.strip()]

            author_found = False
            owner_reply  = False

            for line in lines:
                # once we hit an "(Owner)" line, skip everything after
                if '(Owner)' in line or '(owner)' in line:
                    owner_reply = True
                if owner_reply:
                    continue
                if INFO_PAT.search(line) or REACT_PAT.search(line):
                    continue
                if DATE_PAT.search(line):
                    rv['date'] = rv['date'] or line
                    continue
                if not author_found and len(line) < 80:
                    rv['author'] = rv['author'] or line
                    author_found = True
                    continue
                # text fallback if div.OA1nbd wasn't found
                if not rv['text'] and len(line) > 5:
                    rv['text'] = line
        except Exception:
            pass

        if rv['author'] or rv['text']:
            reviews.append(rv)

    return reviews


def get_reviews(driver, max_reviews: int = 20) -> list:
    """Click reviews row, scroll, parse."""
    if max_reviews <= 0:
        return []

    clicked = click_reviews_row(driver)
    if not clicked:
        return []

    try:
        WebDriverWait(driver, 12).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR,
                 'div.bwb7ce, div.gws-localreviews__google-review')
            )
        )
    except TimeoutException:
        # Cards sometimes load lazily during scroll — keep going instead of aborting
        print('        [reviews] no cards yet after 12s — scrolling anyway')

    scroll_reviews_in_panel(driver, max_reviews)

    reviews = parse_review_elements(driver)
    print(f'        [reviews] extracted {len(reviews)} reviews')
    return reviews[:max_reviews]


# ── navigate back ─────────────────────────────────────────────────────────────

def safe_back(driver, serp_url: str):
    try:
        driver.back()
        pause(2, 3)
        if 'maps.google' in driver.current_url or '/maps/' in driver.current_url:
            driver.get(serp_url)
            pause(2, 3)
    except Exception:
        try:
            driver.get(serp_url)
            pause(2, 3)
        except Exception:
            pass


# ── per-card orchestration ────────────────────────────────────────────────────

def scrape_business_cards(driver, serp_url: str,
                          max_results: int, max_reviews: int) -> list:
    businesses = []

    cards = get_business_card_elements(driver)
    if not cards:
        print('[!] No Local Pack cards found.')
        return businesses

    n = min(len(cards), max_results)
    print(f'[*] Processing {n} of {len(cards)} cards\n')

    for idx in range(n):
        print(f'  -- Card {idx + 1}/{n} --')

        cards = get_business_card_elements(driver)
        if idx >= len(cards):
            print(f'    [!] Card {idx} out of range')
            break

        card_el = cards[idx]
        preview = quick_info_from_card(card_el)
        print(f'    Preview: {preview["name"] or "(no name yet)"}')

        try:
            driver.execute_script(
                'arguments[0].scrollIntoView({block:"center"})', card_el
            )
            pause(0.4, 0.8)
            driver.execute_script('arguments[0].click()', card_el)
        except StaleElementReferenceException:
            cards = get_business_card_elements(driver)
            if idx >= len(cards):
                break
            driver.execute_script('arguments[0].click()', cards[idx])

        pause(1.5, 2.5)

        panel_ok = wait_for_detail_panel(driver, timeout=8)
        if not panel_ok:
            print('    [!] Detail panel did not load')

        detail = extract_detail_panel(driver)
        for k in ('name', 'rating', 'phone'):
            if not detail[k] and preview.get(k):
                detail[k] = preview[k]

        print(f'    Name    : {detail["name"]}')
        print(f'    Rating  : {detail["rating"]} ({detail["review_count"]} reviews)')
        print(f'    Phone   : {detail["phone"]}')
        print(f'    Address : {detail["address"]}')
        print(f'    Website : {detail["website"]}')

        emails = []
        if detail['website']:
            print('    Scraping website for emails...')
            emails = fetch_website_emails(detail['website'])
            print(f'    Emails  : {emails or "none"}')

        if not detail['phone'] and detail['website']:
            try:
                r = requests.get(detail['website'], headers=HEADERS, timeout=8)
                phones = parse_phones(r.text)
                if phones:
                    detail['phone'] = phones[0]
            except Exception:
                pass

        reviews = []
        if max_reviews > 0:
            print('    Getting reviews...')
            reviews = get_reviews(driver, max_reviews)

        businesses.append({**detail, 'emails': emails, 'reviews': reviews})

        safe_back(driver, serp_url)
        pause(1.5, 2.5)
        if 'google.com/search' not in driver.current_url:
            driver.get(serp_url)
            pause(2, 3)

    return businesses


# ── organic fallback ──────────────────────────────────────────────────────────

def extract_organic_results(driver) -> list:
    results = []
    soup = BeautifulSoup(driver.page_source, 'html.parser')
    for g in soup.select('div.g, div.MjjYud > div > div')[:15]:
        item = {'name': '', 'rating': '', 'review_count': '',
                'address': '', 'phone': '', 'website': ''}
        h3 = g.find('h3')
        if h3:
            item['name'] = h3.text.strip()
        a_tag = g.find('a', href=True)
        if a_tag:
            href = a_tag['href']
            if href.startswith('http') and 'google.com' not in href:
                item['website'] = href
        snippet = g.find('div', class_=re.compile(r'VwiC3b|IsZvec|s3v9rd|aCOpRe'))
        if snippet:
            phones = parse_phones(snippet.text)
            if phones:
                item['phone'] = phones[0]
        if item['name']:
            results.append(item)
    return results


# ── output ────────────────────────────────────────────────────────────────────

def save_txt(service: str, location: str,
             businesses: list, out_dir: str = '.') -> str:
    os.makedirs(out_dir, exist_ok=True)
    ts   = datetime.now().strftime('%Y%m%d_%H%M%S')
    slug = re.sub(r'\W+', '_', f'{service}_{location}').lower().strip('_')
    path = os.path.join(out_dir, f'{slug}_{ts}.txt')

    sep  = '=' * 72
    thin = '-' * 72
    lines = [
        sep,
        f'  SEARCH  : {service} provider in {location}',
        f'  DATE    : {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
        f'  RESULTS : {len(businesses)} businesses',
        sep,
    ]

    for i, b in enumerate(businesses, 1):
        lines += [
            '',
            thin,
            f'  [{i}]  {b.get("name") or "Unknown Business"}',
            thin,
            f'  Rating   : {b.get("rating") or "N/A"}  ({b.get("review_count") or "?"} reviews)',
            f'  Phone    : {b.get("phone") or "N/A"}',
            f'  Email(s) : {", ".join(b.get("emails", [])) or "N/A"}',
            f'  Address  : {b.get("address") or "N/A"}',
            f'  Website  : {b.get("website") or "N/A"}',
        ]
        reviews = b.get('reviews', [])
        if reviews:
            lines.append(f'\n  Reviews ({len(reviews)}):')
            for j, rv in enumerate(reviews, 1):
                date    = rv.get('date') or ''
                text    = rv.get('text') or ''
                snippet = (text[:300] + '...') if len(text) > 300 else text
                header  = f'    {j:>2}. [{date}]' if date else f'    {j:>2}.'
                lines.append(header)
                if snippet:
                    lines.append(f'        "{snippet}"')
        else:
            lines.append('\n  Reviews  : N/A')

    lines += ['', sep, '']
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'\n[OK] Saved -> {path}')
    return path


# ── main ──────────────────────────────────────────────────────────────────────

def scrape(service: str, location: str,
           max_results: int = 10, max_reviews: int = 20,
           out_dir: str = '.', headless: bool = False) -> list:

    query = f'{service} in {location}'
    print(f'\n[*] Query: "{query}"')
    print('[*] Initializing Chrome browser window... (takes 5-15 seconds)')

    driver    = make_driver(headless=headless)
    serp_url  = f'https://www.google.com/search?q={quote_plus(query)}&hl=en&gl=us&tbm=lcl'
    businesses = []

    try:
        google_search(driver, query)

        cards = get_business_card_elements(driver)
        print(f'[*] Local pack cards: {len(cards)}')

        if len(cards) >= 2:
            businesses = scrape_business_cards(
                driver, serp_url, max_results, max_reviews
            )
        else:
            print('[*] No local pack — using organic results')
            raw = extract_organic_results(driver)[:max_results]
            for biz in raw:
                emails = []
                if biz.get('website'):
                    emails = fetch_website_emails(biz['website'])
                businesses.append({**biz, 'emails': emails, 'reviews': []})

    finally:
        driver.quit()

    return businesses


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Google Business Scraper')
    parser.add_argument('service',    help='Service type  e.g. "electrician"')
    parser.add_argument('location',   help='Location      e.g. "Lahore"')
    parser.add_argument('--results',  type=int, default=5)
    parser.add_argument('--reviews',  type=int, default=20)
    parser.add_argument('--out',      default='.')
    parser.add_argument('--headless', action='store_true')
    args = parser.parse_args()

    results = scrape(
        service     = args.service,
        location    = args.location,
        max_results = args.results,
        max_reviews = args.reviews,
        out_dir     = args.out,
        headless    = args.headless,
    )
    if results:
        save_txt(args.service, args.location, results, args.out)
    else:
        print('[!] No businesses found.')


