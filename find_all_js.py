import requests
import re
import json

r = requests.get('https://play.godeebxp.com/egames/2b4bc379f93f9c6c0dc2f9c09c95ea96b6b84372/game/src/settings.json', verify=False)
data = r.json()
print('Bundles:', data.get('bundleVers', {}).keys())

for bundle in data.get('bundleVers', {}).keys():
    url = f'https://play.godeebxp.com/egames/2b4bc379f93f9c6c0dc2f9c09c95ea96b6b84372/game/assets/{bundle}/index.js'
    try:
        r2 = requests.get(url, verify=False)
        print(f"[{bundle}] length:", len(r2.text))
        event_names = set(re.findall(r"eventName\s*:\s*[\"']([^\"']+)[\"']", r2.text))
        if event_names:
            print("  ", event_names)
        if 'getSlotTable' in r2.text:
            print("   *** FOUND getSlotTable ***")
    except Exception as e:
        print(e)
