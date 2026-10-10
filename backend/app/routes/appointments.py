from flask import Blueprint, jsonify, request

from app.services.appointment_service import (
    register_appointment,
    list_appointments
)

appointment_bp = Blueprint('appointment', __name__)


@appointment_bp.route('/appointments', methods=['POST'])
def create_appointment():
    """
    Create a new appointment.
    ---
    tags:
      - Appointment
    summary: Create a new appointment
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: appointment
        required: true
        schema:
          type: object
          required:
            - studentId
            - studentName
            - date
            - startTime
            - endTime
            - duration
            - modality
            - reason
          properties:
            studentId:
              type: integer
              example: 1
            studentName:
              type: string
              example: "Juan Pérez"
            date:
              type: string
              format: date
              example: "2026-10-02"
            startTime:
              type: string
              example: "09:00"
            endTime:
              type: string
              example: "09:45"
            duration:
              type: integer
              example: 45
            modality:
              type: string
              example: "In person"
            location:
              type: string
              example: "Consultorio 1"
            meetingUrl:
              type: string
              example: "https://meet.google.com/abc-defg-hij"
            reason:
              type: string
              example: "Seguimiento"
    responses:
      201:
        description: Appointment created successfully
      400:
        description: Invalid request
      500:
        description: Internal server error
    """

    data = request.get_json()

    try:
        appointment = register_appointment(
            data['studentId'],
            data['studentName'],
            data['date'],
            data['startTime'],
            data['endTime'],
            data['duration'],
            data.get('modality'),
            data.get('location'),
            data.get('meetingUrl'),
            data['reason']
        )

    except ValueError as error:
        return jsonify({
            'error': str(error)
        }), 400

    return jsonify({
        'id': appointment[0],
        'studentId': appointment[1],
        'studentName': appointment[2],
        'date': str(appointment[3]),
        'startTime': str(appointment[4]),
        'endTime': str(appointment[5]),
        'duration': appointment[6],
        'modality': appointment[7],
        'location': appointment[8],
        'meetingUrl': appointment[9],
        'reason': appointment[10],
        'status': appointment[11],
        'createdAt': str(appointment[12])
    }), 201


@appointment_bp.route('/appointments', methods=['GET'])
def get_appointments():
    """
    Get all appointments.
    ---
    tags:
      - Appointment
    summary: Get all appointments
    produces:
      - application/json
    responses:
      200:
        description: List of appointments
      500:
        description: Internal server error
    """

    appointments = list_appointments()

    return jsonify([
        {
            'id': appointment[0],
            'studentId': appointment[1],
            'studentName': appointment[2],
            'date': str(appointment[3]),
            'startTime': str(appointment[4]),
            'endTime': str(appointment[5]),
            'duration': appointment[6],
            'modality': appointment[7],
            'location': appointment[8],
            'meetingUrl': appointment[9],
            'reason': appointment[10],
            'status': appointment[11],
            'createdAt': str(appointment[12])
        }
        for appointment in appointments
    ]), 200
