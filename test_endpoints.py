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
    'Content-Type': 'application/json'
}

payload = {
    'id': 12369,
    'game_product_code': 'ATGEgame',
    'game_product_id': 3007
}

endpoints = [
    'https://egame6688.com/api/webapi/game/login',
    'https://egame6688.com/api/webapi/game/play',
    'https://egame6688.com/api/webapi/game/transfer',
    'https://egame6688.com/api/webapi/game/enter',
    'https://egame6688.com/api/webapi/game/url',
    'https://egame6688.com/api/webapi/transfer',
    'https://egame6688.com/api/webapi/game/launch',
    'https://egame6688.com/api/webapi/play',
]

for url in endpoints:
    print(f'\nTrying: {url}')
    r = session.post(url, json=payload, headers=headers, verify=False)
    print(r.status_code, r.text[:200])

