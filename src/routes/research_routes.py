"""Bounded, stateless research endpoints; no uploaded code is executed."""
import json
import re
from flask import Blueprint, jsonify, render_template, request
from ..research.assessment import assess_payload, control_cases, ResourceLimit, LIMITS
from ..research.workbook import workbook_page, WORKBOOK_LIMITS

research_bp = Blueprint('research', __name__)

@research_bp.post('/api/research/workbook')
def workbook():
    def response(payload, code=200):
        result = jsonify(payload)
        result.headers['Cache-Control'] = 'no-store'
        return result, code

    if request.mimetype not in ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'):
        return response({'error': 'Content-Type must be an XLSX workbook or application/octet-stream.'}, 415)
    maximum = WORKBOOK_LIMITS['request_bytes']
    if request.content_length is not None and request.content_length > maximum:
        return response({'error': 'Workbook exceeds the 3,000,000-byte upload limit.', 'status': 'resource_limit'}, 413)
    raw = request.stream.read(maximum + 1)
    if len(raw) > maximum:
        return response({'error': 'Workbook exceeds the 3,000,000-byte upload limit.', 'status': 'resource_limit'}, 413)
    try:
        values = {}
        for name, default in (('start', '0'), ('count', '20')):
            value = request.args.get(name, default)
            if not re.fullmatch(r'[0-9]{1,7}', value):
                raise ValueError(f'Workbook {name} must be a nonnegative decimal integer.')
            values[name] = int(value)
        return response(workbook_page(raw, sheet=request.args.get('sheet'), **values))
    except ResourceLimit as exc:
        return response({'error': str(exc), 'status': 'resource_limit'}, 422)
    except (ValueError, TypeError, RecursionError) as exc:
        return response({'error': str(exc), 'status': 'invalid_input'}, 400)

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
