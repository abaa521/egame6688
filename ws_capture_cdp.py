from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth
import pprint
import time
import main
import urllib.parse
import base64
import json
import zlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import hashlib
import sys

# Ensure requests uses the exact same UA as playwright
import requests
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
old_init = requests.Session.__init__
def new_init(self):
    old_init(self)
    self.headers.update({"User-Agent": UA})
requests.Session.__init__ = new_init

import os

def encrypt_payload(salt, current_token, payload_str):
    key_material = (current_token + salt).encode('utf-8')
    key = hashlib.sha256(key_material).digest()
    iv = os.urandom(12)
    
    # 1. Compress
    compressed = zlib.compress(payload_str.encode('utf-8'))
    
    # 2. Encrypt
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(compressed) + encryptor.finalize()
    tag = encryptor.tag
    
    # 3. Assemble: Engine.io 0x04 + iv + tag + ciphertext
    payload = b'\x04' + iv + tag + ciphertext
    return base64.b64encode(payload).decode('utf-8')

def decrypt_payload(salt, current_token, payload):
    key_material = (current_token + salt).encode('utf-8')
    key = hashlib.sha256(key_material).digest()
    iv = payload[:12]
    tag = payload[12:28]
    ciphertext = payload[28:]
    cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag))
    decryptor = cipher.decryptor()
    decrypted_compressed = decryptor.update(ciphertext) + decryptor.finalize()
    try:
        json_str = zlib.decompress(decrypted_compressed)
    except:
        try:
            json_str = zlib.decompress(decrypted_compressed, -zlib.MAX_WBITS)
        except:
            json_str = zlib.decompress(decrypted_compressed, 32 + zlib.MAX_WBITS)
    return json.loads(json_str.decode('utf-8'))

