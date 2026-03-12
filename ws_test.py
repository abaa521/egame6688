import requests
import json
import urllib.parse
import websocket
import threading
import time

def parse_url(url):
    parsed = urllib.parse.urlparse(url)
    q = urllib.parse.parse_qs(parsed.query)
    return {k: v[0] for k, v in q.items()}

def on_message(ws, message):
    print(f"\n[WS RECV] {message[:200]}")

def on_error(ws, error):
    print(f"\n[WS ERROR] {error}")

def on_close(ws, close_status_code, close_msg):
    print("\n[WS CLOSED]")

def on_open(ws):
    print("\n[WS OPEN] Successfully connected!")
    # Send ping or test events
    def run():
        # Maybe send getSlotTables
        payload = {"eventName": "getSlotTables"}
        print(f"[WS SEND] {payload}")
        ws.send(json.dumps(payload))
        time.sleep(2)
        
        # Test login?
        payload2 = {"eventName": "login", "token": ws_params.get("t")}
        print(f"[WS SEND] {payload2}")
        ws.send(json.dumps(payload2))
        time.sleep(2)

        # Or send initial
        payload3 = {"eventName": "initial"}
        print(f"[WS SEND] {payload3}")
        ws.send(json.dumps(payload3))
        
        time.sleep(5)
        ws.close()
    
    threading.Thread(target=run).start()

# 1. Fetch fresh game URL via main.py concepts
import main
session, token = main.login()
if not session:
    print("Login failed")
    exit(1)
    
api_url = f"https://egame6688.com/webapi/gameApi/playGame/12369?device=1"
headers = {"Authorization": f"Bearer {token}", "User-Agent": "Mozilla/5.0"}
resp = session.get(api_url, headers=headers, allow_redirects=False, verify=False)
game_url = resp.headers.get("Location")

print("Got game_url:", game_url)
ws_params = parse_url(game_url)

# Construct ws URL
ws_url = f"wss://{ws_params['socket_url']}/ws" # guess path: /ws or / or /socket.io
print("Connecting to ws_url:", ws_url)
ws_url_full = f"{ws_url}?token={ws_params['t']}&gameId={ws_params.get('gn')}" # guess params
print("Or maybe:", ws_url_full)

# Try connecting
ws = websocket.WebSocketApp(f"wss://{ws_params['socket_url']}/",
                          on_open=on_open,
                          on_message=on_message,
                          on_error=on_error,
                          on_close=on_close)
ws.run_forever()
