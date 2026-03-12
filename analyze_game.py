import requests
import re
from bs4 import BeautifulSoup

def analyze_vendor_js(game_url):
    print(f"分析遊戲網址 HTML: {game_url}")
    try:
        resp = requests.get(game_url, verify=False)
        soup = BeautifulSoup(resp.text, 'lxml')
        scripts = soup.find_all('script')
        js_links = []
        for s in scripts:
            if s.get('src'):
                src = s.get('src')
                # 處理相對路徑
                if src.startswith('/'):
                    src = 'https://play.godeebxp.com' + src
                elif not src.startswith('http'):
                    src = 'https://play.godeebxp.com/egames/' + src
                js_links.append(src)
                
        print(f"找到 {len(js_links)} 個 JS 檔案，開始分析...")
        
        for js_url in js_links:
            try:
                js_resp = requests.get(js_url, verify=False, timeout=10)
                js_text = js_resp.text
                
                # 搜尋 websocket 或 eventName 或 send 相關的 dict
                ws_matches = re.finditer(r'eventName[\"\']?\s*:\s*[\"\']([^\"\']+)[\"\']', js_text)
                events = set(m.group(1) for m in ws_matches)
                if events:
                    print(f"\n[!] 在 {js_url} 發現 WebSocket events:")
                    print(", ".join(events))
                    
                # 搜尋發送封包的格式 { eventName:... }
                send_matches = re.findall(r'(\{[^{}]*eventName\s*:\s*[\"\'\w]+[^{}]*\})', js_text)
                if send_matches:
                    print(f"[!] 發現潛在的發送封包格式:")
                    for idx, sm in enumerate(send_matches[:5]): # 只印前5個
                        print(f"  {idx+1}.", sm)

            except Exception as e:
                pass

    except Exception as e:
        print("失敗:", e)

if __name__ == '__main__':
    url = input('輸入game_url: ')
    analyze_vendor_js(url)
