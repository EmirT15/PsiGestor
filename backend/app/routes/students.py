
from flask import Blueprint, jsonify, request

from app.repositories.student_repository import search_students


students_bp = Blueprint("students", __name__)


@students_bp.route("/students", methods=["GET"])
def list_students():
    search_text = request.args.get("search", "").strip()

    if len(search_text) > 100:
        return jsonify({
            "error": "El texto de búsqueda es demasiado largo."
        }), 400

    try:
        students = search_students(search_text)
        return jsonify(students), 200
    except Exception:
        return jsonify({
            "error": "No fue posible consultar los alumnos."
        }), 500
