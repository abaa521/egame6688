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

tests = [
    'https://egame6688.com/api/webapi/gameApi/playGame/12369?device=1',
    'https://egame6688.com/api/webapi/gameApi/playGame/12369?device=2',
    'https://egame6688.com/webapi/gameApi/playGame/12369?device=1',
    'https://egame6688.com/api/webapi/gameApi/tryGame/12369?device=1',
]

for url in tests:
    print(f'\nTrying GET: {url}')
    r = session.get(url, headers=headers, verify=False, allow_redirects=False)
    print("Status:", r.status_code)
    try:
        print("Response:", r.json())
    except:
        print("Redirect To:", r.headers.get('Location'))
        print("Response Text:", r.text[:200])

