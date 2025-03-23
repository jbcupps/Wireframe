/**
 * Plotly Default Settings for 4D Manifold Explorer
 * This file contains default settings for Plotly visualizations
 * to ensure consistent styling across the application.
 */

// Default layout settings for all plots
const PlotlyDefaults = {
    // Theme colors from CSS variables
    colors: {
        darkBg: '#121212',
        surface: '#1e1e1e',
        surfaceLight: '#2d2d2d',
        primary: '#BB86FC',
        primaryVariant: '#3700B3',
        secondary: '#03DAC6',
        accent: '#CF6679',
        textPrimary: 'rgba(255, 255, 255, 0.87)',
        textSecondary: 'rgba(255, 255, 255, 0.6)',
        realColor: '#FF6E91',
        imagColor: '#33C4FF',
        envelopeColor: '#65FF8F',
        skb1Color: '#FF6E91',
        skb2Color: '#33C4FF',
        skb3Color: '#65FF8F',
        skbMerged: '#BB86FC'
    },
    
    // Default layout settings
    getDefaultLayout: function(title, xLabel, yLabel) {
        return {
            title: title,
            xaxis: {
                title: xLabel,
                color: this.colors.textPrimary,
                gridcolor: 'rgba(255, 255, 255, 0.1)',
                zerolinecolor: 'rgba(255, 255, 255, 0.3)'
            },
            yaxis: {
                title: yLabel,
                color: this.colors.textPrimary,
                gridcolor: 'rgba(255, 255, 255, 0.1)',
                zerolinecolor: 'rgba(255, 255, 255, 0.3)'
            },
            paper_bgcolor: this.colors.surface,
            plot_bgcolor: this.colors.surface,
            font: {
                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                color: this.colors.textPrimary
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
        return {
            title: title,
            scene: {
                xaxis: { 
                    title: xLabel,
                    color: this.colors.textPrimary,
                    gridcolor: 'rgba(255, 255, 255, 0.1)',
                    zerolinecolor: 'rgba(255, 255, 255, 0.3)'
                },
                yaxis: { 
                    title: yLabel,
                    color: this.colors.textPrimary,
                    gridcolor: 'rgba(255, 255, 255, 0.1)',
                    zerolinecolor: 'rgba(255, 255, 255, 0.3)'
                },
                zaxis: { 
                    title: zLabel,
                    color: this.colors.textPrimary,
                    gridcolor: 'rgba(255, 255, 255, 0.1)',
                    zerolinecolor: 'rgba(255, 255, 255, 0.3)'
                },
                camera: {
                    eye: {x: 1.5, y: 1.5, z: 1.5}
                },
                aspectratio: {x: 1, y: 1, z: 1}
            },
            paper_bgcolor: this.colors.surface,
            plot_bgcolor: this.colors.surface,
            font: {
                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                color: this.colors.textPrimary
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
        const defaultLayout = {
            paper_bgcolor: this.colors.surface,
            plot_bgcolor: this.colors.surface,
            font: {
                family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                color: this.colors.textPrimary
            }
        };
        
        Plotly.relayout(plotDiv, Object.assign({}, defaultLayout, layout));
    }
};

// Apply the default theme to all future plots
Plotly.setPlotConfig({
    colorway: [
        PlotlyDefaults.colors.primary,
        PlotlyDefaults.colors.realColor,
        PlotlyDefaults.colors.imagColor,
        PlotlyDefaults.colors.envelopeColor,
        PlotlyDefaults.colors.secondary,
        PlotlyDefaults.colors.accent,
        PlotlyDefaults.colors.skb1Color,
        PlotlyDefaults.colors.skb2Color,
        PlotlyDefaults.colors.skb3Color
    ]
}); 