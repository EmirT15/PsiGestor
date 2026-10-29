from pathlib import Path
import sys

# Permite importar el paquete "app" desde backend/
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))

from app.app import app


def main():
    rutas = {rule.rule for rule in app.url_map.iter_rules()}

    rutas_requeridas = {
        "/",
        "/availabilities",
        "/db",
    }

    faltantes = rutas_requeridas - rutas

    if faltantes:
        print("ERROR: faltan rutas:", sorted(faltantes))
        return 1

    root = BACKEND_DIR.parent
    docs_dir = root / "docs"
    docs_dir.mkdir(exist_ok=True)

    salida = docs_dir / "verificacion_entorno.txt"

    contenido = (
        "VERIFICACION DE ENTORNO\n"
        "=======================\n"
        "Flask: OK\n"
        "Aplicacion: OK\n"
        "Rutas requeridas: OK\n"
        "Ruta /: OK\n"
        "Ruta /availabilities: OK\n"
        "Ruta /db: OK\n"
        "\n"
        "El backend puede importarse correctamente "
        "en un entorno Python limpio.\n"
    )

    salida.write_text(contenido, encoding="utf-8")

    print("OK: backend importado correctamente")
    print("OK: rutas requeridas encontradas")
    print(f"OK: salida generada en {salida}")

    return 0


if __name__ == "__main__":
    sys.exit(main())