import sys
sys.path.insert(0, '.')

from app.core.brain import Brain
from unittest.mock import MagicMock

class MockDB:
    pass

brain = Brain(MockDB())

test_cases = [
    # Casos que ANTES fallaban (mostraban mis_reportes en vez de crear_reporte)
    ("reportar incidente", "crear_reporte"),
    ("donde puedo reportar un incidente?", "crear_reporte"),
    ("quiero reportar un accidente", "crear_reporte"),
    ("reportar accidente", "crear_reporte"),
    ("necesito reportar algo", "crear_reporte"),
    ("reportar", "crear_reporte"),
    ("denunciar", "crear_reporte"),
    
    # Casos que DEBEN ser crear_reporte
    ("hay un accidente en la vía", "crear_reporte"),
    ("me crashearon", "crear_reporte"),
    ("vi que alguien estacionó mal", "crear_reporte"),
    ("bloqueando la entrada", "crear_reporte"),
    ("semáforo dañado", "crear_reporte"),
    
    # Casos que DEBEN ser mis_reportes
    ("ver mis reportes", "mis_reportes"),
    ("quiero ver mis reportes", "mis_reportes"),
    ("mostrar mis reportes", "mis_reportes"),
    ("mis reportes", "mis_reportes"),
    ("cómo van mis reportes?", "mis_reportes"),
    
    # Casos que DEBEN ser estadísticas
    ("estadísticas de mis reportes", "estadisticas_mis_reportes"),
    ("cuántos reportes tengo", "estadisticas_mis_reportes"),
    
    # Saludos
    ("hola", "NONE"),
    ("buenos días", "NONE"),
]

print("=" * 70)
print("TESTEANDO _select_citizen_tool() ROBUSTO")
print("=" * 70)

passed = 0
failed = 0

for mensaje, expected_tool in test_cases:
    result = brain._select_citizen_tool(mensaje)
    actual_tool = result.get("tool", "NONE")
    
    status = "✅ PASS" if actual_tool == expected_tool else "❌ FAIL"
    
    if actual_tool == expected_tool:
        passed += 1
    else:
        failed += 1
    
    print(f"\n{status}")
    print(f"  Mensaje: '{mensaje}'")
    print(f"  Esperado: {expected_tool}")
    print(f"  Obtenido: {actual_tool}")
    if actual_tool != expected_tool:
        print(f"  ⚠️  INCORRECTO!")

print("\n" + "=" * 70)
print(f"RESULTADOS: {passed} passed, {failed} failed")
print("=" * 70)

if failed == 0:
    print("\n🎉 TODOS LOS TESTS PASARON!")
else:
    print(f"\n⚠️  {failed} tests fallaron. Revisar router.")
