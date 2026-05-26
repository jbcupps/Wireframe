"""
Main navigation routes for SKB Visualization Application.
Handles basic page routing and navigation.
"""

import base64
import os

from flask import Blueprint, Response, abort, render_template, send_file

# Create blueprint for main routes
main_bp = Blueprint('main', __name__)

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

EXPLORERS = {
    "mobius": {
        "title": "Mobius Strip",
        "symbol": "infinity",
        "tagline": "Twist a strip until it has one continuous side.",
        "invariant": "chi = 0, non-orientable",
        "accent": "#00ddff",
    },
    "klein": {
        "title": "Klein Bottle",
        "symbol": "K",
        "tagline": "Walk around a closed non-orientable surface with no interior.",
        "invariant": "chi = 0, no inside/outside split",
        "accent": "#8b5cf6",
    },
    "crosscap": {
        "title": "Crosscap Particles",
        "symbol": "x",
        "tagline": "Explore particle-like topology from compact non-orientable defects.",
        "invariant": "Pin structure, holonomy labels",
        "accent": "#f59e0b",
    },
    "projective": {
        "title": "Real Projective Plane",
        "symbol": "RP2",
        "tagline": "See antipodal identification through a Boy surface immersion.",
        "invariant": "S2 / (x ~ -x)",
        "accent": "#ec4899",
    },
    "curves": {
        "title": "Closed Curves",
        "symbol": "gamma",
        "tagline": "Trace homotopy classes and holonomy around compact surfaces.",
        "invariant": "loops, winding, transport",
        "accent": "#22c55e",
    },
    "immersion": {
        "title": "4D Immersions",
        "symbol": "4D",
        "tagline": "Project a rotating four-dimensional frame into ordinary 3D.",
        "invariant": "projection from R4 to R3",
        "accent": "#38bdf8",
    },
}

PNG_PIXEL = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAlgAAAE2CAIAAAC7sI1CAAABTElEQVR4nO3QQQ0AAAgDIN8/9K3h"
    "hUQ8YFhV9wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    "AAAAAAAAgH8BqYAAAfA4Tf8AAAAASUVORK5CYII="
)


@main_bp.route('/')
def landing():
    """Landing page route."""
    return render_template('site_home.html', explorers=EXPLORERS)


@main_bp.route('/theory')
def theory():
    """SKB hypothesis overview compatible with spacetimemanifolds.com."""
    return render_template('site_theory.html')


@main_bp.route('/papers')
def papers():
    """Papers and downloads page."""
    paper_path = get_paper_path()
    return render_template('site_papers.html', paper_available=os.path.exists(paper_path))


@main_bp.route('/about')
def about():
    """About page."""
    return render_template('site_about.html')


@main_bp.route('/explore/<slug>')
def topology_explorer(slug):
    """Interactive topology explorer pages matching the public site route surface."""
    explorer = EXPLORERS.get(slug)
    if explorer is None:
        abort(404)
    return render_template('topology_explorer.html', slug=slug, explorer=explorer)


@main_bp.route('/papers/Everything_is_Spacetime.pdf')
def everything_is_spacetime_pdf():
    """Download route matching the public site's paper URL."""
    paper_path = get_paper_path()
    if not os.path.exists(paper_path):
        abort(404)
    return send_file(
        paper_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="Everything_is_Spacetime.pdf",
    )


@main_bp.route('/og-image.png')
def og_image():
    """Small Open Graph image endpoint for crawlers and link previews."""
    return Response(PNG_PIXEL, mimetype="image/png")


def get_paper_path():
    """Find the deployable paper file across Vercel, Docker, and local dev."""
    static_paper = os.path.join(PROJECT_ROOT, "src", "static", "papers", "Everything_is_Spacetime.pdf")
    public_paper = os.path.join(PROJECT_ROOT, "public", "papers", "Everything_is_Spacetime.pdf")
    docs_paper = os.path.join(PROJECT_ROOT, "docs", "technical", "Spacetime_Manifold_Model_May_23_2025.pdf")
    for path in (static_paper, public_paper, docs_paper):
        if os.path.exists(path):
            return path
    return docs_paper


@main_bp.route('/visualization')
def visualization():
    """Main visualization page route."""
    return render_template('visualization.html')


@main_bp.route('/topological_diffusion')
def topological_diffusion():
    """Topological diffusion page route."""
    return render_template('topological_diffusion.html')


@main_bp.route('/evolution')
def evolution():
    """Evolution algorithm page route."""
    return render_template('evolution.html')


@main_bp.route('/oscillator')
def oscillator():
    """Quantum oscillator page route."""
    return render_template('oscillator.html')


@main_bp.route('/maxwell')
def maxwell():
    """Maxwell equations page route."""
    return render_template('maxwell.html')


@main_bp.route('/maxwells')
def maxwells():
    """Maxwell's equations detailed page route."""
    return render_template('maxwells.html')


@main_bp.route('/fermion-evolution')
def fermion_evolution():
    """Fermion evolution visualization page route."""
    return render_template('fermion_evolution.html')


@main_bp.route('/skb_explorer')
def skb_explorer():
    """Spacetime Klein Bottle Explorer page route."""
    return render_template('skb_explorer.html')


@main_bp.route('/baryons')
def baryons():
    """
    Full interactive Baryon Triple Junction + Forces (Tentacles) demo.
    Implements the exact constructions from Baryon Glueing.pdf:
      - k = number of odd quarks (d, s, b)
      - Holonomy product = (-1)^k
      - Bordism class = k mod 16 in Ω₄^{Pin⁻} ≅ ℤ/16ℤ
      - Pin⁻ gluing obstruction [c] = 0 for all cases (always solvable)
      - Force tentacles: EM (flux tubes), Strong (knotting/linking via CCP),
        Electroweak (symmetry-breaking twists)
    """
    return render_template('baryons.html')


@main_bp.route('/health')
def health_check():
    """Health check endpoint for container monitoring."""
    from flask import jsonify
    return jsonify({
        'status': 'healthy',
        'service': 'SKB Visualization',
        'version': '1.0.0'
    }), 200
