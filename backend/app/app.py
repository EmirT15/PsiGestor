from flask import Flask
import psycopg
import os
from dotenv import load_dotenv
from flask_cors import CORS
from flasgger import Swagger
from app.routes.availability import availability_bp
from app.routes.regular_schedule import regular_schedule_bp
from app.routes.appointments import appointments_bp
from app.routes.students import students_bp
from app.routes.auth import auth_bp
from app.init_db import init_database


load_dotenv()

if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
    try:
        init_database(reset=False)
    except Exception as init_error:
        print(f"[app] Advertencia al inicializar BD: {init_error}")

app = Flask(__name__)

# Configuración de seguridad para sesiones y cookies
app.secret_key = os.getenv("SECRET_KEY", "psigestor_super_secret_session_key_2026")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("FLASK_ENV") == "production",
)

# Permitir credenciales (cookies HttpOnly) para el frontend
CORS(
    app,
    supports_credentials=True,
    origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ],
)
Swagger(app)

app.register_blueprint(auth_bp)
app.register_blueprint(availability_bp)
app.register_blueprint(regular_schedule_bp)
app.register_blueprint(appointments_bp)
app.register_blueprint(students_bp)

@app.route("/")
def inicio():
    return "Pfunciona"


@app.route("/db")
def probar_db():
    try:
        conexion = psycopg.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        )

        cursor = conexion.cursor()

        cursor.execute("SELECT current_user, current_database();")

        resultado = cursor.fetchone()

        cursor.close()
        conexion.close()

        return f"Usuario: {resultado[0]} | Base de datos: {resultado[1]}"

    except Exception as error:
        return f"Error de conexión: {error}", 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)