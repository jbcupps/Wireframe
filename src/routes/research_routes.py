"""Bounded, stateless research endpoints; no uploaded code is executed."""
import json
import re
from hashlib import sha256
from pathlib import Path

from flask import Blueprint, Response, jsonify, render_template, request
from ..research.assessment import assess_payload, control_cases, ResourceLimit, LIMITS
from ..research.workbook import workbook_page, WORKBOOK_LIMITS

research_bp = Blueprint('research', __name__)
_RESEARCH_ASSETS = Path(__file__).resolve().parents[1] / 'static' / 'research'
_RESEARCH_TEMPLATE = Path(__file__).resolve().parents[1] / 'pages' / 'research.html'


def _research_release():
    """Hash and snapshot one complete module graph, including worker imports.

    Relative imports resolve beneath the release directory, so changing any
    leaf module changes every module URL. Serving the same byte snapshot used
    for hashing avoids assigning newer bytes to an older release URL.
    """
    assets = {
        path.name: path.read_bytes()
        for path in sorted(_RESEARCH_ASSETS.iterdir())
        if path.is_file() and not path.is_symlink() and path.suffix in ('.mjs', '.css')
    }
    digest = sha256(b'4d-nod-research-assets-v1\0')
    for name, data in [*assets.items(), ('research.html', _RESEARCH_TEMPLATE.read_bytes())]:
        digest.update(name.encode('utf-8') + b'\0')
        digest.update(len(data).to_bytes(8, 'big'))
        digest.update(data)
    return digest.hexdigest(), assets


def _release_unavailable():
    response = jsonify(error='This research asset release is unavailable. Save or export your work before reloading.',
                       status='release_unavailable')
    response.status_code = 404
    response.headers['Cache-Control'] = 'no-store'
    return response


@research_bp.get('/research-assets/<version>/<path:filename>')
def research_asset(version, filename):
    # Only flat, explicitly discovered research JavaScript/CSS files are public.
    if (not re.fullmatch(r'[a-f0-9]{64}', version) or '/' in filename or '\\' in filename
            or not re.fullmatch(r'[A-Za-z0-9_-]+\.(?:mjs|css)', filename)):
        return _release_unavailable()
    current, assets = _research_release()
    if version != current or filename not in assets:
        return _release_unavailable()
    response = Response(assets[filename], mimetype='text/javascript' if filename.endswith('.mjs') else 'text/css')
    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Research-Version'] = current
    response.set_etag(f'{current}-{filename}')
    return response.make_conditional(request)


@research_bp.get('/api/research/version')
def research_version():
    version, _ = _research_release()
    response = jsonify(version=version)
    response.headers['Cache-Control'] = 'no-store'
    return response

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
    version, _ = _research_release()
    response = Response(render_template('research.html', research_version=version), mimetype='text/html')
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Research-Version'] = version
    return response

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
