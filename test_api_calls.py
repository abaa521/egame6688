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

api_base = 'https://egame6688.com/api/webapi'

# Test variants
tests = [
    ('POST', f'{api_base}/gameApi/transfer', {"id": 12369, "game_product_code": "ATGEgame"}),
    ('POST', f'{api_base}/gameApi/transferAll', {"id": 12369, "game_product_code": "ATGEgame"}),
    ('POST', f'{api_base}/gameWallet', {"id": 12369, "game_product_code": "ATGEgame"}),
    ('GET', f'{api_base}/gameProduct', None),
    ('GET', f'{api_base}/game', None),
    ('POST', f'{api_base}/game/12369', None),
    ('POST', f'{api_base}/game/login', {"id": 12369}),
]

for method, url, json_data in tests:
    print(f'\nTrying {method} {url}')
    if method == 'POST':
        r = session.post(url, headers=headers, json=json_data, verify=False)
    else:
        r = session.get(url, headers=headers, verify=False)
    print("Status:", r.status_code)
    try:
        print("Response:", r.json())
    except:
        print("Response:", r.text[:200])

