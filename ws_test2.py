import websocket

def on_message(ws, message):
    print(f"\n[WS RECV] {message}")

def on_error(ws, error):
    print(f"\n[WS ERROR] {error}")

def on_close(ws, close_status_code, close_msg):
    print("\n[WS CLOSED]")

def on_open(ws):
    print("\n[WS OPEN] Successfully connected!")
    # For SocketIO EIO=3, send "2probe" or something? Actually wait for "0" then send "40"
    ws.send("40") # Socket.IO connect

ws_url = "wss://socket.godeebxp.com/socket.io/?EIO=3&transport=websocket"
print("Trying:", ws_url)
ws = websocket.WebSocketApp(ws_url,
                          on_open=on_open,
                          on_message=on_message,
                          on_error=on_error,
                          on_close=on_close)
ws.run_forever()
