import requests
import main
import urllib3
import json
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

tests = [
    ('POST', f'{api_base}/gameApi/transfer', {"id": 12369, "game_product_code": "ATGEgame"}),
    ('POST', f'{api_base}/gameApi/transferAll', {"id": 12369, "game_product_code": "ATGEgame"}),
    ('POST', f'{api_base}/gameWallet', {"id": 12369, "game_product_code": "ATGEgame"}),
    ('GET', f'{api_base}/gameProduct', None),
    ('POST', f'{api_base}/game/12369', None),
]

with open('api_results.txt', 'w', encoding='utf-8') as f:
    for method, url, json_data in tests:
        f.write(f'\nTrying {method} {url}\n')
        if method == 'POST':
            r = session.post(url, headers=headers, json=json_data, verify=False)
        else:
            r = session.get(url, headers=headers, verify=False)
        f.write(f"Status: {r.status_code}\n")
        try:
            f.write(f"Response: {json.dumps(r.json(), ensure_ascii=False)}\n")
        except:
            f.write(f"Response: {r.text[:200]}\n")

