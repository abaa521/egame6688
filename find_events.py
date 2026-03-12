import requests
import re
import urllib3
urllib3.disable_warnings()

url = 'https://play.godeebxp.com/egames/2b4bc379f93f9c6c0dc2f9c09c95ea96b6b84372/game/assets/main/index.js'
print(f"Downloading {url} ...")
r = requests.get(url, verify=False)
text = r.text

print("==== WebSocket Events ====")
events = re.findall(r'(\w+)\s*:\s*[\"\'\w]*\s*(?:=>|function)(?:[^\{]+)\{\s*this\.send\([^{}]*eventName\s*:\s*[\"\'](\w+)[\"\']', text)
for event in events:
    print(event)

print("\n==== All eventNames found ====")
event_names = set(re.findall(r"eventName\s*:\s*[\"']([^\"']+)[\"']", text))
print("\n".join(sorted(event_names)))

print("\n==== Socket Send Payload Signatures ====")
payloads = re.findall(r'send\s*\(\s*(\{[^}]+\})', text)
for pp in set(payloads):
    print(pp)

print("\n==== Get Slot Table / Lobby Signatures ====")
slot_related = re.findall(r'(\{[^}]*eventName\s*:\s*[\"\'\w]+[^}]*\})', text)
for sr in set(slot_related):
    if 'get' in sr or 'slot' in sr.lower() or 'lobby' in sr.lower() or 'detail' in sr.lower():
        print(sr)

