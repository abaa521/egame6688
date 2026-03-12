
import requests, re
import urllib3
urllib3.disable_warnings()

url = "https://egame6688.com/_nuxt/CdJ_s8N7.js"
t = requests.get(url, verify=False).text

matches = re.findall(r"([a-zA-Z0-9_]+):.{1,20}?(/api/webapi/[a-zA-Z0-9_/\$\{?\}]+)", t)
for m in matches:
    print(m)