def run():
    session, token = main.login()
    if not session or not token:
        print("Login failed")
        return
        
    url = session.get('https://egame6688.com/webapi/gameApi/playGame/12369?device=1', headers={'Authorization': f'Bearer {token}'}, allow_redirects=False).headers.get('Location')
    
    if not url:
        print("Failed to get game url")
        return

    q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    ws_token = q.get('t', [''])[0]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'])
        context = browser.new_context(user_agent=UA, viewport={'width': 1280, 'height': 720})
        page = context.new_page()
        
        # Apply stealth!
        Stealth().apply_stealth_sync(page)

        # Our stealthy WS hook
        script = """
        const NativeWebSocket = window.WebSocket;
        const WSProxy = new Proxy(NativeWebSocket, {
            construct(target, args) {
                const ws = new target(...args);
                window.game_ws = ws;
                return ws;
            }
        });
        window.WebSocket = WSProxy;
        """
        page.add_init_script(script)

        cdp = page.context.new_cdp_session(page)
        cdp.send('Network.enable')
        
        ws_request_id = None
        has_sent_initial = False
        
        current_token = ws_token
        current_salt = ""
        got_data = False
        first_token = ws_token
        dynamic_total_pages = 7
        
        def handle_ws_created(event):
            nonlocal ws_request_id
            print('WS Created:', event['url'])
            ws_request_id = event['requestId']
            
        def handle_ws_frame_recv(event):
            nonlocal current_salt, current_token, got_data, first_token, dynamic_total_pages
            opcode = event['response']['opcode']
            payload = event['response']['payloadData']
            print(f"WS RECV OPCODE: {opcode}, payload size: {len(payload)}")
            if len(payload) > 0 and len(payload) < 200:
                print(f"WS RECV TEXT: {payload[:200]}")
            
            if opcode == 2:
                raw = base64.b64decode(payload)
                if raw[0] == 4:
                    raw = raw[1:] # Strip Engine.io header \x04
                try:
                    dec = decrypt_payload(current_salt, current_token, raw)
                    
                    msg_str = json.dumps(dec, ensure_ascii=False)
                    if dec and dec.get('eventName') == 'initial':
                        print('\n--- DECRYPTED BINARY (INITIAL) ---')
                        print(msg_str[:200] + '...')

                        out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "initial_payload.json")
                        with open(out_path, "w", encoding="utf-8") as f:
                            f.write(msg_str)
                        print('------------------------\n')
                        
                        try:
                            requests.post('http://localhost:3000/rooms/internal/update', json=dec, timeout=3)
                        except Exception as e:
                            print('API Push failed:', e)
                    elif dec and dec.get('eventName') == 'getSlotTables':
                        print('\n--- DECRYPTED BINARY (GETSLOTTABLES) ---')
                        print(msg_str[:200] + '...')
                        if 'tableMeta' in dec and 'totalPages' in dec['tableMeta']:
                            dynamic_total_pages = int(dec['tableMeta']['totalPages'])
                            print(f"[!] Updated dynamic_total_pages to {dynamic_total_pages}")
                        try:
                            # 由於我們需要讓 API 也收到不斷更新的值，我們也可以傳送給它
                            requests.post('http://localhost:3000/rooms/internal/update', json=dec, timeout=3)
                        except Exception:
                            pass
                        
                    else:
                        print('\n--- DECRYPTED BINARY ---')
                        print(msg_str[:150] + '...')
                    if dec and 'encryption' in dec and 'salt' in dec['encryption']:
                        current_salt = dec['encryption']['salt']
                        print(f"Updated Salt: {current_salt}")
                    if dec and 'token' in dec:
                        current_token = dec['token']
                        print(f"Updated Token: {current_token}")
                except Exception as e:
                      print(f"WS Decryption Error: {e}")
            else:
                if len(payload) < 2000:
                    print(">>> TEXT RESPONSE <<<")
                    print(payload)
                else:
                    print(f">>> LARGE TEXT RESPONSE <<< ({len(payload)} bytes)")
                    print(payload[:300] + " ... " + payload[-100:])
                    
                if 'totalPages' in payload:
                    try:
                        import re
                        m = re.search(r'"totalPages":(\d+)', payload)
                        if m:
                            pass
                            # But wait, dynamic_total_pages is not global in this scope, let's just print it.
                            print(f"!!! FOUND TOTAL PAGES: {m.group(1)} !!!")
                    except:
                        pass
        
        def handle_ws_frame_sent(event):
            nonlocal has_sent_initial, current_token, first_token
            payload = event['response']['payloadData']
            print(f"WS SENT: {payload[:200]}")
            if payload.startswith('420["initial",'):
                has_sent_initial = True
                try:
                    data = json.loads(payload[3:])
                    tok = data[1]['token']
                    if not current_token:
                        current_token = tok
                        first_token = tok
                        print(f'Captured token from request: {current_token}')
                except:
                    pass

        cdp.on('Network.webSocketCreated', handle_ws_created)
        cdp.on('Network.webSocketFrameReceived', handle_ws_frame_recv)
        cdp.on('Network.webSocketFrameSent', handle_ws_frame_sent)
        
        print("Navigating to game URL...")
        page.goto(url, referer="https://egame6688.com/")
        print('Waiting for game to load and initial sequence...')
        
        for _ in range(30):
            page.wait_for_timeout(1000)
            print(f"Current token: {current_token}, first token: {first_token}")
            if current_token != first_token:
                break

        if current_token == first_token:
            print('Timeout waiting for initial keys.')
            return

        print('Initial sequence completed! Keys captured. Injecting getSlotTables...')
        got_data = False
        print('Daemon mode running... starting auto-pagination patrol.')
        
        import sys
        
        target_page = None
        if len(sys.argv) > 1:
            try:
                target_page = int(sys.argv[1])
                print(f"Targeting specific page: {target_page}")
            except ValueError:
                pass
                
        current_page_idx = target_page if target_page else 1
        dynamic_total_pages = 7 # 預設有 7 頁 (共 3500 間)
        
        while True:
            # 每 1 秒翻下一頁
            page.wait_for_timeout(1000)
            
            try:
                # 執行 JS 向 WS 發送換頁請求
                js_cmd = f"window.game_ws.send('42[\"getSlotTables\",{{\"page\":{current_page_idx}}}]')"
                page.evaluate(js_cmd)
                print(f"-> Requested Page {current_page_idx}/{dynamic_total_pages}")
                
                # 自動輪視所有頁面或卡在單一頁面
                if not target_page:
                    current_page_idx += 1
                    if current_page_idx > dynamic_total_pages:
                        current_page_idx = 1
                    
            except Exception as e:
                print(f"Error during pagination injection: {e}")

if __name__ == '__main__':
    run()


