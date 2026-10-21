from flask import Blueprint, jsonify, request
from datetime import date as date_type
from app.services.appointment_service import (
    register_appointment,
    book_student_appointment,
    get_student_appointments,
    cancel_student_appointment,
    request_student_reschedule,
    approve_student_reschedule,
    reject_student_reschedule,
)
from app.services.auth_service import get_current_user, require_auth
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
        user = get_current_user()
        appointment = register_appointment(data, user=user if user and user.get("role") == "alumno" else None)

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


# =============================================================================
# RUTAS DE GESTIÓN PARA EL ALUMNO / PACIENTE
# =============================================================================

@appointments_bp.route("/book", methods=["POST"])
@require_auth
def book_student_appointment_route():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "El cuerpo de la solicitud debe ser un JSON válido."}), 400

    user = get_current_user()
    if not user:
        return jsonify({"error": "Debes iniciar sesión para agendar una cita."}), 401

    try:
        appointment = book_student_appointment(user, data)
        return jsonify({
            "message": "Cita confirmada y registrada correctamente.",
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
            }
        }), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        return jsonify({"error": f"Error al procesar la reserva: {error}"}), 500


@appointments_bp.route("/my", methods=["GET"])
@require_auth
def get_my_appointments_route():
    user = get_current_user()
    if not user:
        return jsonify({"error": "No autenticado."}), 401

    try:
        appointments = get_student_appointments(user)

        for apt in appointments:
            if apt.get("date"):
                apt["date"] = apt["date"].isoformat()
            if apt.get("start_time"):
                apt["start_time"] = apt["start_time"].strftime("%H:%M")
            if apt.get("end_time"):
                apt["end_time"] = apt["end_time"].strftime("%H:%M")
            if apt.get("created_at"):
                apt["created_at"] = apt["created_at"].isoformat()
            if apt.get("cancelled_at"):
                apt["cancelled_at"] = apt["cancelled_at"].isoformat()
            if apt.get("rescheduled_at"):
                apt["rescheduled_at"] = apt["rescheduled_at"].isoformat()
            if apt.get("proposed_date"):
                apt["proposed_date"] = apt["proposed_date"].isoformat()
            if apt.get("proposed_start_time"):
                apt["proposed_start_time"] = apt["proposed_start_time"].strftime("%H:%M")
            if apt.get("proposed_end_time"):
                apt["proposed_end_time"] = apt["proposed_end_time"].strftime("%H:%M")

        return jsonify({"appointments": appointments}), 200
    except Exception as error:
        return jsonify({"error": f"No fue posible consultar tus citas: {error}"}), 500


@appointments_bp.route("/<int:appointment_id>/cancel", methods=["POST"])
@require_auth
def cancel_student_appointment_route(appointment_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "No autenticado."}), 401

    data = request.get_json(silent=True) or {}
    try:
        cancel_student_appointment(user, appointment_id, data)
        return jsonify({"message": "La cita ha sido cancelada correctamente."}), 200
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        return jsonify({"error": f"No fue posible cancelar la cita: {error}"}), 500


@appointments_bp.route("/<int:appointment_id>/reschedule-request", methods=["POST"])
@require_auth
def reschedule_request_student_route(appointment_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "No autenticado."}), 401

    data = request.get_json(silent=True) or {}
    try:
        request_student_reschedule(user, appointment_id, data)
        return jsonify({"message": "Solicitud de reprogramación enviada correctamente."}), 200
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        return jsonify({"error": f"No fue posible solicitar la reprogramación: {error}"}), 500


@appointments_bp.route("/<int:appointment_id>/approve-reschedule", methods=["POST"])
def approve_reschedule_route(appointment_id):
    try:
        approve_student_reschedule(appointment_id)
        return jsonify({"message": "Reprogramación aprobada y aplicada correctamente."}), 200
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        return jsonify({"error": f"No fue posible aprobar la reprogramación: {error}"}), 500


@appointments_bp.route("/<int:appointment_id>/reject-reschedule", methods=["POST"])
def reject_reschedule_route(appointment_id):
    try:
        result = reject_student_reschedule(appointment_id)
        return jsonify(result), 200
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except Exception as error:
        return jsonify({"error": f"No fue posible rechazar la reprogramación: {error}"}), 500
