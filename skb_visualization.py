import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import Slider
from mpl_toolkits.mplot3d import Axes3D

# Function to plot a twisted strip (sub-SKB)
def plot_twisted_strip(ax, k, position, color):
    u = np.linspace(0, 2 * np.pi, 50)
    v = np.linspace(-0.5, 0.5, 10)
    u, v = np.meshgrid(u, v)
    x = (1 + 0.5 * v * np.cos(k * u / 2)) * np.cos(u) + position[0]
    y = (1 + 0.5 * v * np.cos(k * u / 2)) * np.sin(u) + position[1]
    z = 0.5 * v * np.sin(k * u / 2) + position[2]
    ax.plot_surface(x, y, z, color=color, alpha=0.5, edgecolor='k', linewidth=0.5)

# Function to plot a Klein bottle (stable SKB)
def plot_klein_bottle(ax):
    u = np.linspace(0, 2 * np.pi, 50)
    v = np.linspace(0, 2 * np.pi, 50)
    u, v = np.meshgrid(u, v)
    a, b, c = 2.0, 1.0, 1.0  # Parameters for size
    x = (a + b * np.cos(v)) * np.cos(u)
    y = (a + b * np.cos(v)) * np.sin(u)
    z = b * np.sin(v) * np.cos(u / 2)  # Simplified immersion
    ax.plot_surface(x, y, z, color='gray', alpha=0.3, edgecolor='k', linewidth=0.5)

# Initialize figure and 3D axes
fig = plt.figure(figsize=(10, 8))
ax = fig.add_subplot(111, projection='3d')

# Define slider axes
ax_t1 = plt.axes([0.1, 0.05, 0.65, 0.03])
ax_t2 = plt.axes([0.1, 0.10, 0.65, 0.03])
ax_t3 = plt.axes([0.1, 0.15, 0.65, 0.03])
ax_merge = plt.axes([0.1, 0.20, 0.65, 0.03])

# Create sliders
t1_slider = Slider(ax_t1, 'Twist 1 (u)', -5, 5, valinit=2, valstep=1)
t2_slider = Slider(ax_t2, 'Twist 2 (u)', -5, 5, valinit=2, valstep=1)
t3_slider = Slider(ax_t3, 'Twist 3 (d)', -5, 5, valinit=-1, valstep=1)
merge_slider = Slider(ax_merge, 'Merge', 0, 1, valinit=0, valstep=1)

# Update function for interactivity
def update(val):
    ax.clear()
    merge_val = merge_slider.val
    if merge_val == 0:
        # Individual sub-SKBs
        plot_twisted_strip(ax, t1_slider.val, [-2, 0, 0], 'red')    # Up quark, red
        plot_twisted_strip(ax, t2_slider.val, [0, 0, 0], 'green')   # Up quark, green
        plot_twisted_strip(ax, t3_slider.val, [2, 0, 0], 'blue')    # Down quark, blue
        ax.set_title("Three Sub-SKBs (Quarks)")
    else:
        # Merged stable SKB
        plot_klein_bottle(ax)
        ax.set_title("Stable SKB (Baryon)")
    
    ax.set_xlim([-3, 3])
    ax.set_ylim([-3, 3])
    ax.set_zlim([-2, 2])
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')

# Connect sliders to update function
t1_slider.on_changed(update)
t2_slider.on_changed(update)
t3_slider.on_changed(update)
merge_slider.on_changed(update)

# Initial plot
update(0)
plt.show()