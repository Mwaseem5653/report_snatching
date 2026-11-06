import sys
import json
import uuid
import random
import time
import os
import tls_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Authentic browser profiles strictly matching tls_client supported client_identifiers
BROWSER_PROFILES = [
    {
        "client_identifier": "chrome_120",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-ch-ua": '"Google Chrome";v="120", "Chromium";v="120", "Not?A_Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    },
    {
        "client_identifier": "chrome_124",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    },
    {
        "client_identifier": "chrome_131",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    },
    {
        "client_identifier": "firefox_117",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    },
    {
        "client_identifier": "firefox_120",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    },
    {
        "client_identifier": "safari_ios_17_0",
        "headers": {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    },
    {
        "client_identifier": "safari_ios_18_0",
        "headers": {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    }
]

def create_stealth_session(profile):
    session = tls_client.Session(
        client_identifier=profile["client_identifier"],
        random_tls_extension_order=True
    )
    # Support optional proxy if configured in environment
    proxy = os.getenv("DING_PROXY") or os.getenv("HTTPS_PROXY") or os.getenv("HTTP_PROXY")
    if proxy:
        session.proxies = {"http": proxy, "https": proxy}
    return session

def normalize_pak_number(num):
    raw = str(num).strip()
    digits = "".join(filter(str.isdigit, raw))
    if digits.startswith("0") and len(digits) >= 11:
        clean = "92" + digits[1:]
    elif len(digits) == 10 and digits.startswith("3"):
        clean = "92" + digits
    elif digits.startswith("92") and len(digits) >= 12:
        clean = digits
    else:
        clean = digits
    return raw, clean

def lookup_numbers(numbers):
    url = "https://api-v2.www.ding.com/api/operatorlookup"
    results = []

    profile_idx = random.randint(0, len(BROWSER_PROFILES) - 1)
    current_profile = BROWSER_PROFILES[profile_idx]
    session = create_stealth_session(current_profile)
    headers = current_profile["headers"]
    request_count = 0
    max_requests_before_rotation = random.randint(5, 10)

    for i, num in enumerate(numbers):
        raw_num, clean_num = normalize_pak_number(num)

        if not clean_num or len(clean_num) < 10:
            results.append({"number": raw_num, "operator": "Invalid Number"})
            continue

        payload = {
            "phoneNumber": clean_num,
            "selectedCountryIso": "PK",
            "uniqueId": str(uuid.uuid4())
        }

        success = False
        attempts = 0
        max_attempts = 3

        while not success and attempts < max_attempts:
            attempts += 1

            # Natural rotation after random interval of requests
            if request_count >= max_requests_before_rotation:
                profile_idx = (profile_idx + 1) % len(BROWSER_PROFILES)
                current_profile = BROWSER_PROFILES[profile_idx]
                session = create_stealth_session(current_profile)
                headers = current_profile["headers"]
                request_count = 0
                max_requests_before_rotation = random.randint(5, 10)
                time.sleep(random.uniform(0.3, 0.6))

            try:
                resp = session.post(url, headers=headers, json=payload, timeout_seconds=10)
                request_count += 1

                if resp.status_code == 200:
                    try:
                        data = resp.json()
                        ops = data.get("operators", [])
                        if ops and len(ops) > 0:
                            op_name = ops[0].get("name", "Unknown")
                            results.append({"number": raw_num, "operator": op_name})
                        else:
                            results.append({"number": raw_num, "operator": "Not Found"})
                    except Exception:
                        results.append({"number": raw_num, "operator": "Parse Error"})
                    success = True

                elif resp.status_code in (403, 429):
                    # Rate limit or Cloudflare block: back off, switch profile & fresh session
                    time.sleep(random.uniform(1.0, 2.0))
                    profile_idx = (profile_idx + 1) % len(BROWSER_PROFILES)
                    current_profile = BROWSER_PROFILES[profile_idx]
                    session = create_stealth_session(current_profile)
                    headers = current_profile["headers"]
                    request_count = 0
                    continue

                else:
                    results.append({"number": raw_num, "operator": f"HTTP {resp.status_code}"})
                    success = True

            except Exception as e:
                if attempts >= max_attempts:
                    results.append({"number": raw_num, "operator": "API Error"})
                    success = True
                else:
                    time.sleep(random.uniform(0.8, 1.5))
                    profile_idx = (profile_idx + 1) % len(BROWSER_PROFILES)
                    current_profile = BROWSER_PROFILES[profile_idx]
                    session = create_stealth_session(current_profile)
                    headers = current_profile["headers"]
                    request_count = 0

        # Human-like organic jitter between sequential requests
        if i < len(numbers) - 1:
            time.sleep(random.uniform(0.18, 0.42))

    return results

if __name__ == "__main__":
    try:
        nums = []
        if len(sys.argv) > 1:
            arg = sys.argv[1].strip()
            try:
                nums = json.loads(arg)
            except Exception:
                nums = [x.strip() for x in sys.argv[1:] if x.strip()]
        else:
            input_data = sys.stdin.read().strip()
            if input_data:
                try:
                    nums = json.loads(input_data)
                except Exception:
                    nums = [line.strip() for line in input_data.splitlines() if line.strip()]

        output = lookup_numbers(nums)
        print(json.dumps(output, ensure_ascii=False))
    except Exception as e:
        print(json.dumps([{"error": str(e)}]))
