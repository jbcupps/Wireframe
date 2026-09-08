/*
 * Shared progressive enhancements for the original Flask visualization labs.
 * The individual labs own their simulations; this file only gives their
 * canvases, Plotly charts, controls, and tabs a reliable common shell.
 */
(function () {
    'use strict';

    const legacyRoutes = new Set([
        '/visualization', '/skb_explorer', '/maxwell', '/maxwells', '/oscillator',
        '/double_slit', '/quantum_tunneling', '/topological_diffusion',
        '/evolution', '/fermion-evolution'
    ]);

    if (!legacyRoutes.has(window.location.pathname)) {
        return;
    }

    document.body.classList.add('legacy-visualization');
    document.body.classList.add(`legacy-${window.location.pathname.slice(1).replace(/_/g, '-')}`);

    const plotCandidates = '[id="plot"], [id$="-plot"], [id^="plot"], .js-plotly-plot';
    const observedPlots = new WeakSet();
    const initializedPlots = new WeakSet();
    let resizeQueued = false;

    function hasPlot(element) {
        return Boolean(
            element &&
            window.Plotly &&
            typeof window.Plotly.hasPlot === 'function' &&
            window.Plotly.hasPlot(element)
        );
    }

    function resizePlot(element) {
        if (!hasPlot(element) || !element.offsetWidth || !element.offsetHeight) {
            return;
        }

        try {
            // autosize keeps the chart within its panel without resetting data,
            // pan/zoom, or a 3D camera selected by the learner.
            window.Plotly.relayout(element, {
                autosize: true,
                uirevision: element.dataset.legacyUirevision || `legacy-${element.id || 'plot'}`
            });
            window.Plotly.Plots.resize(element);
        } catch (error) {
            console.warn('Could not resize visualization', error);
        }
    }

    function resizeVisiblePlots() {
        if (resizeQueued) {
            return;
        }
        resizeQueued = true;
        window.requestAnimationFrame(() => {
            resizeQueued = false;
            document.querySelectorAll(plotCandidates).forEach(resizePlot);
        });
    }

    const plotResizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(entries => {
        entries.forEach(entry => resizePlot(entry.target));
    });

    function registerPlots() {
        let foundNewPlot = false;
        document.querySelectorAll(plotCandidates).forEach(element => {
            if (!observedPlots.has(element)) {
                observedPlots.add(element);
                element.dataset.legacyUirevision = element.dataset.legacyUirevision || `legacy-${element.id || 'plot'}`;
                if (plotResizeObserver) {
                    plotResizeObserver.observe(element);
                }
            }
            if (hasPlot(element) && !initializedPlots.has(element)) {
                initializedPlots.add(element);
                foundNewPlot = true;
            }
        });
        if (foundNewPlot) {
            resizeVisiblePlots();
        }
    }

    function describeRangeInputs() {
        document.querySelectorAll('input[type="range"]').forEach(input => {
            const label = input.id && document.querySelector(`label[for="${input.id}"]`);
            if (label && !input.getAttribute('aria-label')) {
                input.setAttribute('aria-label', label.textContent.trim().replace(/\s+/g, ' '));
            }
            const updateAriaValue = () => input.setAttribute('aria-valuetext', input.value);
            input.addEventListener('input', updateAriaValue);
            updateAriaValue();
        });
    }

    function prepareTabs() {
        const tabs = Array.from(document.querySelectorAll('.tab[data-tab], .tab-btn[data-tab], .tab-button[data-tab]'));
        tabs.forEach((tab, index) => {
            const key = tab.dataset.tab;
            const panel = document.getElementById(`${key}-tab`) || document.getElementById(`${key}-content`) || document.getElementById(key);
            const group = tab.closest('.tabs, .content-tabs') || tab.parentElement;
            if (group) {
                group.setAttribute('role', 'tablist');
            }
            tab.setAttribute('role', 'tab');
            tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');
            if (panel) {
                tab.id = tab.id || `legacy-tab-${index}`;
                tab.setAttribute('aria-controls', panel.id);
                tab.setAttribute('aria-selected', String(tab.classList.contains('active')));
                panel.setAttribute('role', 'tabpanel');
                panel.setAttribute('aria-labelledby', tab.id);
            }
            tab.addEventListener('click', () => {
                const siblingTabs = tabs.filter(candidate => candidate.closest('.tabs, .content-tabs') === group);
                const siblingPanels = siblingTabs.map(candidate => {
                    const candidateKey = candidate.dataset.tab;
                    return document.getElementById(`${candidateKey}-tab`) || document.getElementById(`${candidateKey}-content`) || document.getElementById(candidateKey);
                }).filter(Boolean);
                if (panel) {
                    siblingTabs.forEach(candidate => candidate.classList.toggle('active', candidate === tab));
                    siblingPanels.forEach(candidate => candidate.classList.toggle('active', candidate === panel));
                }
                window.setTimeout(() => {
                    tabs.forEach(candidate => {
                        candidate.setAttribute('aria-selected', String(candidate.classList.contains('active')));
                        candidate.setAttribute('tabindex', candidate.classList.contains('active') ? '0' : '-1');
                    });
                    resizeVisiblePlots();
                }, 0);
            });
            tab.addEventListener('keydown', event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                    return;
                }
                const siblings = tabs.filter(candidate => candidate.closest('.tabs, .content-tabs') === group);
                const currentIndex = siblings.indexOf(tab);
                const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? siblings.length - 1 :
                    (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + siblings.length) % siblings.length;
                event.preventDefault();
                siblings[nextIndex].focus();
                siblings[nextIndex].click();
            });
        });
    }

    function sizeCanvases() {
        document.querySelectorAll('.legacy-visualization canvas').forEach(canvas => {
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.display = 'block';
        });
    }

    document.addEventListener('legacy:tabshown', resizeVisiblePlots);
    window.addEventListener('resize', resizeVisiblePlots, { passive: true });
    window.addEventListener('orientationchange', resizeVisiblePlots, { passive: true });

    const mutations = new MutationObserver(() => {
        // Plotly changes its own SVG tree during relayout. Register only newly
        // created chart roots here so that those internal changes do not create
        // a resize/relayout loop.
        registerPlots();
        sizeCanvases();
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    describeRangeInputs();
    prepareTabs();
    sizeCanvases();
    registerPlots();
    window.setTimeout(resizeVisiblePlots, 150);
})();
