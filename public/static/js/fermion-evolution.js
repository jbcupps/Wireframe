/* Interactive research-model adapter for the Fermion Evolution page. */
(function () {
    'use strict';

    const particles = {
        electron: { name: 'Electron', mass: 0.511, charge: '-1e', color: '#65d6ff' },
        muon: { name: 'Muon', mass: 105.7, charge: '-1e', color: '#d7a6ff' },
        tau: { name: 'Tau', mass: 1777, charge: '-1e', color: '#ffad77' }
    };

    class FermionEvolution {
        constructor() {
            this.plot = document.getElementById('klein-bottle-plot');
            this.timeline = document.getElementById('timeline');
            this.frame = null;
            this.playing = false;
            this.view = '3d';
            if (!this.plot || !this.timeline || typeof Plotly === 'undefined') return;
            this.bindControls();
            this.watchCanvases();
            this.render();
        }

        number(id) { return Number(document.getElementById(id).value); }
        selected() { return particles[document.querySelector('input[name="particle"]:checked').value]; }

        bindControls() {
            const render = () => this.render();
            document.querySelectorAll('input[name="particle"], input[type="checkbox"]').forEach(input => input.addEventListener('change', render));
            ['twist-angle', 'temporal-phase', 'field-strength', 'evolution-speed', 'timeline'].forEach(id => document.getElementById(id).addEventListener('input', render));
            document.getElementById('play-btn').addEventListener('click', () => this.start());
            document.getElementById('pause-btn').addEventListener('click', () => this.pause());
            document.getElementById('reset-btn').addEventListener('click', () => this.reset());
            document.querySelectorAll('.view-btn').forEach(button => {
                button.setAttribute('aria-pressed', String(button.dataset.view === this.view));
                button.addEventListener('click', () => {
                    this.view = button.dataset.view;
                    document.querySelectorAll('.view-btn').forEach(candidate => candidate.setAttribute('aria-pressed', String(candidate === button)));
                    this.render();
                });
            });
        }

        start() {
            if (this.playing) return;
            this.playing = true;
            const button = document.getElementById('play-btn');
            button.setAttribute('aria-pressed', 'true');
            button.innerHTML = '<i class="fas fa-play"></i> Playing';
            let previous = performance.now();
            const advance = now => {
                if (!this.playing) return;
                const delta = Math.min((now - previous) / 1000, .1);
                previous = now;
                this.timeline.value = Math.round((this.number('timeline') + delta * this.number('evolution-speed') * 115) % 1000);
                this.render();
                this.frame = requestAnimationFrame(advance);
            };
            this.frame = requestAnimationFrame(advance);
        }

        pause() {
            this.playing = false;
            if (this.frame) cancelAnimationFrame(this.frame);
            this.frame = null;
            const button = document.getElementById('play-btn');
            button.setAttribute('aria-pressed', 'false');
            button.innerHTML = '<i class="fas fa-play"></i> Play Evolution';
        }

        reset() {
            this.pause();
            document.querySelector('input[name="particle"][value="electron"]').checked = true;
            [['twist-angle', 0], ['temporal-phase', 0], ['field-strength', 50], ['evolution-speed', 1], ['timeline', 0]].forEach(([id, value]) => document.getElementById(id).value = value);
            ['show-field-lines', 'show-topology-changes'].forEach(id => document.getElementById(id).checked = true);
            ['show-ctc-paths', 'show-mass-generation'].forEach(id => document.getElementById(id).checked = false);
            this.view = '3d';
            document.querySelectorAll('.view-btn').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === this.view)));
            this.render();
        }

        state() {
            const particle = this.selected();
            const phase = this.number('temporal-phase') / 100;
            const progress = this.number('timeline') / 1000;
            const massFactor = 1 + .06 * Math.sin(progress * Math.PI * 2 + phase);
            document.getElementById('twist-value').textContent = `${this.number('twist-angle')}°`;
            document.getElementById('phase-value').textContent = `${phase.toFixed(2)} rad`;
            document.getElementById('field-value').textContent = `${this.number('field-strength')}%`;
            document.getElementById('speed-value').textContent = `${this.number('evolution-speed').toFixed(1)}×`;
            document.getElementById('current-particle').textContent = `${particle.name} Klein Bottle Projection`;
            document.getElementById('current-mass').textContent = `${(particle.mass * massFactor).toFixed(particle.mass < 1 ? 3 : 1)} MeV/c²`;
            document.getElementById('current-charge').textContent = particle.charge;
            return { particle, phase, progress, massFactor };
        }

        surface(state) {
            const resolution = 34;
            const twist = this.number('twist-angle') * Math.PI / 180;
            const field = this.number('field-strength') / 100;
            const x = [], y = [], z = [], color = [];
            for (let row = 0; row <= resolution; row += 1) {
                const xr = [], yr = [], zr = [], cr = [];
                const u = row * 2 * Math.PI / resolution;
                for (let column = 0; column <= resolution; column += 1) {
                    const v = column * 2 * Math.PI / resolution;
                    const radius = 2 + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v);
                    const pulse = 1 + .11 * Math.sin(state.progress * Math.PI * 2 + state.phase);
                    const baseX = radius * Math.cos(v) * pulse;
                    const baseY = radius * Math.sin(v) * pulse;
                    const baseZ = Math.cos(u / 2) * Math.cos(v) + Math.sin(u / 2) * Math.cos(2 * v);
                    xr.push(baseX * Math.cos(twist) - baseZ * Math.sin(twist));
                    yr.push(baseY); zr.push(baseX * Math.sin(twist) + baseZ * Math.cos(twist));
                    cr.push(Math.sin(u) * Math.cos(v) + field * .35);
                }
                x.push(xr); y.push(yr); z.push(zr); color.push(cr);
            }
            const traces = [{ type: 'surface', x, y, z, surfacecolor: color, opacity: .82, showscale: false,
                colorscale: [[0, '#132238'], [.48, state.particle.color], [1, '#fff0cf']],
                hovertemplate: 'Projected coordinate<br>x: %{x:.2f}<br>y: %{y:.2f}<br>z: %{z:.2f}<extra></extra>' }];
            if (document.getElementById('show-field-lines').checked) traces.push(this.loopTrace(2.7 + field * .4, .45, state.phase, '#f8d66d', 'Field guide'));
            if (document.getElementById('show-ctc-paths').checked) traces.push(this.loopTrace(1.25, .7, 0, '#ff9fbd', 'Hypothetical CTC path'));
            return traces;
        }

        loopTrace(radius, height, phase, color, name) {
            const x = [], y = [], z = [];
            for (let index = 0; index <= 100; index += 1) {
                const t = index * Math.PI * 2 / 100;
                x.push(radius * Math.cos(t)); y.push(radius * Math.sin(t)); z.push(height * Math.sin(2 * t + phase));
            }
            return { type: 'scatter3d', mode: 'lines', x, y, z, name, line: { color, width: 4 }, hoverinfo: 'skip' };
        }

        layout() {
            const projection = this.view === 'projection' ? { type: 'orthographic' } : { type: 'perspective' };
            const camera = this.view === 'cross-section' ? { eye: { x: 0, y: .15, z: 2.7 }, up: { x: 0, y: 1, z: 0 }, projection } : { eye: { x: 1.55, y: 1.55, z: 1.35 }, projection };
            return { autosize: true, uirevision: `fermion-${this.view}`, margin: { l: 0, r: 0, b: 0, t: 10 }, paper_bgcolor: 'rgba(0,0,0,0)', font: { color: '#f7fafc' }, legend: { orientation: 'h', y: .98, x: .02, bgcolor: 'rgba(15,20,25,.72)' }, scene: { aspectmode: 'cube', camera, bgcolor: 'rgba(0,0,0,0)', xaxis: { title: 'x' }, yaxis: { title: 'y' }, zaxis: { title: 'z' } } };
        }

        render() {
            const state = this.state();
            Plotly.react(this.plot, this.surface(state), this.layout(), { responsive: true, displaylogo: false, scrollZoom: true });
            this.drawCharts(state);
        }

        watchCanvases() {
            const redraw = () => this.drawCharts(this.state());
            if (typeof ResizeObserver !== 'undefined') {
                this.canvasObserver = new ResizeObserver(redraw);
                document.querySelectorAll('.mini-plot-container').forEach(container => this.canvasObserver.observe(container));
            }
            window.addEventListener('resize', redraw, { passive: true });
        }

        chart(id, color, values, label) {
            const canvas = document.getElementById(id), rect = canvas.getBoundingClientRect();
            const width = Math.max(220, Math.round(rect.width || 300)), height = Math.max(140, Math.round(rect.height || 160));
            const scale = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * scale; canvas.height = height * scale;
            const ctx = canvas.getContext('2d'); ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(8, 15, 27, .45)'; ctx.fillRect(0, 0, width, height); ctx.strokeStyle = 'rgba(255,255,255,.18)';
            for (let line = 1; line < 4; line += 1) { const y = 18 + line * (height - 42) / 4; ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(width - 12, y); ctx.stroke(); }
            const low = Math.min(...values), span = Math.max(Math.max(...values) - low, .001); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
            values.forEach((value, index) => { const x = 30 + index * (width - 42) / (values.length - 1), y = 18 + (1 - (value - low) / span) * (height - 42); if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
            ctx.stroke(); ctx.fillStyle = '#e2e8f0'; ctx.font = '12px system-ui'; ctx.fillText(label, 30, height - 10);
        }

        drawCharts(state) {
            const samples = Array.from({ length: 44 }, (_, index) => index * Math.PI * 2 / 43), phase = state.phase + state.progress * Math.PI * 2;
            this.chart('mass-chart', state.particle.color, samples.map(t => state.particle.mass * (1 + .06 * Math.sin(t + phase))), 'relative mass (model)');
            this.chart('topology-chart', '#b58cff', samples.map(t => .5 + .4 * Math.sin(t + phase) * Math.cos(t / 2)), 'topology indicator (model)');
            this.chart('field-chart', '#f8d66d', samples.map(t => this.number('field-strength') + 14 * Math.sin(t + phase)), 'field setting (%)');
        }
    }

    document.addEventListener('DOMContentLoaded', () => { window.fermionEvolution = new FermionEvolution(); });
    window.FermionEvolution = FermionEvolution;
})();
