import requests, re
url = 'https://egame6688.com'
res = requests.get(url)
js_files = re.findall(r'/(_nuxt/[a-zA-Z0-9_\-A-Z.]+\.js)', res.text)
js_files = list(set(js_files))

all_js = []
for js in js_files:
    js_url = f'{url}/{js}'
    js_text = requests.get(js_url).text
    all_js.append(js_text)
    api_strings = re.findall(r'\"([/a-zA-Z0-9_-]*webapi[/a-zA-Z0-9_-]*)\"', js_text)
    if api_strings:
        print(f'\n--- {js} ---')
        for s in set(api_strings):
            print(s)

