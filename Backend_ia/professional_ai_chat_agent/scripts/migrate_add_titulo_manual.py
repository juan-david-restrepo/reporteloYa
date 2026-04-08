#!/usr/bin/env python3
"""
Script seguro para agregar la columna 'titulo_manual' a la tabla 'conversaciones'.
Este script NO modifica ni elimina datos existentes.
"""

import pymysql

def run_migration():
    print("=" * 60)
    print("[SEGuro] MIGRACION: Agregar columna 'titulo_manual'")
    print("=" * 60)
    
    # Configuracion de conexion
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='',
        database='reportelo',
        port=3306
    )
    
    try:
        with connection.cursor() as cursor:
            # PASO 1: Verificar si la columna ya existe
            print("\n[PASO 1] Verificando estructura actual de la tabla...")
            cursor.execute("DESCRIBE conversaciones")
            columns = cursor.fetchall()
            column_names = [col[0] for col in columns]
            
            print(f"   Columnas actuales: {column_names}")
            
            if 'titulo_manual' in column_names:
                print("\n[AVISO] La columna 'titulo_manual' YA EXISTE en la tabla.")
                print("   No se realizaran cambios.")
                return True
            
            # PASO 2: Mostrar las primeras 3 conversaciones antes del cambio
            print("\n[PASO 2] Vista previa de datos (primeras 3 conversaciones)...")
            cursor.execute("SELECT id_conversacion, titulo FROM conversaciones LIMIT 3")
            preview = cursor.fetchall()
            for row in preview:
                print(f"   - ID: {row[0]}, Titulo: {row[1]}")
            
            # PASO 3: Agregar la columna
            print("\n[PASO 3] Agregando columna 'titulo_manual'...")
            sql = "ALTER TABLE conversaciones ADD COLUMN titulo_manual BOOLEAN DEFAULT FALSE"
            print(f"   SQL a ejecutar: {sql}")
            cursor.execute(sql)
            connection.commit()
            print("   [OK] Columna agregada exitosamente")
            
            # PASO 4: Verificar que se creo
            print("\n[PASO 4] Verificando que la columna se creo correctamente...")
            cursor.execute("DESCRIBE conversaciones")
            columns = cursor.fetchall()
            column_names = [col[0] for col in columns]
            
            if 'titulo_manual' in column_names:
                print(f"   [OK] Columna 'titulo_manual' verificada: {column_names}")
            else:
                print("   [ERROR] La columna no se creo correctamente")
                return False
            
            # PASO 5: Verificar datos
            print("\n[PASO 5] Verificando datos...")
            cursor.execute("SELECT id_conversacion, titulo, titulo_manual FROM conversaciones LIMIT 3")
            data = cursor.fetchall()
            for row in data:
                print(f"   - ID: {row[0]}, Titulo: {row[1]}, titulo_manual: {row[2]}")
            
        print("\n" + "=" * 60)
        print("[OK] MIGRACION COMPLETADA EXITOSAMENTE")
        print("=" * 60)
        print("\n[INFO] Todas las conversaciones existentes tienen titulo_manual = FALSE")
        print("   La IA podra generar titulos para conversaciones sin titulo manual.")
        return True
        
    except pymysql.err.OperationalError as e:
        print(f"\n[ERROR] Error de conexion: {e}")
        print("   Verifica que:")
        print("   1. MySQL este ejecutandose")
        print("   2. Las credenciales sean correctas")
        return False
        
    except pymysql.err.ProgrammingError as e:
        print(f"\n[ERROR] Error de SQL: {e}")
        return False
        
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        return False
        
    finally:
        connection.close()

if __name__ == "__main__":
    success = run_migration()
    exit(0 if success else 1)