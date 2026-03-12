import requests
import re
from bs4 import BeautifulSoup
import urllib3
urllib3.disable_warnings()

headers = {'User-Agent': 'Mozilla/5.0'}
html = requests.get('https://egame6688.com/zhTW/game/eGame/3007', headers=headers, verify=False).text
soup = BeautifulSoup(html, 'html.parser')
js_links = []
for script in soup.find_all('script'):
    if script.get('src'):
        js_links.append(script['src'])

print('Found JS files:')
for link in js_links:
    print(link)
    
    # download and search for 'url' or 'api'
    if link.startswith('/'):
        link = 'https://egame6688.com' + link
    
    js_content = requests.get(link, headers=headers, verify=False).text
    
    matches = re.findall(r'/api/webapi/[a-zA-Z0-9_\-/]+', js_content)
    if matches:
        print(f'   -> Matches in {link}:')
        print('      ' + ', '.join(set(matches)))

