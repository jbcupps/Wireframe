from src.app import app


def test_compute_topological_compatibility_route():
    client = app.test_client()
    payload = {
        'skb1': {
            'tx': 0.1,
            'ty': 0.1,
            'tz': 0.1,
            'tt': 0.1,
            'orientable': 1,
            'genus': 0
        },
        'skb2': {
            'tx': -0.1,
            'ty': -0.1,
            'tz': -0.1,
            'tt': -0.1,
            'orientable': 1,
            'genus': 0
        }
    }
    response = client.post('/compute_topological_compatibility', json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert 'compatible' in data
