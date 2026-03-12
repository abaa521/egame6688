import requests
import main
import urllib3
urllib3.disable_warnings()

session, token = main.login()
if not session:
    print('Login failed')
    exit()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Authorization': f'Bearer {token}',
    'Referer': 'https://egame6688.com/zhTW/game/eGame/3007',
}

endpoints = [
    'https://egame6688.com/game/login/12369',
    'https://egame6688.com/game/play/12369',
    'https://egame6688.com/game/transfer/12369',
    'https://egame6688.com/zhTW/game/login/12369',
    'https://egame6688.com/zhTW/game/play/12369',
    'https://egame6688.com/api/game/12369/url'
]

for url in endpoints:
    print(f'\nTrying GET: {url}')
    r = session.get(url, headers=headers, verify=False, allow_redirects=False)
    print(r.status_code, r.headers.get('Location', '')[:100], r.text[:100])

