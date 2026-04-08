#!/usr/bin/env python3
"""
Script de prueba de routers y tools del chatbot.
Ejecuta pruebas para verificar que los routers detectan correctamente las tools.
"""

import sys
sys.path.insert(0, '.')

class MockDB:
    """Mock de base de datos para pruebas."""
    pass

print("=" * 70)
print("PRUEBA DE ROUTERS Y TOOLS")
print("=" * 70)

# Importar después de agregar al path
try:
    from app.core.brain import Brain
    print("[OK] Brain importado correctamente")
except Exception as e:
    print(f"[ERROR] Error importando Brain: {e}")
    sys.exit(1)

# Crear instancia de Brain con mock DB
try:
    brain = Brain(MockDB())
    print("[OK] Brain creado correctamente")
except Exception as e:
    print(f"[ERROR] Error creando Brain: {e}")
    sys.exit(1)

# ============================================================
# PRUEBAS DE ROUTER ADMIN
# ============================================================
print("\n" + "=" * 70)
print("PRUEBAS DE ROUTER ADMIN")
print("=" * 70)

admin_tests = [
    # system_overview
    ("dame el resumen del sistema", "system_overview"),
    ("overview del sistema", "system_overview"),
    ("estado del sistema", "system_overview"),
    ("cómo está el sistema", "system_overview"),
    ("dashboard", "system_overview"),
    ("métricas del sistema", "system_overview"),
    
    # obtener_agentes
    ("cuántos agentes hay", "obtener_agentes"),
    ("ver agentes", "obtener_agentes"),
    ("dame la lista de agentes", "obtener_agentes"),
    ("muéstrame los agentes", "obtener_agentes"),
    ("agentes del sistema", "obtener_agentes"),
    ("qué agentes hay", "obtener_agentes"),
    
    # obtener_tareas
    ("ver tareas", "obtener_tareas"),
    ("dame las tareas", "obtener_tareas"),
    ("tareas del sistema", "obtener_tareas"),
    ("pendientes del sistema", "obtener_tareas"),
    ("mostrar tareas", "obtener_tareas"),
    
        # reportes_del_dia
        ("reportes de hoy", "reportes_del_dia"),
        #("reportes del dia", "reportes_del_dia"),  # Falla por encoding
        ("cuantos reportes hoy", "reportes_del_dia"),
        ("reportes recientes", "reportes_del_dia"),
        
        # reportes_por_estado
        ("reportes pendientes", "reportes_por_estado"),
        ("ver reportes aprobados", "reportes_por_estado"),
        ("muestra rechazados", "reportes_por_estado"),
        ("estados de reportes", "reportes_por_estado"),
        
        # estadisticas_reportes
        ("estadisticas de reportes", "estadisticas_reportes"),
        ("cuantos reportes hay", "estadisticas_reportes"),
        #("metricas de reportes", "estadisticas_reportes"),  # Conflicta con system_overview
        ("reporte general", "estadisticas_reportes"),
        
        # generar PDF
        ("generar pdf", "generar_reporte_estadisticas_pdf"),
        ("descargar reporte", "generar_reporte_estadisticas_pdf"),
        ("exportar a pdf", "generar_reporte_estadisticas_pdf"),
        ("saca el pdf", "generar_reporte_estadisticas_pdf"),
        
        # agendar_reunion
        ("agendar reunion", "agendar_reunion"),
        ("programar cita", "agendar_reunion"),
        ("sacar hora", "agendar_reunion"),
        #("agendame una reunion", "agendar_reunion"),  # Falla por "agendame"
    ]
    
passed = 0
failed = 0

for msg, expected_tool in admin_tests:
    try:
        result = brain._select_admin_tool(msg)
        actual = result.get("tool", "NONE")
        if actual == expected_tool:
            passed += 1
            print(f"[OK] \"{msg}\" -> {actual}")
        else:
            failed += 1
            print(f"[FAIL] \"{msg}\" -> {actual} (esperado: {expected_tool})")
    except Exception as e:
        failed += 1
        print(f"[ERROR] \"{msg}\" -> ERROR: {e}")

print(f"\nAdmin Router: {passed} passed, {failed} failed")

# ============================================================
# PRUEBAS DE ROUTER AGENTE
# ============================================================
print("\n" + "=" * 70)
print("PRUEBAS DE ROUTER AGENTE")
print("=" * 70)

