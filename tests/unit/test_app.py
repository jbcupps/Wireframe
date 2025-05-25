import numpy as np
from src.mathematics.surfaces import generate_twisted_strip
from src.services.topology_service import TopologyService


def test_generate_twisted_strip_shape():
    twists = [1, 1, 1, 0]
    x, y, z, u, v = generate_twisted_strip(twists, t=0.0, loop_factor=1)
    # The v dimension is int(resolution * 0.6) = int(75 * 0.6) = 45
    assert x.shape == (45, 75)  # (v_resolution, u_resolution)
    assert y.shape == (45, 75)
    assert z.shape == (45, 75)
    assert u.shape == (45, 75)
    assert v.shape == (45, 75)


def test_compute_topological_compatibility_returns_dict():
    skb1 = {
        'tx': 0.1,
        'ty': 0.1,
        'tz': 0.1,
        'tt': 0.1,
        'orientable': 1,
        'genus': 0
    }
    skb2 = {
        'tx': -0.1,
        'ty': -0.1,
        'tz': -0.1,
        'tt': -0.1,
        'orientable': 1,
        'genus': 0
    }
    
    topology_service = TopologyService()
    result = topology_service.compute_compatibility({'skb1': skb1, 'skb2': skb2})
    assert isinstance(result, dict)
    assert 'compatible' in result