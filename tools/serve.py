# Local preview server that tells the browser never to cache, so a reload always shows the current files.
# It answers one byte range ("bytes=a-b", 206 Partial Content) as the real host does, so a streamed <audio> element can
# seek (music lane, 2026-11-15: the background music, src/core/music.js). Anything else is served as before.
import http.server, sys, functools, os, re
class H(http.server.SimpleHTTPRequestHandler):
    _ranged = False
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
    def send_head(self):
        self._ranged = False
        m = re.fullmatch(r'bytes=(\d*)-(\d*)', self.headers.get('Range', '').strip())
        path = self.translate_path(self.path)
        if not m or (m.group(1) == '' and m.group(2) == '') or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        if m.group(1) == '':
            start, end = max(0, size - int(m.group(2))), size - 1
        else:
            start, end = int(m.group(1)), min(size - 1, int(m.group(2)) if m.group(2) else size - 1)
        if start >= size or start > end:
            self.send_response(416); self.send_header('Content-Range', f'bytes */{size}'); self.send_header('Content-Length', '0'); self.end_headers()
            return None
        f = open(path, 'rb'); f.seek(start)
        self._ranged, self._left = True, end - start + 1
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(self._left))
        self.end_headers()
        return f
    def copyfile(self, source, outputfile):
        if not self._ranged:
            return super().copyfile(source, outputfile)
        left = self._left
        while left > 0:
            chunk = source.read(min(65536, left))
            if not chunk: break
            outputfile.write(chunk); left -= len(chunk)
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), functools.partial(H, directory=sys.argv[1])).serve_forever()
