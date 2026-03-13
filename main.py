import requests
import ddddocr
import random
import time

def login():
    session = requests.Session()

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://egame6688.com/zhTW/login",    
        "Origin": "https://egame6688.com"
    }

    ocr = ddddocr.DdddOcr(show_ad=False)

    max_retries = 5
    for attempt in range(1, max_retries + 1):
        print(f"\n--- 嘗試登入 (第 {attempt}/{max_retries} 次) ---")
        random_num = random.random()
        captcha_url = f"https://egame6688.com/api/webapi/loginCaptcha?{random_num}"
        print("正在獲取驗證碼圖片...")
        img_resp = session.get(captcha_url, headers=headers)
        if img_resp.status_code != 200:
            print("獲取驗證碼失敗，HTTP 狀態碼:", img_resp.status_code)
            time.sleep(1)
            continue

        captcha_text = ocr.classification(img_resp.content)
        print(f"辨識出的驗證碼為: {captcha_text}")

        if len(captcha_text) != 4:
            print("驗證碼長度不符，重新嘗試...")
            continue

        login_url = "https://egame6688.com/api/webapi/auth/login"
        payload = {
            "account": "sky0212",
            "password": "a28272629",
            "captcha": captcha_text
        }

        print("正在發送登入請求...")
        login_resp = session.post(login_url, json=payload, headers=headers)

        try:
            result = login_resp.json()
            if result.get("status") == "ok":
                print(" 登入成功！")
                access_token = result["data"]["access_token"]
                return session, access_token
            else:
                msg = result.get("msg", "")
                print(f" 登入失敗: {msg}")
        except Exception as e:
            print("解析登入回應失敗, HTTP Status:", login_resp.status_code)

        time.sleep(1.5)

    print(" 已達最大重試次數，腳本結束。")
    return None, None

def get_game_url(session, access_token, game_id=12369, device=1):
    print("\n--- 獲取遊戲連結 ---")

    # 1. 將全部點數轉入該遊戲錢包 (可選，但通常點擊「立即遊戲」前會做這件事)
    transfer_url = "https://egame6688.com/api/webapi/gameApi/transferAll"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://egame6688.com/zhTW/game/eGame/3007",
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "id": game_id,
        "game_product_code": "ATGEgame"
    }

    # print("轉入點數至遊戲錢包...")
    # try:
    #     t_resp = session.post(transfer_url, json=payload, headers=headers, verify=False)
    #     print("轉入結果:", t_resp.json())
    # except:
    #     pass

    # 2. 透過 playGame 網址，攔截 302 重定向以拿取最終遊戲 URL
    api_url = f"https://egame6688.com/webapi/gameApi/playGame/{game_id}?device={device}"

    print(f"發送請求至: {api_url}")

    # 使用 allow_redirects=False 來取得 302 跳轉的 URL
    resp = session.get(api_url, headers=headers, allow_redirects=False, verify=False)
    
    if resp.status_code == 302:
        game_url = resp.headers.get("Location")
        if game_url:
            print(f"\n 成功獲取遊戲網址:\n{game_url}")
        else:
            print("\n 未找到 Location Header，跳轉失敗")
            print(resp.text)
    else:
        print(f"\n 未預期的狀態碼: {resp.status_code}")
        print("回應內容:", resp.text)

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings()
    session, token = login()
    if session and token:
        get_game_url(session, token, game_id=12369)

