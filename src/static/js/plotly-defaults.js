/**
 * Plotly Default Settings for 4D Manifold Explorer
 * This file contains default settings for Plotly visualizations
 * to ensure consistent styling across the application.
 */

/**
 * Enhanced Plotly Defaults for Scientific Klein Bottle Visualization
 * Optimized for mathematical accuracy, visual elegance, and scientific understanding
 */

// Enhanced color schemes for scientific visualization
const ScienceColorSchemes = {
    skb: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#a855f7',
        merged: '#bb86fc'
    },
    topology: {
        klein: '#ff6b9d',
        mobius: '#4fc3f7', 
        torus: '#81c784',
        intersection: '#ffd54f'
    },
    field: {
        strong: 'rgba(255, 200, 100, 0.8)',
        medium: 'rgba(255, 220, 150, 0.6)',
        weak: 'rgba(255, 240, 200, 0.4)'
    }
};

// Enhanced layout configuration for scientific precision
const EnhancedLayout = {
    scene: {
        aspectmode: 'cube',
        camera: {
            eye: { x: 2.1, y: 2.1, z: 1.8 },
            center: { x: 0, y: 0, z: 0 },
            up: { x: 0, y: 0, z: 1 },
            projection: { type: 'perspective' }
        },
        xaxis: {
            title: { text: 'X', font: { color: '#e2e8f0', size: 14 } },
            showspikes: false,
            showgrid: true,
            zeroline: true,
            showline: false,
            showticklabels: true,
            gridcolor: 'rgba(226, 232, 240, 0.15)',
            zerolinecolor: 'rgba(226, 232, 240, 0.3)',
            tickfont: { color: '#a0aec0', size: 10 },
            range: [-4, 4]
        },
        yaxis: {
            title: { text: 'Y', font: { color: '#e2e8f0', size: 14 } },
            showspikes: false,
            showgrid: true,
            zeroline: true,
            showline: false,
            showticklabels: true,
            gridcolor: 'rgba(226, 232, 240, 0.15)',
            zerolinecolor: 'rgba(226, 232, 240, 0.3)',
            tickfont: { color: '#a0aec0', size: 10 },
            range: [-4, 4]
        },
        zaxis: {
            title: { text: 'Z', font: { color: '#e2e8f0', size: 14 } },
            showspikes: false,
            showgrid: true,
            zeroline: true,
            showline: false,
            showticklabels: true,
            gridcolor: 'rgba(226, 232, 240, 0.15)',
            zerolinecolor: 'rgba(226, 232, 240, 0.3)',
            tickfont: { color: '#a0aec0', size: 10 },
            range: [-3, 3]
        },
        bgcolor: 'rgba(15, 20, 25, 0.95)',
        dragmode: 'orbit'
    },
    paper_bgcolor: 'rgba(15, 20, 25, 0.98)',
    plot_bgcolor: 'rgba(15, 20, 25, 0.95)',
    margin: { l: 0, r: 0, b: 0, t: 40, pad: 5 },
    autosize: true,
    legend: {
        font: { color: '#e2e8f0', size: 12 },
        bgcolor: 'rgba(45, 55, 72, 0.9)',
        bordercolor: 'rgba(255, 255, 255, 0.1)',
        borderwidth: 1,
        y: 0.98,
        x: 0.02,
        orientation: 'v'
    },
    hovermode: 'closest',
    showlegend: true,
    title: {
        font: { color: '#e2e8f0', size: 16 },
        x: 0.5,
        y: 0.95
    }
};

// Enhanced configuration options for better performance and interaction
const EnhancedConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
        'pan2d', 'select2d', 'lasso2d', 'autoScale2d', 'hoverClosestCartesian', 
        'hoverCompareCartesian', 'toggleSpikelines'
    ],
    modeBarButtonsToAdd: [
        {
            name: 'resetCamera',
            title: 'Reset 3D Camera',
            icon: Plotly.Icons.home,
            click: function(gd) {
                Plotly.relayout(gd, {
                    'scene.camera': EnhancedLayout.scene.camera
                });
            }
        }
    ],
    toImageButtonOptions: {
        format: 'png',
        filename: 'skb_visualization',
        height: 800,
        width: 1200,
        scale: 2
    },
    scrollZoom: true,
    doubleClick: 'reset+autosize'
};

