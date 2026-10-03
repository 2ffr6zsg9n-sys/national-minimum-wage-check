"""Local preview and read-only proxy to CARculator's existing reference-data API."""
import json
import os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parent
API_BASE = 'https://1g0vserusc.execute-api.eu-west-2.amazonaws.com'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.split('?')[0] != '/api/reference-data':
            return super().do_GET()
        key = os.environ.get('CARCULATOR_PASSKEY', '')
        if not key:
            return self.json_response(503, {'error': 'CARculator access is not configured.'})
        def load(endpoint):
            req = Request(API_BASE + '/' + endpoint, headers={'x-quote-api-key': key})
            with urlopen(req, timeout=20) as response:
                body = json.load(response)
            if not isinstance(body.get('items'), list) or not body['items']:
                raise ValueError('Missing reference data')
            return body['items']
        try:
            with ThreadPoolExecutor(max_workers=2) as pool:
                afc = pool.submit(load, 'agenda-for-change-pay-rates')
                nmw = pool.submit(load, 'national-minimum-wage-rates')
                result = {'afc': afc.result(), 'nmw': nmw.result()}
            self.json_response(200, result)
        except (HTTPError, URLError, ValueError, TimeoutError):
            self.json_response(502, {'error': 'Shared CARculator data could not be loaded.'})

    def json_response(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8765'))
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'National Minimum Wage Check: http://127.0.0.1:{port}', flush=True)
    server.serve_forever()
