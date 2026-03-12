import requests
import re
import urllib3
urllib3.disable_warnings()

headers = {'User-Agent': 'Mozilla/5.0'}
js_content = requests.get('https://egame6688.com/_nuxt/CdJ_s8N7.js', headers=headers, verify=False).text

for m in re.finditer(r'.{0,30}立即遊戲.{0,30}', js_content):
    print("Match 1:", m.group(0))

for m in re.finditer(r'.{0,30}window\.open\([^)]*\).{0,30}', js_content):
    print("Match 2:", m.group(0))

for m in re.finditer(r'href\s*=\s*["\']/[^"\']*["\']', js_content):
    print("Match 3:", m.group(0)[:50])

