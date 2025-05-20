import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import Slider
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.gridspec as gridspec

# Function to plot a twisted strip (sub-SKB) with multi-dimensional twists, time, and loops
def plot_twisted_strip(ax, twists, position, color, t, loop_factor):
    u = np.linspace(0, 2 * np.pi * loop_factor, 50)
    v = np.linspace(-0.5, 0.5, 10)
    u, v = np.meshgrid(u, v)
    kx, ky, kz = twists  # Twist components
    
    # Apply multi-dimensional twists and time evolution
    x = (1 + 0.5 * v * np.cos(kx * (u + t) / 2)) * np.cos(u) + position[0]
    y = (1 + 0.5 * v * np.cos(ky * (u + t) / 2)) * np.sin(u) + position[1]
    z = 0.5 * v * np.sin(kz * (u + t) / 2) + position[2]
    
    ax.plot_surface(x, y, z, color=color, alpha=0.5, edgecolor='k', linewidth=0.5)

# Function to plot a Klein bottle (stable SKB) with time and loops
def plot_klein_bottle(ax, twists, t, loop_factor):
    u = np.linspace(0, 2 * np.pi * loop_factor, 50)
    v = np.linspace(0, 2 * np.pi, 50)
    u, v = np.meshgrid(u, v)
    kx, ky, kz = twists  # Twist components
    
    a, b = 2.0, 1.0  # Parameters for size
    
    # Apply multi-dimensional twists and time evolution
    x = (a + b * np.cos(v)) * np.cos(u + kx * t / 5)
    y = (a + b * np.cos(v)) * np.sin(u + ky * t / 5)
    z = b * np.sin(v) * np.cos((u + kz * t / 5) / 2)  # Simplified immersion
    
    ax.plot_surface(x, y, z, color='gray', alpha=0.3, edgecolor='k', linewidth=0.5)

# Initialize figure with more space for sliders
fig = plt.figure(figsize=(12, 10))
gs = gridspec.GridSpec(2, 1, height_ratios=[3, 1])  # 3:1 ratio for plot vs sliders

# Create main plot area
ax = plt.subplot(gs[0], projection='3d')

# Create slider area
slider_area = plt.subplot(gs[1])
slider_area.axis('off')  # Hide the axes

# Define neutral colors for sub-SKBs
skb_colors = ['#A9A9A9', '#D3D3D3', '#696969']  # Different shades of gray

# Create sliders with better organization
slider_height = 0.03
slider_width = 0.65
slider_x = 0.1

# Calculate vertical positions for sliders
slider_positions = {}
current_y = 0.85

# Time and Loop sliders (top)
ax_time = plt.axes([slider_x, current_y, slider_width, slider_height])
time_slider = Slider(ax_time, 'Time', 0, 2*np.pi, valinit=0, valstep=0.1)
current_y -= 0.06

ax_loop = plt.axes([slider_x, current_y, slider_width, slider_height])
loop_slider = Slider(ax_loop, 'Loop Factor', 1, 5, valinit=1, valstep=0.5)
current_y -= 0.06

# Merge slider
ax_merge = plt.axes([slider_x, current_y, slider_width, slider_height])
merge_slider = Slider(ax_merge, 'Merge', 0, 1, valinit=0, valstep=1)
current_y -= 0.1  # Extra space before twist sliders

# Twist sliders for each sub-SKB
twist_sliders = []
for i in range(1, 4):  # For 3 sub-SKBs
    group_label = plt.figtext(slider_x, current_y, f"Sub-SKB {i} Twists:", fontsize=10)
    current_y -= 0.05
    
    # X twist
    ax_tx = plt.axes([slider_x, current_y, slider_width, slider_height])
    tx_slider = Slider(ax_tx, f'Twist X{i}', -5, 5, valinit=0, valstep=1)
    current_y -= 0.06
    
    # Y twist
    ax_ty = plt.axes([slider_x, current_y, slider_width, slider_height])
    ty_slider = Slider(ax_ty, f'Twist Y{i}', -5, 5, valinit=0, valstep=1)
    current_y -= 0.06
    
    # Z twist
    ax_tz = plt.axes([slider_x, current_y, slider_width, slider_height])
    tz_slider = Slider(ax_tz, f'Twist Z{i}', -5, 5, valinit=0, valstep=1)
    current_y -= 0.1  # Extra space between sub-SKB groups
    
    twist_sliders.append((tx_slider, ty_slider, tz_slider))

# Update function for interactivity
def update(val):
    ax.clear()
    
    # Get current values from sliders
    merge_val = merge_slider.val
    t = time_slider.val
    loop_factor = loop_slider.val
    
    # Get twist values for each sub-SKB
    twists = []
    for tx, ty, tz in twist_sliders:
        twists.append([tx.val, ty.val, tz.val])
    
    if merge_val == 0:
        # Individual sub-SKBs
        for i in range(3):
            plot_twisted_strip(ax, twists[i], [(i-1)*2, 0, 0], skb_colors[i], t, loop_factor)
        ax.set_title("Three Sub-SKBs")
    else:
        # Merged stable SKB - use average of all twist values
        avg_twists = [sum(t[i] for t in twists)/3 for i in range(3)]
        plot_klein_bottle(ax, avg_twists, t, loop_factor)
        ax.set_title("Stable SKB")
    
    ax.set_xlim([-3, 3])
    ax.set_ylim([-3, 3])
    ax.set_zlim([-2, 2])
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    
    # Add legend for sub-SKB colors when showing individual SKBs
    if merge_val == 0:
        from matplotlib.lines import Line2D
        legend_elements = [
            Line2D([0], [0], color=skb_colors[0], lw=4, label='Sub-SKB 1'),
            Line2D([0], [0], color=skb_colors[1], lw=4, label='Sub-SKB 2'),
            Line2D([0], [0], color=skb_colors[2], lw=4, label='Sub-SKB 3')
        ]
        ax.legend(handles=legend_elements, loc='upper right')

# Connect all sliders to update function
time_slider.on_changed(update)
loop_slider.on_changed(update)
merge_slider.on_changed(update)

for tx, ty, tz in twist_sliders:
    tx.on_changed(update)
    ty.on_changed(update)
    tz.on_changed(update)

# Add explanatory text
fig.suptitle('4D Spacetime Klein Bottle Visualization', fontsize=16)
plt.figtext(0.5, 0.01, 
           'This visualization explores the topological properties of Spacetime Klein Bottles (SKBs).\n'
           'Adjust the sliders to modify twist parameters in each dimension, loop factor, and time evolution.',
           ha='center', fontsize=10)

# Initial plot
update(0)
plt.tight_layout()
plt.subplots_adjust(bottom=0.01)  # Make room for the text
plt.show()