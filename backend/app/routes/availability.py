from flask import Blueprint, jsonify, request
import traceback

from app.services.availability_service import (
    register_availability,
    list_availabilities,
    register_disabled_schedule,
    list_disabled_schedules,
    check_schedule_conflicts,
    modify_disabled_schedule,
    remove_disabled_schedule
)

availability_bp = Blueprint('availability', __name__)

def map_schedule_data(data):
    """Auxiliar para mapear los campos tanto si vienen como tupla o diccionario"""
    if isinstance(data, dict):
        return {
            'id': data.get('id'),
            'startDate': str(data.get('start_date') or data.get('startDate', '')),
            'endDate': str(data.get('end_date') or data.get('endDate', '')),
            'startTime': str(data.get('start_time') or data.get('startTime', '')),
            'endTime': str(data.get('end_time') or data.get('endTime', '')),
            'reason': data.get('reason', ''),
            'observation': data.get('observation', ''),
            'type': data.get('type', ''),
            'status': data.get('status', 'Inhabilitado')
        }
    else:
        return {
            'id': data[0],
            'startDate': str(data[1]),
            'endDate': str(data[2]),
            'startTime': str(data[3]),
            'endTime': str(data[4]),
            'reason': data[5],
            'observation': data[6],
            'type': data[7],
            'status': data[8]
        }


@availability_bp.route('/availabilities', methods=['POST'])
def create_availability():
    """
    Create a new availability.
    """
    data = request.get_json()

    try:
        availability = register_availability(
            data['date'],
            data['startTime'],
            data['endTime'],
            data['duration'],
            data['breakTime']
        )
    except ValueError as error:
        return jsonify({
            'error': str(error)
        }), 400

    return jsonify({
        'id': availability[0],
        'date': str(availability[1]),
        'startTime': str(availability[2]),
        'endTime': str(availability[3]),
        'duration': availability[4],
        'breakTime': availability[5],
        'status': availability[6],
        'createdAt': str(availability[7])
    }), 201


@availability_bp.route('/availabilities', methods=['GET'])
def get_availabilities():
    """
    Get all availabilities.
    """
    availabilities = list_availabilities()

    return jsonify([
        {
            'id': availability[0],
            'date': str(availability[1]),
            'startTime': str(availability[2]),
            'endTime': str(availability[3]),
            'duration': availability[4],
            'breakTime': availability[5],
            'status': availability[6],
            'createdAt': str(availability[7])
        }
        for availability in availabilities
    ]), 200


@availability_bp.route('/disabled-schedules', methods=['GET', 'POST'])
def handle_disabled_schedules():
    if request.method == 'POST':
        data = request.get_json() or {}

        # Mapeo de parámetros recibidos desde el Frontend
        start_date = data.get('startDate') or data.get('date') or data.get('fechaInicio')
        end_date = data.get('endDate') or data.get('fechaFin') or start_date
        start_time = data.get('startTime') or data.get('horaInicio')
        end_time = data.get('endTime') or data.get('horaFin')
        reason = data.get('reason') or data.get('motivo')
        observation = data.get('observation') or data.get('observacion') or ''
        schedule_type = data.get('type') or data.get('modalidad') or 'Puntual'

        # Validaciones de seguridad para cumplir con los NOT NULL de la base de datos
        if not start_date or str(start_date).strip() == '':
            return jsonify({'error': 'La fecha de inicio es requerida'}), 400

        if not end_date or str(end_date).strip() == '':
            end_date = start_date

        if not start_time or str(start_time).strip() == '':
            start_time = '00:00:00'

        if not end_time or str(end_time).strip() == '':
            end_time = '23:59:59'

        if not reason or str(reason).strip() == '':
            reason = 'Inhabilitado'

        try:
            record = register_disabled_schedule(
                start_date, end_date, start_time, end_time, reason, observation, schedule_type
            )

            return jsonify(map_schedule_data(record)), 201

        except Exception as error:
            print("Error al guardar inhabilitación:", error)
            traceback.print_exc()
            return jsonify({'error': f'Error interno al guardar en base de datos: {str(error)}'}), 500

    # Método GET: Obtener inhabilitaciones de PostgreSQL
    try:
        schedules = list_disabled_schedules()
        return jsonify([map_schedule_data(row) for row in schedules]), 200
    except Exception as error:
        print("Error al consultar inhabilitaciones:", error)
        traceback.print_exc()
        return jsonify([]), 200

@availability_bp.route('/disabled-schedules/check-conflicts', methods=['POST'])
def check_disabled_conflicts():
    data = request.get_json() or {}
    start_date = data.get('startDate') or data.get('date')
    end_date = data.get('endDate') or start_date
    start_time = data.get('startTime')
    end_time = data.get('endTime')

    if not start_date or not start_time or not end_time:
        return jsonify({'hasConflict': False, 'conflictCount': 0}), 200

    conflict_count = check_schedule_conflicts(start_date, end_date, start_time, end_time)

    return jsonify({
        'hasConflict': conflict_count > 0,
        'conflictCount': conflict_count
    }), 200

@availability_bp.route('/disabled-schedules/<int:schedule_id>', methods=['PUT', 'DELETE'])
def handle_disabled_schedule_by_id(schedule_id):
    if request.method == 'PUT':
        data = request.get_json() or {}
        start_date = data.get('startDate') or data.get('date')
        end_date = data.get('endDate') or start_date
        start_time = data.get('startTime')
        end_time = data.get('endTime')
        reason = data.get('reason', 'Inhabilitado')
        observation = data.get('observation', '')
        schedule_type = data.get('type', 'Puntual')

        try:
            record = modify_disabled_schedule(
                schedule_id, start_date, end_date, start_time, end_time, reason, observation, schedule_type
            )
            if not record:
                return jsonify({'error': 'Registro no encontrado'}), 404

            return jsonify(map_schedule_data(record)), 200
        except Exception as error:
            print("Error al actualizar inhabilitación:", error)
            return jsonify({'error': str(error)}), 500

    if request.method == 'DELETE':
        try:
            remove_disabled_schedule(schedule_id)
            return jsonify({'message': 'Horario rehabilitado con éxito'}), 200
        except Exception as error:
            print("Error al rehabilitar horario:", error)
            return jsonify({'error': str(error)}), 500