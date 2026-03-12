import requests
import re
import urllib3
urllib3.disable_warnings()

bundles = ["internal", "resources", "main", "g1005", "slotFramework"]
for b in bundles:
    url = f'https://play.godeebxp.com/egames/2b4bc379f93f9c6c0dc2f9c09c95ea96b6b84372/game/assets/{b}/index.js'
    try:
        r = requests.get(url, verify=False, timeout=10)
        text = r.text
        print(f"[{b}] size: {len(text)}")
        if 'getSlotTable' in text:
            print(f"  FOUND getSlotTable in {b}")
        
        matches = re.finditer(r'eventName\s*:\s*[\"\'\w]*([^\"\',}]+)', text)
        events = set(m.group(1).replace('"', '').replace("'", "") for m in matches)
        print("  Events:", list(events)[:10], "..." if len(events) > 10 else "")
    except Exception as e:
        print(e)
