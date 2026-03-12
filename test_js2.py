import requests
import re
import urllib3
urllib3.disable_warnings()

headers = {'User-Agent': 'Mozilla/5.0'}
js_content = requests.get('https://egame6688.com/_nuxt/CdJ_s8N7.js', headers=headers, verify=False).text

# Find pieces that talk about 'url', 'play', or 'window.open' together with the webapi
matches = re.finditer(r'.{0,50}/api/webapi/game.{0,50}', js_content)
for m in matches:
    print(m.group(0))

print('-----------------------------------------')
matches2 = re.finditer(r'.{0,50}playNow.{0,50}', js_content)
for m in matches2:
    print(m.group(0))
