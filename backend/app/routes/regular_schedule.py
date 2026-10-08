from flask import Blueprint, jsonify, request

from app.services.regular_schedule_service import (
    get_regular_schedule_config,
    save_regular_schedule_config
)


regular_schedule_bp = Blueprint(
    'regular_schedule',
    __name__
)


@regular_schedule_bp.route(
    '/regular-schedule',
    methods=['GET']
)
def get_regular_schedule_route():
    schedule = get_regular_schedule_config()

    if schedule is None:
        return jsonify(None), 200

    return jsonify(schedule), 200


@regular_schedule_bp.route(
    '/regular-schedule',
    methods=['PUT']
)
def save_regular_schedule_route():
    data = request.get_json(
        silent=True
    )

    try:
        save_regular_schedule_config(
            data
        )

        schedule = get_regular_schedule_config()

        return jsonify(schedule), 200

    except ValueError as error:
        return jsonify({
            'error': str(error)
        }), 400