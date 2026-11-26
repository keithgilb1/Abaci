"""The Abaci API: the React app's only way to reach data. Local only (binds 127.0.0.1).

    python -m abaci.server            # http://127.0.0.1:8787, serves app/dist too once built

Endpoints
    GET  /api/health                  warehouse, semantic manifest, Ask Abaci model status
    GET  /api/catalog                 governed metrics and dimensions
    GET  /api/saved/<name>            a saved query from dbt/models/semantic/saved_queries.yml
    POST /api/query                   a query spec (same shape Ask Abaci produces), validated
    POST /api/lab/simulate            credit policy lab
    POST /api/ask                     {"question": "..."} -> Ask Abaci answer

Every endpoint goes through abaci.semantic_layer, so no screen writes its own metric SQL.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import mimetypes
import os
import threading
import traceback
from functools import lru_cache
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

from abaci import lab, semantic_layer
from abaci.ask import spec as specs
from abaci.paths import ROOT, SEMANTIC_MANIFEST_PATH, WAREHOUSE_PATH

DIST = ROOT / "app" / "dist"
MAX_BODY = 64 * 1024
_saved_lock = threading.Lock()


def _default(o):
    if isinstance(o, dt.datetime | dt.date):
        return o.isoformat()
    if hasattr(o, "item"):
        return o.item()
    raise TypeError(type(o).__name__)


@lru_cache(maxsize=64)
def _saved(name: str) -> list[dict]:
    with _saved_lock:
        return semantic_layer.query_saved(name)


def health() -> dict:
    from abaci.ask import model

    ok, why = model.available()
    return {
        "warehouse": WAREHOUSE_PATH.name,
        "warehouse_exists": WAREHOUSE_PATH.exists(),
        "semantic_manifest": SEMANTIC_MANIFEST_PATH.exists(),
        "ask_available": ok,
        "ask_detail": why,
        "ask_adapter": model.adapter_loaded(),
        "ask_model": model.BASE_MODEL,
    }


def catalog() -> dict:
    return {
        "metrics": [
            {"name": m.name, "label": m.label, "description": m.description, "owner": m.owner, "certified": m.certified}
            for m in specs.answerable_metrics().values()
        ],
        "dimensions": semantic_layer.dimensions(),
        "saved_queries": semantic_layer.saved_query_names(),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "Abaci/1"

    def log_message(self, fmt, *args):  # quieter: one line per request
        if os.environ.get("ABACI_QUIET") != "1":
            super().log_message(fmt, *args)

    def _send(self, status: int, body: bytes, ctype: str = "application/json") -> None:
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, status: int = 200) -> None:
        self._send(status, json.dumps(obj, default=_default).encode())

    def _body(self) -> dict:
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise ValueError("Request too large.")
        data = json.loads(self.rfile.read(n) or b"{}")
        if not isinstance(data, dict):
            raise ValueError("Expected a JSON object.")
        return data

    def _guard(self, fn):
        try:
            fn()
        except (ValueError, specs.SpecError) as e:
            self._json({"error": str(e)}, HTTPStatus.BAD_REQUEST)
        except Exception as e:  # pragma: no cover - surfaced to the UI
            traceback.print_exc()
            self._json({"error": f"{type(e).__name__}: {str(e).splitlines()[0][:300]}"}, HTTPStatus.INTERNAL_SERVER_ERROR)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            return self._guard(lambda: self._json(health()))
        if path == "/api/catalog":
            return self._guard(lambda: self._json(catalog()))
        if path.startswith("/api/saved/"):
            name = unquote(path.removeprefix("/api/saved/"))
            return self._guard(lambda: self._json({"name": name, "rows": _saved(name)}))
        if path.startswith("/api/"):
            return self._json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
        return self._static(path)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/query":
            return self._guard(self._query)
        if path == "/api/lab/simulate":
            return self._guard(lambda: self._json(lab.simulate(self._body())))
        if path == "/api/ask":
            return self._guard(self._ask)
        return self._json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def _query(self):
        spec = specs.validate(self._body())
        self._json({"spec": spec.to_json(), "notes": spec.notes, "rows": specs.run(spec)})

    def _ask(self):
        from abaci.ask.answer import ask

        body = self._body()
        q = str(body.get("question") or "").strip()
        if not q:
            raise ValueError("Ask a question.")
        self._json(ask(q, use_adapter=bool(body.get("use_adapter", True))))

    def _static(self, path: str):
        if not DIST.exists():
            return self._send(200, b"Abaci API is running. Build the app with `make app`, or run `npm run dev` in app/.", "text/plain")
        target = (DIST / path.lstrip("/")).resolve()
        if not str(target).startswith(str(DIST.resolve())) or not target.is_file():
            target = DIST / "index.html"  # single-page app: let the client router handle it
        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        self._send(200, target.read_bytes(), ctype)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=int(os.environ.get("ABACI_PORT", 8787)))
    args = ap.parse_args()
    httpd = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Abaci API on http://127.0.0.1:{args.port}  (warehouse: {WAREHOUSE_PATH})", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
