from flask import Flask, render_template, jsonify, request
import plotly.graph_objects as go
import numpy as np
import json
import traceback

app = Flask(__name__)

# Function to generate data for a twisted strip (sub-SKB)
def generate_twisted_strip(k, position):
    u = np.linspace(0, 2 * np.pi, 50)
    v = np.linspace(-0.5, 0.5, 10)
    u, v = np.meshgrid(u, v)
    x = (1 + 0.5 * v * np.cos(k * u / 2)) * np.cos(u) + position[0]
    y = (1 + 0.5 * v * np.cos(k * u / 2)) * np.sin(u) + position[1]
    z = 0.5 * v * np.sin(k * u / 2) + position[2]
    return x, y, z

# Function to generate data for a Klein bottle (stable SKB)
def generate_klein_bottle():
    u = np.linspace(0, 2 * np.pi, 50)
    v = np.linspace(0, 2 * np.pi, 50)
    u, v = np.meshgrid(u, v)
    a, b = 2.0, 1.0  # Parameters for size
    x = (a + b * np.cos(v)) * np.cos(u)
    y = (a + b * np.cos(v)) * np.sin(u)
    z = b * np.sin(v) * np.cos(u / 2)  # Simplified immersion
    return x, y, z

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_visualization', methods=['POST'])
def get_visualization():
    try:
        data = request.get_json()
        
        # Validate and convert input parameters
        try:
            t1 = int(data.get('t1', 2))
            t2 = int(data.get('t2', 2))
            t3 = int(data.get('t3', -1))
            merge = int(data.get('merge', 0))
            
            # Ensure values are within valid ranges
            t1 = max(-5, min(5, t1))
            t2 = max(-5, min(5, t2))
            t3 = max(-5, min(5, t3))
            merge = 1 if merge else 0
        except (ValueError, TypeError) as e:
            return jsonify({"error": "Invalid parameter values"}), 400
        
        fig = go.Figure()
        
        if merge == 0:
            # Individual sub-SKBs (quarks)
            x1, y1, z1 = generate_twisted_strip(t1, [-2, 0, 0])
            x2, y2, z2 = generate_twisted_strip(t2, [0, 0, 0])
            x3, y3, z3 = generate_twisted_strip(t3, [2, 0, 0])
            
            fig.add_trace(go.Surface(x=x1, y=y1, z=z1, colorscale=[[0, 'red'], [1, 'red']], 
                                    opacity=0.7, showscale=False, name=f"Up Quark 1 (Twist: {t1})"))
            fig.add_trace(go.Surface(x=x2, y=y2, z=z2, colorscale=[[0, 'green'], [1, 'green']], 
                                    opacity=0.7, showscale=False, name=f"Up Quark 2 (Twist: {t2})"))
            fig.add_trace(go.Surface(x=x3, y=y3, z=z3, colorscale=[[0, 'blue'], [1, 'blue']], 
                                    opacity=0.7, showscale=False, name=f"Down Quark (Twist: {t3})"))
            fig.update_layout(title="Three Sub-SKBs (Quarks)")
        else:
            # Merged stable SKB (baryon)
            x, y, z = generate_klein_bottle()
            fig.add_trace(go.Surface(x=x, y=y, z=z, colorscale=[[0, 'gray'], [1, 'gray']], 
                                    opacity=0.7, showscale=False, name="Stable SKB (Baryon)"))
            fig.update_layout(title="Stable SKB (Baryon)")
        
        fig.update_layout(
            scene=dict(
                xaxis=dict(range=[-3, 3], title="X"),
                yaxis=dict(range=[-3, 3], title="Y"),
                zaxis=dict(range=[-2, 2], title="Z"),
                aspectmode='cube'
            ),
            margin=dict(l=0, r=0, b=0, t=30),
            height=600,
            legend=dict(
                yanchor="top",
                y=0.99,
                xanchor="left",
                x=0.01
            )
        )
        
        return jsonify({"plot": json.loads(fig.to_json())})
    
    except Exception as e:
        app.logger.error(f"Error generating visualization: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "An error occurred while generating the visualization"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)