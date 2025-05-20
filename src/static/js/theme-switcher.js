/**
 * Theme Switcher for 4D Manifold Explorer
 * Handles light/dark theme switching and persistence
 */

document.addEventListener('DOMContentLoaded', function() {
    // Apply theme immediately to prevent flash of default theme
    applyTheme();
    
    // Get theme toggle element
    const themeToggle = document.getElementById('theme-toggle');
    
    // Listen for toggle changes
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }
});

/**
 * Apply theme from storage or system preference
 */
function applyTheme(themeOverride = null) {
    // Use override, stored preference, or system preference (in that order)
    let theme;
    
    if (themeOverride) {
        theme = themeOverride;
        localStorage.setItem('theme', theme);
    } else {
        const savedTheme = localStorage.getItem('theme');
        const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            theme = savedTheme;
        } else if (prefersDarkTheme) {
            theme = 'dark';
        } else {
            theme = 'dark'; // Default to dark
        }
    }
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update toggle state if it exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = theme === 'light';
    }
    
    // Update icons
    updateThemeIcons();
    
    // Update Plotly plots if they exist and PlotlyDefaults is available
    if (typeof PlotlyDefaults !== 'undefined' && typeof PlotlyDefaults.applyThemeToAllPlots === 'function') {
        try {
            PlotlyDefaults.applyThemeToAllPlots();
        } catch (error) {
            console.warn('Error applying theme to plots:', error);
            // Fallback to old method if the new one fails
            updatePlotlyTheme(theme);
        }
    } else {
        // Fallback to old method
        updatePlotlyTheme(theme);
    }
}

/**
 * Updates theme-related icons throughout the page
 */
function updateThemeIcons() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const sunIcon = document.getElementById('theme-icon-light');
    const moonIcon = document.getElementById('theme-icon-dark');
    
    if (sunIcon && moonIcon) {
        if (currentTheme === 'light') {
            sunIcon.style.opacity = '1';
            moonIcon.style.opacity = '0.5';
        } else {
            sunIcon.style.opacity = '0.5';
            moonIcon.style.opacity = '1';
        }
    }
}

/**
 * Update Plotly plots to match the current theme
 * @deprecated Use PlotlyDefaults.applyThemeToAllPlots instead
 */
function updatePlotlyTheme(theme) {
    // Only run if Plotly is available
    if (typeof Plotly !== 'undefined') {
        try {
            // Get all plot divs - handle more potential plot div naming patterns
            const plotDivs = Array.from(document.querySelectorAll('[id*="plot"], .js-plotly-plot'));
            
            // Set colors based on theme
            const bgColor = theme === 'light' ? '#ffffff' : '#1e1e1e';
            const gridColor = theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
            const textColor = theme === 'light' ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)';
            
            if (plotDivs.length === 0) {
                // No plot divs found, nothing to update
                return;
            }
            
            // Update each plot with new theme
            plotDivs.forEach(plotDiv => {
                try {
                    // Check if this is a valid plotly element
                    if (plotDiv && Plotly.hasPlot(plotDiv)) {
                        const updatedLayout = {
                            paper_bgcolor: bgColor,
                            plot_bgcolor: bgColor,
                            font: {
                                color: textColor
                            },
                            xaxis: {
                                gridcolor: gridColor,
                                zerolinecolor: gridColor,
                                color: textColor
                            },
                            yaxis: {
                                gridcolor: gridColor,
                                zerolinecolor: gridColor,
                                color: textColor
                            }
                        };
                        
                        // Check for 3D scene safely
                        const plotObj = Plotly.getPlotDiv(plotDiv);
                        if (plotObj && plotObj.layout && plotObj.layout.scene) {
                            updatedLayout.scene = {
                                xaxis: { gridcolor: gridColor, zerolinecolor: gridColor, color: textColor },
                                yaxis: { gridcolor: gridColor, zerolinecolor: gridColor, color: textColor },
                                zaxis: { gridcolor: gridColor, zerolinecolor: gridColor, color: textColor }
                            };
                        }
                        
                        Plotly.relayout(plotDiv, updatedLayout);
                    }
                } catch (error) {
                    console.warn('Error updating individual Plotly plot:', error);
                    // Continue to next plot even if this one fails
                }
            });
        } catch (error) {
            console.warn('Error in updatePlotlyTheme:', error);
        }
    }
} 