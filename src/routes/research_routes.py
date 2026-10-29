"""Bounded, stateless research endpoints; no uploaded code is executed."""
import json
from flask import Blueprint, jsonify, render_template, request
from ..research.assessment import assess_payload, control_cases, ResourceLimit, LIMITS

research_bp = Blueprint('research', __name__)

@research_bp.get('/research')
@research_bp.get('/research/')
def workspace():
    return render_template('research.html')

@research_bp.get('/api/research/controls')
def controls():
    return jsonify({'controls': control_cases(), 'limits': LIMITS})

@research_bp.post('/api/research/assess')
def assess():
    if not request.is_json:
        return jsonify(error='Content-Type must be application/json.'), 415
    maximum = LIMITS['request_bytes']
    if request.content_length is not None and request.content_length > maximum:
        return jsonify(error='Input exceeds the 512 KiB application limit.', status='resource_limit'), 413
    # Read at most the cap even if a streaming client does not declare a length.
    raw = request.stream.read(maximum + 1)
    if len(raw) > maximum:
        return jsonify(error='Input exceeds the 512 KiB application limit.', status='resource_limit'), 413
    try:
        payload = json.loads(raw)
        report = assess_payload(payload)
    except ResourceLimit as exc:
        return jsonify(error=str(exc), status='resource_limit'), 422
    except (ValueError, TypeError, RecursionError, UnicodeError) as exc:
        return jsonify(error=str(exc) if not isinstance(exc, RecursionError) else 'JSON nesting exceeds the supported bound.', status='invalid_input'), 400
    response = jsonify(report)
    response.headers['Cache-Control'] = 'no-store'
    return response
