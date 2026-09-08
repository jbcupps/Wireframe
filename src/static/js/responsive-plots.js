/*
 * Keep legacy Plotly figures matched to the size of the space the page gives
 * them. Several older labs create their figures before tabs or responsive
 * layouts have settled, which leaves a canvas sized for an earlier viewport.
 */
(function () {
    const observed = new WeakSet();
    let scheduled = false;

    function isVisible(element) {
        const bounds = element.getBoundingClientRect();
        return bounds.width > 1 && bounds.height > 1;
    }

    function resizePlot(element) {
        if (!window.Plotly || !element || !isVisible(element)) return;
        try {
            window.Plotly.Plots.resize(element);
        } catch (error) {
            // A plot can be replaced while its parent is resizing. The next
            // observation will resize the replacement, so this is recoverable.
            console.debug('Deferred Plotly resize', error);
        }
    }

    function resizeAll() {
        scheduled = false;
        document.querySelectorAll('.js-plotly-plot').forEach(resizePlot);
    }

    function scheduleResize() {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(resizeAll);
    }

    const observer = new ResizeObserver((entries) => {
        entries.forEach(({ target }) => {
            if (target.classList.contains('js-plotly-plot')) resizePlot(target);
        });
    });

    function observePlot(element) {
        if (!(element instanceof HTMLElement) || observed.has(element)) return;
        observed.add(element);
        observer.observe(element);
        resizePlot(element);
    }

    function discoverPlots(root) {
        if (!(root instanceof Element || root instanceof Document)) return;
        if (root instanceof Element && root.matches('.js-plotly-plot')) observePlot(root);
        root.querySelectorAll?.('.js-plotly-plot').forEach(observePlot);
    }

    document.addEventListener('DOMContentLoaded', () => {
        discoverPlots(document);
        const mutations = new MutationObserver((records) => {
            records.forEach((record) => record.addedNodes.forEach(discoverPlots));
            scheduleResize();
        });
        mutations.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('resize', scheduleResize, { passive: true });
        window.addEventListener('orientationchange', scheduleResize, { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) scheduleResize();
        });
        document.addEventListener('legacy-plot-visible', scheduleResize);
    });
}());
