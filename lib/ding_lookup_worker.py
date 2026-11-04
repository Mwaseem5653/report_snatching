import sys
import json
import uuid
import tls_client
import time

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# 10 Diverse Browser Profiles and Headers
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
        "client_identifier": "chrome_119",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-GB,en;q=0.8",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-ch-ua": '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
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
        "client_identifier": "chrome_118",
        "headers": {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-ch-ua": '"Google Chrome";v="118", "Chromium";v="118", "Not?A_Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Linux"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    },
    {
        "client_identifier": "safari_ios_17_1",
        "headers": {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
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
        "client_identifier": "edge_120",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    },
    {
        "client_identifier": "opera_100",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.199 Safari/537.36 OPR/100.0.4815.76",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-ch-ua": '"Not.A/Brand";v="8", "Chromium";v="114", "Opera";v="100"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    },
    {
        "client_identifier": "chrome_117",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-ch-ua": '"Google Chrome";v="117", "Chromium";v="117", "Not?A_Brand";v="8"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    },
    {
        "client_identifier": "firefox_119",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0",
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
        "client_identifier": "chrome_116",
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Origin": "https://www.ding.com",
            "Referer": "https://www.ding.com/topup",
            "sec-ch-ua": '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
        }
    }
]

def lookup_numbers(numbers):
    profile_idx = 0
    request_count_with_current_profile = 0
    
    current_profile = BROWSER_PROFILES[profile_idx]
    session = tls_client.Session(client_identifier=current_profile["client_identifier"], random_tls_extension_order=True)
    headers = current_profile["headers"]

    url = "https://api-v2.www.ding.com/api/operatorlookup"
    results = []

    for num in numbers:
        raw_num = str(num).strip()
        clean = "".join(filter(str.isdigit, raw_num))
        if clean.startswith("0") and len(clean) >= 11:
            clean = "92" + clean[1:]
        elif len(clean) == 10 and clean.startswith("3"):
            clean = "92" + clean

        payload = {
            "phoneNumber": clean,
            "selectedCountryIso": "PK",
            "uniqueId": str(uuid.uuid4())
        }

        success = False
        attempts = 0
        max_attempts = 3

        while not success and attempts < max_attempts:
            attempts += 1
            try:
                # Rotate if we hit 20 requests
                if request_count_with_current_profile >= 20:
                    profile_idx = (profile_idx + 1) % len(BROWSER_PROFILES)
                    current_profile = BROWSER_PROFILES[profile_idx]
                    session = tls_client.Session(client_identifier=current_profile["client_identifier"], random_tls_extension_order=True)
                    headers = current_profile["headers"]
                    request_count_with_current_profile = 0
                    time.sleep(0.3)

                resp = session.post(url, headers=headers, json=payload, timeout_seconds=12)
                request_count_with_current_profile += 1

                # Check for rate limit (429 or forbidden / blocked)
                if resp.status_code == 429 or resp.status_code == 403:
                    profile_idx = (profile_idx + 1) % len(BROWSER_PROFILES)
                    current_profile = BROWSER_PROFILES[profile_idx]
                    session = tls_client.Session(client_identifier=current_profile["client_identifier"], random_tls_extension_order=True)
                    headers = current_profile["headers"]
                    request_count_with_current_profile = 0
                    time.sleep(0.5)
                    continue

                if resp.status_code == 200:
                    data = resp.json()
                    ops = data.get("operators", [])
                    if ops and len(ops) > 0:
                        op_name = ops[0].get("name", "Unknown")
                        results.append({"number": raw_num, "operator": op_name})
                    else:
                        results.append({"number": raw_num, "operator": "Not Found"})
                    success = True
                else:
                    results.append({"number": raw_num, "operator": f"HTTP {resp.status_code}"})
                    success = True
            except Exception as e:
                if attempts >= max_attempts:
                    results.append({"number": raw_num, "operator": "API Error"})
                    success = True
                else:
                    profile_idx = (profile_idx + 1) % len(BROWSER_PROFILES)
                    current_profile = BROWSER_PROFILES[profile_idx]
                    session = tls_client.Session(client_identifier=current_profile["client_identifier"], random_tls_extension_order=True)
                    headers = current_profile["headers"]
                    request_count_with_current_profile = 0
                    time.sleep(0.5)

        # Small polite delay between sequential requests
        time.sleep(0.2)

    return results

if __name__ == "__main__":
    try:
        if len(sys.argv) > 1:
            arg = sys.argv[1]
            try:
                nums = json.loads(arg)
            except:
                nums = sys.argv[1:]
        else:
            input_data = sys.stdin.read()
            nums = json.loads(input_data) if input_data.strip() else []

        output = lookup_numbers(nums)
        print(json.dumps(output, ensure_ascii=False))
    except Exception as e:
        print(json.dumps([{"error": str(e)}]))
