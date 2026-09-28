from flask import Blueprint, jsonify, request
from app.services.availability_service import (
    register_availability,
    list_availabilities,
    cancel_appointment,
    reschedule_appointment
)

availability_bp = Blueprint('availability', __name__)

@availability_bp.route('/availabilities', methods=['POST'])
def create_availability():
    data = request.get_json()
    try:
        availability = register_availability(
            data['date'], data['startTime'], data['endTime'], data['duration'], data['breakTime']
        )
    except ValueError as error:
        return jsonify({'error': str(error)}), 400
    return jsonify({
        'id': availability[0], 'date': str(availability[1]), 'startTime': str(availability[2]),
        'endTime': str(availability[3]), 'duration': availability[4], 'breakTime': availability[5],
        'status': availability[6], 'createdAt': str(availability[7])
    }), 201

@availability_bp.route('/availabilities', methods=['GET'])
def get_availabilities():
    availabilities = list_availabilities()
    return jsonify([{
        'id': a[0], 'date': str(a[1]), 'startTime': str(a[2]), 'endTime': str(a[3]),
        'duration': a[4], 'breakTime': a[5], 'status': a[6], 'createdAt': str(a[7]),
        'studentName': a[8], 'studentInitials': a[9], 'studentAge': a[10],
        'studentSemester': a[11], 'studentProgram': a[12], 'consultationReason': a[13],
        'modality': a[14], 'location': a[15], 'folio': a[16],
        'proposedDate': str(a[17]) if a[17] else None,
        'proposedStartTime': str(a[18]) if a[18] else None,
        'proposedEndTime': str(a[19]) if a[19] else None,
        'cancellationReason': a[20], 'cancellationObservation': a[21]
    } for a in availabilities]), 200

@availability_bp.route('/availabilities/<int:id>/cancel', methods=['POST'])
def cancel_availability_route(id):
    data = request.get_json()
    try:
        updated = cancel_appointment(id, data.get('reason'), data.get('observation'))
        if not updated: return jsonify({'error': 'No encontrado'}), 404
        return jsonify({'message': 'Cita cancelada con éxito'}), 200
    except ValueError as error:
        return jsonify({'error': str(error)}), 400

@availability_bp.route('/availabilities/<int:id>/reschedule', methods=['POST'])
def reschedule_availability_route(id):
    data = request.get_json()
    try:
        updated = reschedule_appointment(id, data.get('date'), data.get('startTime'), data.get('endTime'))
        if not updated: return jsonify({'error': 'No encontrado'}), 404
        return jsonify({'message': 'Reprogramación propuesta con éxito'}), 200
    except ValueError as error:
        return jsonify({'error': str(error)}), 400