// Default layout settings for all plots
const PlotlyDefaults = {
    /**
     * Get CSS variable value
     * @param {string} name - CSS variable name
     * @param {string} defaultValue - fallback value
     * @returns {string} - CSS variable value or default
     */
    getCssVar: function(name, defaultValue = '') {
        try {
            const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
            return value || defaultValue;
        } catch (e) {
            console.warn('Error getting CSS variable', name, e);
            return defaultValue;
        }
    },
    
    /**
     * Get the current theme's colors from CSS variables
     */
    getCurrentThemeColors: function() {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        
        return {
            darkBg: this.getCssVar('--dark-bg', theme === 'light' ? '#f5f5f5' : '#121212'),
            surface: this.getCssVar('--surface', theme === 'light' ? '#ffffff' : '#1e1e1e'), 
            surfaceLight: this.getCssVar('--surface-light', theme === 'light' ? '#e0e0e0' : '#2d2d2d'),
            primary: this.getCssVar('--primary', theme === 'light' ? '#6200EE' : '#BB86FC'),
            primaryVariant: this.getCssVar('--primary-variant', '#3700B3'),
            secondary: this.getCssVar('--secondary', '#03DAC6'),
            accent: this.getCssVar('--accent', '#CF6679'),
            textPrimary: this.getCssVar('--text-primary', theme === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)'),
            textSecondary: this.getCssVar('--text-secondary', theme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'),
            realColor: this.getCssVar('--real-color', '#FF6E91'),
            imagColor: this.getCssVar('--imag-color', '#33C4FF'),
            envelopeColor: this.getCssVar('--envelope-color', '#65FF8F'),
            skb1Color: this.getCssVar('--skb1-color', '#FF6E91'),
            skb2Color: this.getCssVar('--skb2-color', '#33C4FF'),
            skb3Color: this.getCssVar('--skb3-color', '#65FF8F'),
            skbMerged: this.getCssVar('--skb-merged', '#BB86FC')
        };
    },
    
    // Default layout settings
    getDefaultLayout: function(title, xLabel, yLabel) {
        const colors = this.getCurrentThemeColors();
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        
        return {
            title: title,
            xaxis: {
                title: xLabel,
                color: colors.textPrimary,
                gridcolor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                zerolinecolor: theme === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'
            },
            yaxis: {
                title: yLabel,
                color: colors.textPrimary,
                gridcolor: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                zerolinecolor: theme === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'
            },
            paper_bgcolor: colors.surface,
            plot_bgcolor: colors.surface,
            font: {
                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                color: colors.textPrimary
            },
            margin: {
                l: 60,
                r: 30,
                t: 50,
                b: 60
            },
            autosize: true
        };
    },
    
    // Default 3D layout settings
    getDefault3DLayout: function(title, xLabel, yLabel, zLabel) {
        const colors = this.getCurrentThemeColors();
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const gridColor = theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
        const zeroLineColor = theme === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
        
        return {
            title: title,
            scene: {
                xaxis: { 
                    title: xLabel,
                    color: colors.textPrimary,
                    gridcolor: gridColor,
                    zerolinecolor: zeroLineColor
                },
                yaxis: { 
                    title: yLabel,
                    color: colors.textPrimary,
                    gridcolor: gridColor,
                    zerolinecolor: zeroLineColor
                },
                zaxis: { 
                    title: zLabel,
                    color: colors.textPrimary,
                    gridcolor: gridColor,
                    zerolinecolor: zeroLineColor
                },
                camera: {
                    eye: {x: 1.5, y: 1.5, z: 1.5}
                },
                aspectratio: {x: 1, y: 1, z: 1}
            },
            paper_bgcolor: colors.surface,
            plot_bgcolor: colors.surface,
            font: {
                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                color: colors.textPrimary
            },
            margin: {
                l: 0,
                r: 0,
                t: 50,
                b: 0
            },
            autosize: true
        };
    },
    
    // Function to update existing plots with default styling
    updatePlotWithDefaults: function(plotDiv, layout) {
        try {
            if (!plotDiv || (typeof plotDiv === 'string' && !document.getElementById(plotDiv))) {
                console.warn('Invalid plot div provided to updatePlotWithDefaults');
                return;
            }
            
            const plotElement = (typeof plotDiv === 'string') ? document.getElementById(plotDiv) : plotDiv;
            
            if (!plotElement) {
                console.warn('Plot element not found:', plotDiv);
                return;
            }
            
            // Check if plot exists - we can't use hasPlot if it's not initialized yet
            if (typeof Plotly === 'undefined') {
                console.warn('Plotly is not defined');
                return;
            }
            
            // Get theme-aware colors
            const colors = this.getCurrentThemeColors();
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            const gridColor = theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
            
            const defaultLayout = {
                paper_bgcolor: colors.surface,
                plot_bgcolor: colors.surface,
                font: {
                    family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    color: colors.textPrimary
                },
                xaxis: { 
                    gridcolor: gridColor,
                    color: colors.textPrimary
                },
                yaxis: {
                    gridcolor: gridColor,
                    color: colors.textPrimary
                }
            };
            
            try {
                if (Plotly.hasPlot(plotElement)) {
                    Plotly.relayout(plotElement, Object.assign({}, defaultLayout, layout));
                }
            } catch (error) {
                console.warn('Error updating plot with defaults:', error);
            }
        } catch (error) {
            console.warn('Error in updatePlotWithDefaults:', error);
        }
    },
    
    // Apply current theme to all plots on the page
    applyThemeToAllPlots: function() {
        try {
            if (typeof Plotly === 'undefined') {
                console.warn('Plotly is not defined');
                return;
            }
            
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            const colors = this.getCurrentThemeColors();
            const gridColor = theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
            const zeroLineColor = theme === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
            
            // Find all plot divs
            const plotDivs = document.querySelectorAll('[id*="plot"], .js-plotly-plot');
            
            plotDivs.forEach(plotDiv => {
                try {
                    if (Plotly.hasPlot(plotDiv)) {
                        const layout = {
                            paper_bgcolor: colors.surface,
                            plot_bgcolor: colors.surface,
                            font: {
                                color: colors.textPrimary
                            },
                            xaxis: {
                                gridcolor: gridColor,
                                zerolinecolor: zeroLineColor,
                                color: colors.textPrimary
                            },
                            yaxis: {
                                gridcolor: gridColor,
                                zerolinecolor: zeroLineColor,
                                color: colors.textPrimary
                            }
                        };
                        
                        // Check if it's a 3D plot
                        const plotObj = Plotly.getPlotDiv(plotDiv);
                        if (plotObj && plotObj.layout && plotObj.layout.scene) {
                            layout.scene = {
                                xaxis: { 
                                    gridcolor: gridColor, 
                                    zerolinecolor: zeroLineColor,
                                    color: colors.textPrimary
                                },
                                yaxis: { 
                                    gridcolor: gridColor, 
                                    zerolinecolor: zeroLineColor,
                                    color: colors.textPrimary 
                                },
                                zaxis: { 
                                    gridcolor: gridColor, 
                                    zerolinecolor: zeroLineColor,
                                    color: colors.textPrimary
                                }
                            };
                        }
                        
                        Plotly.relayout(plotDiv, layout);
                    }
                } catch (error) {
                    console.warn('Error updating plot theme:', error);
                }
            });
        } catch (error) {
            console.warn('Error in applyThemeToAllPlots:', error);
        }
    }
};

// Apply the default theme to all future plots
document.addEventListener('DOMContentLoaded', function() {
    try {
        const colors = PlotlyDefaults.getCurrentThemeColors();
        
        if (typeof Plotly !== 'undefined') {
            Plotly.setPlotConfig({
                colorway: [
                    colors.primary,
                    colors.realColor,
                    colors.imagColor,
                    colors.envelopeColor,
                    colors.secondary,
                    colors.accent,
                    colors.skb1Color,
                    colors.skb2Color,
                    colors.skb3Color
                ]
            });
            
            // Apply theme to all plots
            setTimeout(() => {
                PlotlyDefaults.applyThemeToAllPlots();
            }, 200);
        }
    } catch (error) {
        console.warn('Error setting Plotly defaults:', error);
    }
});

/**
 * Enhanced function to update plot with scientific defaults
 * @param {HTMLElement} plotDiv - The plot container element
 * @param {Object} layout - Custom layout overrides
 */
function updatePlotWithDefaults(plotDiv, layout = {}) {
    if (!plotDiv || !Plotly.hasPlot(plotDiv)) {
        console.warn('Plot element not found or not initialized');
        return;
    }

    // Merge custom layout with enhanced defaults
    const finalLayout = Object.assign({}, EnhancedLayout, layout);
    
    // Apply scientific enhancements
    finalLayout.scene = Object.assign({}, EnhancedLayout.scene, layout.scene || {});
    
    // Enhanced title for merged vs individual modes
    if (layout.merged) {
        finalLayout.title.text = 'Merged SKB: Stable Hadron Configuration';
        finalLayout.annotations = [{
            text: 'Topological Stability Analysis',
            font: { color: '#bb86fc', size: 12 },
            showarrow: false,
            x: 0.98,
            y: 0.02,
            xref: 'paper',
            yref: 'paper'
        }];
    } else {
        finalLayout.title.text = 'Individual Sub-SKBs: Quark-like Components';
        finalLayout.annotations = [{
            text: 'Topological Interaction Visualization',
            font: { color: '#4fc3f7', size: 12 },
            showarrow: false,
            x: 0.98,
            y: 0.02,
            xref: 'paper',
            yref: 'paper'
        }];
    }

    try {
        Plotly.relayout(plotDiv, finalLayout);
        
        // Add enhanced interaction handlers
        addEnhancedInteractionHandlers(plotDiv);
        
        // Apply performance optimizations
        optimizePlotPerformance(plotDiv);
        
    } catch (error) {
        console.error('Error updating plot with defaults:', error);
    }
}

/**
 * Add enhanced interaction handlers for better scientific exploration
 * @param {HTMLElement} plotDiv - The plot container element
 */
function addEnhancedInteractionHandlers(plotDiv) {
    // Enhanced hover information
    plotDiv.on('plotly_hover', function(data) {
        if (data.points && data.points[0]) {
            const point = data.points[0];
            
            // Create enhanced tooltip for scientific data
            if (point.data.name && point.data.name.includes('Sub-SKB')) {
                const tooltipText = `
                    <div style="background: rgba(45, 55, 72, 0.95); border-radius: 8px; padding: 10px; color: #e2e8f0;">
                        <strong>${point.data.name}</strong><br>
                        Coordinates: (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})<br>
                        <em>Topological Surface Point</em>
                    </div>
                `;
                
                // Update hover label styling
                Plotly.Fx.hover(plotDiv, [point], {
                    bgcolor: 'rgba(45, 55, 72, 0.95)',
                    bordercolor: 'rgba(99, 102, 241, 0.6)',
                    font: { color: '#e2e8f0', size: 12 }
                });
            }
        }
    });

    // Enhanced camera movement for better exploration
    plotDiv.on('plotly_relayout', function(eventData) {
        if (eventData['scene.camera']) {
            // Store camera state for better user experience
            localStorage.setItem('skb_camera_state', JSON.stringify(eventData['scene.camera']));
        }
    });

    // Restore camera state on load
    const savedCamera = localStorage.getItem('skb_camera_state');
    if (savedCamera) {
        try {
            const cameraState = JSON.parse(savedCamera);
            Plotly.relayout(plotDiv, { 'scene.camera': cameraState });
        } catch (error) {
            console.warn('Could not restore camera state:', error);
        }
    }
}

/**
 * Optimize plot performance for complex 3D surfaces
 * @param {HTMLElement} plotDiv - The plot container element
 */
function optimizePlotPerformance(plotDiv) {
    // Enable hardware acceleration hints
    plotDiv.style.transform = 'translateZ(0)';
    plotDiv.style.willChange = 'transform';
    
    // Optimize WebGL context
    if (plotDiv._fullLayout && plotDiv._fullLayout.scene) {
        const sceneId = Object.keys(plotDiv._fullLayout._plots)[0];
        const sceneObj = plotDiv._fullLayout._plots[sceneId];
        
        if (sceneObj && sceneObj.scene && sceneObj.scene.glplot) {
            const gl = sceneObj.scene.glplot.gl;
            if (gl) {
                // Enable depth testing for better 3D rendering
                gl.enable(gl.DEPTH_TEST);
                gl.enable(gl.CULL_FACE);
                
                // Optimize blending for transparency
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            }
        }
    }
}

/**
 * Create enhanced surface trace with scientific optimizations
 * @param {Object} surfaceData - Raw surface data
 * @param {string} surfaceType - Type of surface (Klein, Mobius, Torus)
 * @returns {Object} Enhanced surface trace
 */
function createEnhancedSurfaceTrace(surfaceData, surfaceType = 'Klein') {
    const baseTrace = Object.assign({}, surfaceData);
    
    // Apply surface-specific enhancements
    switch (surfaceType.toLowerCase()) {
        case 'klein':
            baseTrace.lighting = {
                ambient: 0.45,
                diffuse: 0.85,
                roughness: 0.25,
                specular: 0.95,
                fresnel: 0.6
            };
            baseTrace.contours = {
                x: { show: true, width: 2, color: 'rgba(255, 107, 157, 0.4)' },
                y: { show: true, width: 2, color: 'rgba(255, 107, 157, 0.4)' },
                z: { show: true, width: 2, color: 'rgba(255, 107, 157, 0.4)' }
            };
            break;
            
        case 'mobius':
            baseTrace.lighting = {
                ambient: 0.5,
                diffuse: 0.75,
                roughness: 0.3,
                specular: 0.8,
                fresnel: 0.4
            };
            baseTrace.contours = {
                x: { show: true, width: 1.5, color: 'rgba(79, 195, 247, 0.4)' },
                y: { show: true, width: 1.5, color: 'rgba(79, 195, 247, 0.4)' },
                z: { show: true, width: 1.5, color: 'rgba(79, 195, 247, 0.4)' }
            };
            break;
            
        case 'torus':
            baseTrace.lighting = {
                ambient: 0.55,
                diffuse: 0.7,
                roughness: 0.35,
                specular: 0.75,
                fresnel: 0.35
            };
            baseTrace.contours = {
                x: { show: true, width: 1.5, color: 'rgba(129, 199, 132, 0.4)' },
                y: { show: true, width: 1.5, color: 'rgba(129, 199, 132, 0.4)' },
                z: { show: true, width: 1.5, color: 'rgba(129, 199, 132, 0.4)' }
            };
            break;
    }
    
    // Enhanced light positioning for scientific accuracy
    baseTrace.lightposition = {
        x: 1.5,
        y: 1.5,
        z: 2.0
    };
    
    return baseTrace;
}

/**
 * Handle responsive resize with enhanced performance
 * @param {HTMLElement} plotDiv - The plot container element
 */
function handleResponsiveResize(plotDiv) {
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            if (entry.target === plotDiv && Plotly.hasPlot(plotDiv)) {
                // Debounced resize for better performance
                clearTimeout(plotDiv._resizeTimeout);
                plotDiv._resizeTimeout = setTimeout(() => {
                    try {
                        Plotly.Plots.resize(plotDiv);
                    } catch (error) {
                        console.warn('Error during plot resize:', error);
                    }
                }, 150);
            }
        }
    });
    
    resizeObserver.observe(plotDiv);
    
    // Store observer for cleanup
    plotDiv._resizeObserver = resizeObserver;
}