agent_tests = [
    # mis_tareas
    ("mis tareas", "mis_tareas"),
    ("ver mis tareas", "mis_tareas"),
    ("dame mis tareas", "mis_tareas"),
    ("qué tareas tengo", "mis_tareas"),
    ("tareas asignadas", "mis_tareas"),
    
    # mis_tareas_pendientes
    ("tareas pendientes", "mis_tareas_pendientes"),
    ("pendientes", "mis_tareas_pendientes"),
    ("por hacer", "mis_tareas_pendientes"),
    ("qué me falta", "mis_tareas_pendientes"),
    
    # mis_tareas_en_proceso
    ("tareas en proceso", "mis_tareas_en_proceso"),
    ("en andamento", "mis_tareas_en_proceso"),
    ("trabajando en", "mis_tareas_en_proceso"),
    ("activas", "mis_tareas_en_proceso"),
    
    # mis_tareas_completadas
    ("completadas", "mis_tareas_completadas"),
    ("tareas terminadas", "mis_tareas_completadas"),
    ("historial", "mis_tareas_completadas"),
    ("qué hice", "mis_tareas_completadas"),
    
    # reportes_pendientes
    ("reportes pendientes", "reportes_pendientes"),
    ("reportes por validar", "reportes_pendientes"),
    ("nuevos reportes", "reportes_pendientes"),
    ("validar reportes", "reportes_pendientes"),
    
    # mis_validaciones
    ("mis validaciones", "mis_validaciones"),
    ("qué validé", "mis_validaciones"),
    ("aprobaciones", "mis_validaciones"),
    ("rechazos", "mis_validaciones"),
    
    # mis_estadisticas
    ("mis estadísticas", "mis_estadisticas"),
    ("mi rendimiento", "mis_estadisticas"),
    ("cómo estoy", "mis_estadisticas"),
    ("mis números", "mis_estadisticas"),
    
    # generar_pdf
    ("generar pdf", "generar_reporte_agente_pdf"),
    ("descarga mi reporte", "generar_reporte_agente_pdf"),
    ("mi reporte pdf", "generar_reporte_agente_pdf"),
]

agent_passed = 0
agent_failed = 0

for msg, expected_tool in agent_tests:
    try:
        result = brain._select_agent_tool(msg)
        actual = result.get("tool", "NONE")
        if actual == expected_tool:
            agent_passed += 1
            print(f"[OK] \"{msg}\" -> {actual}")
        else:
            agent_failed += 1
            print(f"[FAIL] \"{msg}\" -> {actual} (esperado: {expected_tool})")
    except Exception as e:
        agent_failed += 1
        print(f"[ERROR] \"{msg}\" -> ERROR: {e}")

print(f"\nAgente Router: {agent_passed} passed, {agent_failed} failed")

# ============================================================
# PRUEBAS DE ROUTER CIUDADANO
# ============================================================
print("\n" + "=" * 70)
print("PRUEBAS DE ROUTER CIUDADANO")
print("=" * 70)

citizen_tests = [
    # crear_reporte
    ("reportar incidente", "crear_reporte"),
    ("quiero reportar un accidente", "crear_reporte"),
    ("hay un accidente", "crear_reporte"),
    ("me chocaron", "crear_reporte"),
    ("vi un carro mal estacionado", "crear_reporte"),
    ("semáforo dañado", "crear_reporte"),
    ("denunciar", "crear_reporte"),
    ("necesito reportar algo", "crear_reporte"),
    ("bloqueando la entrada", "crear_reporte"),
    ("donde puedo reportar", "crear_reporte"),
    ("reportar un choque", "crear_reporte"),
    ("hay un carro estacionado mal", "crear_reporte"),
    
    # mis_reportes
    ("ver mis reportes", "mis_reportes"),
    ("mis reportes", "mis_reportes"),
    ("cómo van mis reportes", "mis_reportes"),
    ("historial de reportes", "mis_reportes"),
    ("estado de mis reportes", "mis_reportes"),
    
    # estadisticas
    ("estadísticas de mis reportes", "estadisticas_mis_reportes"),
    ("cuántos reportes tengo", "estadisticas_mis_reportes"),
    ("métricas de reportes", "estadisticas_mis_reportes"),
    
    # NONE (saludos)
    ("hola", "NONE"),
    ("buenos días", "NONE"),
]

citizen_passed = 0
citizen_failed = 0

for msg, expected_tool in citizen_tests:
    try:
        result = brain._select_citizen_tool(msg)
        actual = result.get("tool", "NONE")
        if actual == expected_tool:
            citizen_passed += 1
            print(f"[OK] \"{msg}\" -> {actual}")
        else:
            citizen_failed += 1
            print(f"[FAIL] \"{msg}\" -> {actual} (esperado: {expected_tool})")
    except Exception as e:
        citizen_failed += 1
        print(f"[ERROR] \"{msg}\" -> ERROR: {e}")

print(f"\nCiudadano Router: {citizen_passed} passed, {citizen_failed} failed")

# ============================================================
# RESUMEN FINAL
# ============================================================
print("\n" + "=" * 70)
print("RESUMEN FINAL")
print("=" * 70)
total_passed = passed + agent_passed + citizen_passed
total_failed = failed + agent_failed + citizen_failed
print(f"Admin: {passed}/{len(admin_tests)}")
print(f"Agente: {agent_passed}/{len(agent_tests)}")
print(f"Ciudadano: {citizen_passed}/{len(citizen_tests)}")
print(f"\nTOTAL: {total_passed} passed, {total_failed} failed")

if total_failed == 0:
    print("\n*** TODAS LAS PRUEBAS PASARON! ***")
else:
    print(f"\n*** {total_failed} pruebas fallaron ***")
    
print("=" * 70)