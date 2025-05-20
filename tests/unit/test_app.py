import numpy as np
from src import app as app_module


def test_generate_twisted_strip_shape():
    twists = [1, 1, 1, 0]
    x, y, z, u, v = app_module.generate_twisted_strip(twists, t=0.0, loop_factor=1)
    assert x.shape == (50, 50)
    assert y.shape == (50, 50)
    assert z.shape == (50, 50)
    assert u.shape == (50, 50)
    assert v.shape == (50, 50)


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
    result = app_module.compute_topological_compatibility(skb1=skb1, skb2=skb2)
    assert isinstance(result, dict)
    assert 'compatible' in result
