from flask import Flask, render_template, jsonify, request
import plotly.graph_objects as go
import numpy as np
import json
import traceback
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Function to generate data for a twisted strip (sub-SKB) with multi-dimensional twists, time, and loops
def generate_twisted_strip(twists, position, t, loop_factor):
    u = np.linspace(0, 2 * np.pi * loop_factor, 50)
    v = np.linspace(-0.5, 0.5, 10)
    u, v = np.meshgrid(u, v)
    kx, ky, kz = twists  # Twist components
    
    # Apply multi-dimensional twists and time evolution
    x = (1 + 0.5 * v * np.cos(kx * (u + t) / 2)) * np.cos(u) + position[0]
    y = (1 + 0.5 * v * np.cos(ky * (u + t) / 2)) * np.sin(u) + position[1]
    z = 0.5 * v * np.sin(kz * (u + t) / 2) + position[2]
    
    return x, y, z, u, v  # Return u and v for consistency with Klein bottle function

# Function to generate data for a Klein bottle (stable SKB) with time and loops
def generate_klein_bottle(twists, t, loop_factor):
    u = np.linspace(0, 2 * np.pi * loop_factor, 50)
    v = np.linspace(0, 2 * np.pi, 50)
    u, v = np.meshgrid(u, v)
    kx, ky, kz = twists  # Twist components
    
    a, b = 2.0, 1.0  # Parameters for size
    
    # Apply multi-dimensional twists and time evolution
    x = (a + b * np.cos(v)) * np.cos(u + kx * t / 5)
    y = (a + b * np.cos(v)) * np.sin(u + ky * t / 5)
    z = b * np.sin(v) * np.cos((u + kz * t / 5) / 2)  # Simplified immersion
    
    return x, y, z, u, v  # Return u and v for surface coloring

@app.route('/')
def index():
    return render_template('landing.html')

@app.route('/visualization')
def visualization():
    return render_template('index.html')

@app.route('/get_visualization', methods=['POST'])
def get_visualization():
    try:
        data = request.get_json()
        
        # Validate and convert input parameters
        try:
            # Get time and loop factors
            t = float(data.get('time', 0))
            loop_factor = float(data.get('loop_factor', 1))
            loop1 = float(data.get('loop1', 1))
            loop2 = float(data.get('loop2', 1))
            loop3 = float(data.get('loop3', 1))
            merge = int(data.get('merge', 0))
            
            # Get twist parameters for each sub-SKB
            twists = []
            for i in range(1, 4):
                tx = float(data.get(f't{i}x', 0))
                ty = float(data.get(f't{i}y', 0))
                tz = float(data.get(f't{i}z', 0))
                twists.append([tx, ty, tz])
            
            # Ensure values are within valid ranges
            t = max(0, min(2 * np.pi, t))
            loop_factor = max(1, min(5, loop_factor))
            loop1 = max(1, min(5, loop1))
            loop2 = max(1, min(5, loop2))
            loop3 = max(1, min(5, loop3))
            merge = 1 if merge else 0
            
            for i in range(3):
                for j in range(3):
                    twists[i][j] = max(-5, min(5, twists[i][j]))
                    
        except (ValueError, TypeError) as e:
            return jsonify({"error": "Invalid parameter values"}), 400
        
        # Define colors for sub-SKBs
        skb_colors = ['#FF5733', '#33A1FF', '#33FF57']  # Orange-red, Blue, Green
        
        # Check if custom colors were provided
        if 'colors' in data and isinstance(data['colors'], dict):
            if 'skb1' in data['colors']:
                skb_colors[0] = data['colors']['skb1']
            if 'skb2' in data['colors']:
                skb_colors[1] = data['colors']['skb2']
            if 'skb3' in data['colors']:
                skb_colors[2] = data['colors']['skb3']
        
        fig = go.Figure()
        
        if merge == 0:
            # Individual sub-SKBs with their own loop factors
            loop_factors = [loop1, loop2, loop3]
            for i in range(3):
                x, y, z, _, _ = generate_twisted_strip(twists[i], [(i-1)*2, 0, 0], t, loop_factors[i])
                fig.add_trace(go.Surface(
                    x=x, y=y, z=z, 
                    colorscale=[[0, skb_colors[i]], [1, skb_colors[i]]], 
                    opacity=0.5,  # Reduced opacity from 0.7 to 0.5 for more translucency
                    showscale=False, 
                    name=f"Sub-SKB {i+1}",
                    contours={
                        "x": {"show": True, "width": 3, "color": skb_colors[i]},  # Increased width from 2 to 3
                        "y": {"show": True, "width": 3, "color": skb_colors[i]},  # Increased width from 2 to 3
                        "z": {"show": True, "width": 3, "color": skb_colors[i]}   # Increased width from 2 to 3
                    }
                ))
            fig.update_layout(title="Three Sub-SKBs")
        else:
            # Merged stable SKB - use average of all twist values but maintain individual bottle identities
            avg_twists = [sum(t[i] for t in twists)/3 for i in range(3)]
            x, y, z, u, v = generate_klein_bottle(avg_twists, t, loop_factor)  # Get u and v for surface coloring
            
            # Create a merged bottle with a pattern that helps differentiate the individual bottles
            fig.add_trace(go.Surface(
                x=x, y=y, z=z, 
                surfacecolor=np.sin(5*u) * np.cos(5*v),  # Add a pattern to help differentiate parts
                colorscale=[
                    [0, '#8A2BE2'],  # Dark purple
                    [0.33, '#FF6E91'],  # Pink (from SKB1)
                    [0.66, '#33C4FF'],  # Blue (from SKB2)
                    [1, '#65FF8F']  # Green (from SKB3)
                ],
                opacity=0.5,  # Reduced opacity from 0.7 to 0.5
                showscale=False, 
                name="Stable SKB",
                contours={
                    "x": {"show": True, "width": 3, "color": '#8A2BE2'},  # Increased width from 2 to 3
                    "y": {"show": True, "width": 3, "color": '#8A2BE2'},  # Increased width from 2 to 3
                    "z": {"show": True, "width": 3, "color": '#8A2BE2'}   # Increased width from 2 to 3
                }
            ))
            fig.update_layout(title="Stable SKB")
        
        fig.update_layout(
            scene=dict(
                xaxis=dict(range=[-3.5, 3.5], title="X"),  # Expanded range from [-3, 3] to [-3.5, 3.5]
                yaxis=dict(range=[-3.5, 3.5], title="Y"),  # Expanded range from [-3, 3] to [-3.5, 3.5]
                zaxis=dict(range=[-2.5, 2.5], title="Z"),  # Expanded range from [-2, 2] to [-2.5, 2.5]
                aspectmode='cube'
            ),
            margin=dict(l=0, r=0, b=0, t=30),
            height=700,  # Increased height from 600 to 700
            legend=dict(
                yanchor="top",
                y=0.99,
                xanchor="left",
                x=0.01
            )
        )
        
        return jsonify({"plot": json.loads(fig.to_json())})
    
    except Exception as e:
        logger.error(f"Error generating visualization: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "An error occurred while generating the visualization. Check server logs for details."}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)