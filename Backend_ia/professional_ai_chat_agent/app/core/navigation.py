import json
from pathlib import Path


class NavigationEngine:

    def __init__(self):

        data_path = Path("app/data/rutas.json")

        if data_path.exists():

            with open(data_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            self.routes = data.get("routes", [])

        else:
            self.routes = []

    def find_route(self, message: str):

        message = message.lower()

        for route in self.routes:

            for keyword in route.get("keywords", []):

                if keyword.lower() in message:

                    return {
                        "name": route.get("name"),
                        "route": route.get("route"),
                        "action": route.get("action"),
                        "description": route.get("description")
                    }

        return None