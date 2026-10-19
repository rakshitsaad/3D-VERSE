# Local preview server: python's http.server with caching disabled, so edits always show on reload.
import http.server


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    http.server.test(HandlerClass=NoCacheHandler, port=8000, bind="127.0.0.1")
