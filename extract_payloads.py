import requests
import re
import urllib3
urllib3.disable_warnings()

url = 'https://play.godeebxp.com/egames/2b4bc379f93f9c6c0dc2f9c09c95ea96b6b84372/game/assets/slotFramework/index.js'
r = requests.get(url, verify=False)
text = r.text

print("==== slotFramework Send Patterns ====")
# Search for something like: send({eventName: "something", ...})
for m in re.finditer(r'(send\s*\(\s*\{[^}]*eventName[^}]*\}\s*\))', text):
    print(m.group(1))
    
print("==== getSlotTable context ====")
for m in re.finditer(r'(.{0,50}getSlotTable.{0,50})', text):
    print(m.group(1))

