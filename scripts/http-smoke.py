#!/usr/bin/env python3
"""Real HTTP guest/cookie smoke checks against the isolated running harness."""
import json, os, urllib.request, urllib.error, http.cookiejar
base = os.environ.get('AGROMATE_URL', 'http://127.0.0.1:8088')
jar = http.cookiejar.CookieJar()
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def call(path, method='GET', body=None, headers=None):
    req=urllib.request.Request(base+path, data=None if body is None else json.dumps(body).encode(),method=method, headers={'Accept':'application/json', 'Content-Type':'application/json', **(headers or {})})
    try: response=client.open(req)
    except urllib.error.HTTPError as error: response=error
    return response.status, response.headers, response.read()
status, headers, body=call('/')
assert status==200 and b'property="og:title"' in body and b'<canvas id="game"' in body
status, headers, body=call('/game.js')
assert status==200 and b'const fresh=' in body and 'javascript' in headers['Content-Type']
status, headers, body=call('/api/session')
assert status==200
session=json.loads(body)
assert session['user'] is None and session['csrf_token'] and session['login_available'] is False
cookie_headers=headers.get_all('Set-Cookie')
assert any('httponly' in value.lower() and 'samesite=lax' in value.lower() for value in cookie_headers)
assert 'no-store' in headers.get('Cache-Control','')
assert call('/api/save')[0]==401
assert call('/api/save','PUT',{})[0]==419
assert call('/api/logout','POST',{})[0]==419
assert call('/api/save','PUT',{}, {'X-CSRF-TOKEN':session['csrf_token']})[0]==401
assert call('/auth/google')[0]==503
assert call('/auth/google/callback?state=invalid&code=invalid')[0]==503
assert json.loads(call('/api/leaderboard')[2]).keys()=={'entries'}
print('PASS: 13 real HTTP assertions: raw metadata/assets, same-origin session, HttpOnly/SameSite cookie, no-store, auth, CSRF, fail-closed OAuth and public scoreboard')
