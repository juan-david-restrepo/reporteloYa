import json
import unicodedata
from pathlib import Path
import os


class NavigationEngine:

    def __init__(self):
        base_path = Path(__file__).parent.parent / "data"
        data_path = base_path / "rutas.json"

        if not data_path.exists():
            data_path = Path("app/data/rutas.json")

        if data_path.exists():
            with open(data_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.routes = data.get("routes", [])
        else:
            self.routes = []

    def _normalize(self, text: str) -> str:
        """Normaliza texto: minúsculas, sin acentos"""
        if not text:
            return ""
        result = unicodedata.normalize('NFD', text.lower())
        result = ''.join(c for c in result if unicodedata.category(c) != 'Mn')
        return result.strip()

    def find_route(self, message: str):
        if not message or not message.strip():
            return None

        message_norm = self._normalize(message)
        best_match = None
        best_score = 0

        for route in self.routes:
            keywords = route.get("keywords", [])
            
            for keyword in keywords:
                keyword_norm = self._normalize(keyword)
                
                if keyword_norm in message_norm:
                    score = len(keyword_norm)
                    if score > best_score:
                        best_score = score
                        best_match = {
                            "name": route.get("name"),
                            "route": route.get("route"),
                            "action": route.get("action"),
                            "description": route.get("description")
                        }

        return best_match