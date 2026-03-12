import socketio
import urllib.parse
import main
import time

sio = socketio.Client()

@sio.event
def connect():
    print('[SIO] connection established')
    # Try sending login
    payload = {"eventName": "login", "token": ws_params.get("t")}
    print(f'[SIO SEND] message with payload: {payload}')
    sio.send(payload)
    
    # Or emit login?
    sio.emit('login', payload)
    sio.emit('message', payload)
    
    # Try getting slot lobbies
    sio.emit('message', {"eventName": "getSlotTables"})

@sio.event
def message(data):
    print('[SIO RECV message]', data)

@sio.on('*')
def catch_all(event, data):
    print(f'[SIO RECV event "{event}"]', data)

@sio.event
def disconnect():
    print('[SIO] disconnected from server')

session, token = main.login()
if not session:
    print("Login failed")
    exit(1)
    
api_url = f"https://egame6688.com/webapi/gameApi/playGame/12369?device=1"
headers = {"Authorization": f"Bearer {token}", "User-Agent": "Mozilla/5.0"}
resp = session.get(api_url, headers=headers, allow_redirects=False, verify=False)
game_url = resp.headers.get("Location")

print("Got game_url:", game_url)
ws_params = urllib.parse.urlparse(game_url)
ws_params = urllib.parse.parse_qs(ws_params.query)
ws_params = {k: v[0] for k, v in ws_params.items()}

ws_url = f"https://{ws_params['socket_url']}"
print("Connecting to ws_url:", ws_url)
try:
    sio.connect(ws_url, transports=['websocket'])
    sio.wait()
except Exception as e:
    print(e)
