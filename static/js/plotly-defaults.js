/**
 * Plotly Default Settings for 4D Manifold Explorer
 * This file contains default settings for Plotly visualizations
 * to ensure consistent styling across the application.
 */

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