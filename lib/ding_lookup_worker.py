import sys
import json
import uuid
import tls_client

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

def lookup_numbers(numbers):
    session = tls_client.Session(client_identifier="chrome_120", random_tls_extension_order=True)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "Content-Language": "en-US",
        "Origin": "https://www.ding.com",
        "Referer": "https://www.ding.com/topup",
        "sec-ch-ua": '"Google Chrome";v="155", "Chromium";v="155", "Not(A:Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
    }

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

        try:
            resp = session.post(url, headers=headers, json=payload, timeout_seconds=12)
            if resp.status_code == 200:
                data = resp.json()
                ops = data.get("operators", [])
                if ops and len(ops) > 0:
                    op_name = ops[0].get("name", "Unknown")
                    results.append({"number": raw_num, "operator": op_name})
                else:
                    results.append({"number": raw_num, "operator": "Not Found"})
            else:
                results.append({"number": raw_num, "operator": f"HTTP {resp.status_code}"})
        except Exception as e:
            results.append({"number": raw_num, "operator": "API Error"})

    return results

if __name__ == "__main__":
    try:
        if len(sys.argv) > 1:
            # Either passed as JSON string or raw numbers
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
