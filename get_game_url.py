
import requests
import ddddocr
import random
import time
import sys
import urllib3
import os

urllib3.disable_warnings()

def log(msg):
    print(msg, file=sys.stderr)

def login():
    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://egame6688.com/zhTW/login",    
        "Origin": "https://egame6688.com"
    }

    # 取得由 NestJS / Docker ENV 傳入的帳號密碼，若未設定則自動降級使用預設值
    account = os.environ.get("GAME_ACCOUNT")
    password = os.environ.get("GAME_PASSWORD")

    if not account or not password:
        log("Error: GAME_ACCOUNT or GAME_PASSWORD environment variables are not set.")
        return None, None

    ocr = ddddocr.DdddOcr(show_ad=False)

    max_retries = 50
    for attempt in range(1, max_retries + 1):
        log(f"--- Attempt login ({attempt}/{max_retries}) ---")
        random_num = random.random()
        captcha_url = f"https://egame6688.com/api/webapi/loginCaptcha?{random_num}"
        img_resp = session.get(captcha_url, headers=headers, verify=False)
        
        if img_resp.status_code != 200:
            time.sleep(1)
            continue

        captcha_text = ocr.classification(img_resp.content)
        if len(captcha_text) != 4:
            continue

        login_url = "https://egame6688.com/api/webapi/auth/login"
        payload = {
            "account": account,
            "password": password,
            "captcha": captcha_text
        }

        login_resp = session.post(login_url, json=payload, headers=headers, verify=False)

        try:
            result = login_resp.json()
            if result.get("status") == "ok":
                log("Login Success")
                return session, result["data"]["access_token"]
        except Exception as e:
            pass

        time.sleep(1.5)
    return None, None

def get_game_url(session, access_token, game_id=12369, device=1):
    api_url = f"https://egame6688.com/webapi/gameApi/playGame/{game_id}?device={device}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://egame6688.com/zhTW/game/eGame/3007",
        "Authorization": f"Bearer {access_token}"
    }
    
    resp = session.get(api_url, headers=headers, allow_redirects=False, verify=False)
    
    if resp.status_code == 302:
        return resp.headers.get("Location")
    
    log(f"Fail: Expected 302, got HTTP {resp.status_code}. Response text: {resp.text}")
    return None

if __name__ == "__main__":
    session, token = login()
    if session and token:
        game_url = get_game_url(session, token, game_id=12369)
        if game_url:
            print(game_url)
            sys.exit(0)
    sys.exit(1)
