from app.core.navigation import NavigationEngine

nav = NavigationEngine()

tests = [
    "quiero reportar un carro mal estacionado",
    "como ver mis reportes",
    "quiero registrarme",
    "olvide mi contraseña"
]

for msg in tests:

    result = nav.find_route(msg)

    print("\nMensaje:", msg)

    if result:
        print("Ruta encontrada:", result["route"])
    else:
        print("No encontró ruta")