/**
 * Cleanup function for plot disposal
 * @param {HTMLElement} plotDiv - The plot container element
 */
function cleanupPlot(plotDiv) {
    if (plotDiv._resizeObserver) {
        plotDiv._resizeObserver.disconnect();
    }
    
    if (plotDiv._resizeTimeout) {
        clearTimeout(plotDiv._resizeTimeout);
    }
    
    // Clean up WebGL resources
    if (Plotly.hasPlot(plotDiv)) {
        Plotly.purge(plotDiv);
    }
}

// Export enhanced plotting utilities
window.PlotlyDefaults = {
    updatePlotWithDefaults,
    addEnhancedInteractionHandlers,
    optimizePlotPerformance,
    createEnhancedSurfaceTrace,
    handleResponsiveResize,
    cleanupPlot,
    EnhancedLayout,
    EnhancedConfig,
    ScienceColorSchemes
};

// Initialize enhanced Plotly defaults when loaded
if (typeof Plotly !== 'undefined') {
    // Set global Plotly configuration
    Plotly.setPlotConfig({
        plotlyServerURL: false,
        showTips: false,
        locale: 'en'
    });
    
    console.log('Enhanced Plotly defaults initialized for scientific visualization');
} else {
    console.warn('Plotly library not found - enhanced defaults will be applied when available');
} 