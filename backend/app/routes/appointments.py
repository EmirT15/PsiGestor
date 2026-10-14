from flask import Blueprint, jsonify, request
from app.services.appointment_service import register_appointment
from datetime import date as date_type
from app.repositories.appointment_repository import get_appointments


appointments_bp = Blueprint(
    "appointments",
    __name__,
    url_prefix="/appointments",
)


@appointments_bp.route("", methods=["POST"])
def create_appointment_route():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "El cuerpo de la solicitud debe ser un JSON válido."
        }), 400

    try:
        appointment = register_appointment(data)

        return jsonify({
            "message": "Cita registrada correctamente.",
            "appointment": {
                "id": appointment[0],
                "student_id": appointment[1],
                "student_name": appointment[2],
                "date": appointment[3].isoformat(),
                "start_time": appointment[4].strftime("%H:%M"),
                "end_time": appointment[5].strftime("%H:%M"),
                "duration": appointment[6],
                "modality": appointment[7],
                "location": appointment[8],
                "meeting_url": appointment[9],
                "reason": appointment[10],
                "status": appointment[11],
                "created_at": appointment[12].isoformat(),
            },
        }), 201

    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    except Exception:
        # El detalle técnico debe revisarse en los logs del servidor,
        # no exponerse al cliente.
        return jsonify({
            "error": "No fue posible registrar la cita."
        }), 500


@appointments_bp.route("", methods=["GET"])
def list_appointments_route():
    date_value = request.args.get("date")

    if date_value:
        try:
            date_value = date_type.fromisoformat(date_value)
        except ValueError:
            return jsonify({
                "error": "La fecha debe tener el formato YYYY-MM-DD."
            }), 400

    try:
        appointments = get_appointments(date_value)

        for appointment in appointments:
            appointment["date"] = appointment["date"].isoformat()
            appointment["start_time"] = appointment["start_time"].strftime("%H:%M")
            appointment["end_time"] = appointment["end_time"].strftime("%H:%M")

            if appointment["created_at"]:
                appointment["created_at"] = (
                    appointment["created_at"].isoformat()
                )

        return jsonify({"appointments": appointments}), 200

    except Exception:
        return jsonify({
            "error": "No fue posible consultar las citas."
        }), 500
