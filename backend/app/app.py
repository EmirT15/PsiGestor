from flask import Flask
import psycopg
import os
from dotenv import load_dotenv
from flask_cors import CORS


load_dotenv()

app = Flask(__name__)
CORS(app)


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