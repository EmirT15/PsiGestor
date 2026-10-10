from flask import Blueprint, jsonify, request

from app.services.availability_service import (
    register_availability,
    list_availabilities
)

availability_bp = Blueprint('availability', __name__)


@availability_bp.route('/availabilities', methods=['POST'])
def create_availability():
    """
    Create a new availability.
    ---
    tags:
      - Availability
    summary: Create a new availability
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: availability
        required: true
        schema:
          type: object
          required:
            - date
            - startTime
            - endTime
            - duration
            - breakTime
          properties:
            date:
              type: string
              format: date
              example: "2026-09-24"
            startTime:
              type: string
              example: "09:00"
            endTime:
              type: string
              example: "13:00"
            duration:
              type: integer
              example: 50
            breakTime:
              type: integer
              example: 10
    responses:
      201:
        description: Availability created successfully
      400:
        description: Invalid request or overlapping availability
      500:
        description: Internal server error
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
    ---
    tags:
      - Availability
    summary: Get all availabilities
    produces:
      - application/json
    responses:
      200:
        description: List of availabilities
      500:
        description: Internal server error
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