// Documentation slide-out panel component

export class DocsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._activeTab = 'syntax';
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  open() {
    this.classList.add('open');
    this.dispatchEvent(new CustomEvent('open'));
  }

  close() {
    this.classList.remove('open');
    this.dispatchEvent(new CustomEvent('close'));
  }

  toggle() {
    if (this.classList.contains('open')) {
      this.close();
    } else {
      this.open();
    }
  }

  setupEventListeners() {
    // Close button
    this.shadowRoot.querySelector('#close-btn').addEventListener('click', () => this.close());

    // Tab switching
    this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // Escape key closes panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('open')) {
        this.close();
      }
    });
  }

  switchTab(tabName) {
    this._activeTab = tabName;

    // Update tab buttons
    this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update sections
    this.shadowRoot.querySelectorAll('.section').forEach(section => {
      section.classList.toggle('active', section.id === `doc-${tabName}`);
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          right: 0;
          width: 420px;
          max-width: 100vw;
          height: 100vh;
          background: var(--bg-primary, #ffffff);
          border-left: 1px solid var(--border-color, #ddd);
          box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
          transform: translateX(100%);
          transition: transform 0.3s ease;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        :host(.open) {
          transform: translateX(0);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color, #ddd);
          background: var(--bg-secondary, #f5f5f5);
        }

        .header h2 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 4px 8px;
          color: var(--text-secondary, #666);
          line-height: 1;
        }

        .close-btn:hover {
          color: var(--text-primary, #1a1a1a);
          background: var(--bg-tertiary, #e8e8e8);
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid var(--border-color, #ddd);
        }

        .tab {
          flex: 1;
          padding: 10px 16px;
          border: none;
          background: var(--bg-secondary, #f5f5f5);
          cursor: pointer;
          font-size: 0.875rem;
          font-family: inherit;
          color: var(--text-secondary, #666);
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
        }

        .tab:hover {
          background: var(--bg-tertiary, #e8e8e8);
        }

        .tab.active {
          background: var(--bg-primary, #ffffff);
          color: var(--accent-color, #0066cc);
          border-bottom-color: var(--accent-color, #0066cc);
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .section {
          display: none;
        }

        .section.active {
          display: block;
        }

        h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 20px 0 10px 0;
          color: var(--text-primary, #1a1a1a);
        }

        h3:first-child {
          margin-top: 0;
        }

        h4 {
          font-size: 0.875rem;
          font-weight: 600;
          margin: 16px 0 8px 0;
          color: var(--text-primary, #1a1a1a);
        }

        p {
          font-size: 0.8125rem;
          line-height: 1.5;
          color: var(--text-secondary, #666);
          margin: 8px 0;
        }

        code {
          font-family: var(--font-mono, 'SF Mono', Monaco, monospace);
          font-size: 0.75rem;
          background: var(--bg-secondary, #f5f5f5);
          padding: 2px 5px;
          border-radius: 3px;
        }

        pre {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 0.75rem;
          line-height: 1.5;
          margin: 10px 0;
        }

        pre code {
          background: none;
          padding: 0;
          color: inherit;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.75rem;
          margin: 10px 0;
        }

        th, td {
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1px solid var(--border-color, #ddd);
        }

        th {
          background: var(--bg-secondary, #f5f5f5);
          font-weight: 600;
        }
      </style>

      <div class="header">
        <h2>Documentation</h2>
        <button id="close-btn" class="close-btn">&times;</button>
      </div>

      <div class="tabs">
        <button class="tab active" data-tab="syntax">Syntax</button>
        <button class="tab" data-tab="stdlib">Stdlib</button>
        <button class="tab" data-tab="debug">Debug</button>
        <button class="tab" data-tab="cli">CLI</button>
      </div>

      <div class="content">
        ${this.renderSyntaxTab()}
        ${this.renderStdlibTab()}
        ${this.renderDebugTab()}
        ${this.renderCliTab()}
      </div>
    `;
  }

  renderSyntaxTab() {
    return `
      <div class="section active" id="doc-syntax">
        <h3>Path Commands</h3>
        <table>
          <tr><th>Command</th><th>Name</th><th>Parameters</th></tr>
          <tr><td><code>M</code> / <code>m</code></td><td>Move to</td><td>x y</td></tr>
          <tr><td><code>L</code> / <code>l</code></td><td>Line to</td><td>x y</td></tr>
          <tr><td><code>H</code> / <code>h</code></td><td>Horizontal line</td><td>x</td></tr>
          <tr><td><code>V</code> / <code>v</code></td><td>Vertical line</td><td>y</td></tr>
          <tr><td><code>C</code> / <code>c</code></td><td>Cubic bezier</td><td>x1 y1 x2 y2 x y</td></tr>
          <tr><td><code>Q</code> / <code>q</code></td><td>Quadratic bezier</td><td>x1 y1 x y</td></tr>
          <tr><td><code>A</code> / <code>a</code></td><td>Arc</td><td>rx ry rot large sweep x y</td></tr>
          <tr><td><code>Z</code> / <code>z</code></td><td>Close path</td><td>(none)</td></tr>
        </table>

        <h3>Variables</h3>
        <p>Declare variables with <code>let</code>:</p>
        <pre><code>let width = 200;
let centerX = 100;
M centerX 50</code></pre>

        <h3>Expressions with calc()</h3>
        <p>Use <code>calc()</code> for math expressions:</p>
        <pre><code>let r = 50;
M calc(100 - r) 100
L calc(100 + r) 100</code></pre>

        <h4>Operators</h4>
        <table>
          <tr><td><code>+</code> <code>-</code> <code>*</code> <code>/</code> <code>%</code></td><td>Arithmetic</td></tr>
          <tr><td><code>&lt;</code> <code>&gt;</code> <code>&lt;=</code> <code>&gt;=</code> <code>==</code> <code>!=</code></td><td>Comparison</td></tr>
          <tr><td><code>&&</code> <code>||</code> <code>!</code></td><td>Logical</td></tr>
        </table>

        <h3>For Loops</h3>
        <pre><code>for (i in 0..10) {
  L calc(i * 20) calc(i * 10)
}</code></pre>
        <p>Range <code>0..10</code> includes 0-9 (exclusive end).</p>

        <h3>Conditionals</h3>
        <pre><code>if (size > 50) {
  circle(100, 100, size)
} else {
  rect(50, 50, 100, 100)
}</code></pre>

        <h3>Functions</h3>
        <pre><code>fn square(x, y, size) {
  rect(x, y, size, size)
}

square(10, 10, 50)</code></pre>

        <h3>Comments</h3>
        <pre><code>// This is a comment
let x = 50;  // inline comment</code></pre>
      </div>
    `;
  }

  renderStdlibTab() {
    return `
      <div class="section" id="doc-stdlib">
        <h3>Math Functions</h3>

        <h4>Trigonometry</h4>
        <p><code>sin(x)</code> <code>cos(x)</code> <code>tan(x)</code> <code>asin(x)</code> <code>acos(x)</code> <code>atan(x)</code> <code>atan2(y, x)</code></p>

        <h4>Angle Conversion</h4>
        <p><code>rad(degrees)</code> <code>deg(radians)</code></p>

        <h4>Exponential</h4>
        <p><code>exp(x)</code> <code>log(x)</code> <code>log10(x)</code> <code>pow(x, y)</code> <code>sqrt(x)</code> <code>cbrt(x)</code></p>

        <h4>Rounding</h4>
        <p><code>floor(x)</code> <code>ceil(x)</code> <code>round(x)</code> <code>trunc(x)</code></p>

        <h4>Utility</h4>
        <p><code>abs(x)</code> <code>sign(x)</code> <code>min(a, b)</code> <code>max(a, b)</code></p>

        <h4>Interpolation</h4>
        <table>
          <tr><td><code>lerp(a, b, t)</code></td><td>Linear interpolation</td></tr>
          <tr><td><code>clamp(val, min, max)</code></td><td>Constrain to range</td></tr>
          <tr><td><code>map(val, inMin, inMax, outMin, outMax)</code></td><td>Map between ranges</td></tr>
        </table>

        <h4>Constants</h4>
        <p><code>PI()</code> <code>E()</code> <code>TAU()</code></p>

        <h4>Random</h4>
        <p><code>random()</code> <code>randomRange(min, max)</code></p>

        <h3>Path Functions</h3>

        <h4>Shapes</h4>
        <table>
          <tr><td><code>circle(cx, cy, r)</code></td><td>Circle</td></tr>
          <tr><td><code>rect(x, y, w, h)</code></td><td>Rectangle</td></tr>
          <tr><td><code>roundRect(x, y, w, h, r)</code></td><td>Rounded rectangle</td></tr>
          <tr><td><code>polygon(cx, cy, r, sides)</code></td><td>Regular polygon</td></tr>
          <tr><td><code>star(cx, cy, outer, inner, points)</code></td><td>Star shape</td></tr>
        </table>

        <h4>Curves</h4>
        <table>
          <tr><td><code>line(x1, y1, x2, y2)</code></td><td>Line segment</td></tr>
          <tr><td><code>arc(rx, ry, rot, lg, sw, x, y)</code></td><td>Arc</td></tr>
          <tr><td><code>quadratic(x1, y1, cx, cy, x2, y2)</code></td><td>Quadratic bezier</td></tr>
          <tr><td><code>cubic(x1, y1, c1x, c1y, c2x, c2y, x2, y2)</code></td><td>Cubic bezier</td></tr>
        </table>

        <h4>Commands</h4>
        <p><code>moveTo(x, y)</code> <code>lineTo(x, y)</code> <code>closePath()</code></p>

        <h3>Angle Units</h3>
        <p>Numbers can have angle unit suffixes:</p>
        <table>
          <tr><td><code>45deg</code></td><td>Degrees (converted to radians)</td></tr>
          <tr><td><code>1.5rad</code></td><td>Radians (no conversion)</td></tr>
        </table>
        <pre><code>let angle = 90deg;
M sin(45deg) cos(45deg)</code></pre>

        <h3>Polar Coordinate Functions</h3>
        <p>These functions use the current position from <code>ctx.position</code>.</p>

        <h4>polarPoint(angle, distance)</h4>
        <p>Returns absolute point {x, y} at angle/distance from current position:</p>
        <pre><code>M 100 100
let pt = polarPoint(45deg, 50);
L pt.x pt.y  // Line to (135, 135)</code></pre>

        <h4>polarOffset(angle, distance)</h4>
        <p>Returns relative offset {dx, dy} - independent of current position:</p>
        <pre><code>let off = polarOffset(45deg, 50);
// off.dx ≈ 35.35, off.dy ≈ 35.35
L calc(ctx.position.x + off.dx) calc(ctx.position.y + off.dy)</code></pre>

        <h4>polarMove(angle, distance, isMoveTo?)</h4>
        <p>Moves by angle/distance, drawing a line (or move if isMoveTo=1):</p>
        <pre><code>M 50 50
polarMove(0, 30)        // L 80 50 (line east)
polarMove(90deg, 30, 1) // M 80 80 (move south)</code></pre>

        <h4>polarLine(angle, distance)</h4>
        <p>Always draws a line by angle/distance:</p>
        <pre><code>M 100 100
polarLine(45deg, 50)    // L 135.35 135.35</code></pre>

        <h3>Arc & Tangent Functions</h3>

        <h4>arcFromCenter(dcx, dcy, r, startAngle, endAngle, clockwise)</h4>
        <p>Draws an arc with center at offset (dcx, dcy) from current position. Returns object with endpoint and tangent:</p>
        <pre><code>M 50 50
let arc = arcFromCenter(30, 30, 20, 0, 90deg, 1);
// Center at (80, 80), arc from (100, 80) to (80, 100)
// arc.point = {x, y}, arc.angle = tangent angle</code></pre>

        <h4>tangentLine(length)</h4>
        <p>Draws a line continuing in the last tangent direction:</p>
        <pre><code>M 50 50
polarLine(0, 40)        // Going east
tangentLine(30)         // Continue east 30px</code></pre>

        <h4>tangentArc(radius, sweepAngle)</h4>
        <p>Draws an arc that starts tangent to the previous direction:</p>
        <pre><code>M 50 100
polarLine(0, 40)        // Going east
tangentArc(20, 90deg)   // Smooth 90° curve
tangentLine(30)         // Continue in new direction</code></pre>

        <h3>Example</h3>
        <pre><code>// 8 points around a circle
let cx = 100;
let cy = 100;
let r = 60;

for (i in 0..7) {
  let angle = calc(i / 8 * TAU());
  let x = calc(cx + cos(angle) * r);
  let y = calc(cy + sin(angle) * r);
  circle(x, y, 5)
}</code></pre>
      </div>
    `;
  }

  renderDebugTab() {
    return `
      <div class="section" id="doc-debug">
        <h3>Console Output</h3>
        <p>Click the <strong>Console</strong> button in the header to view debug output.</p>

        <h3>log() Function</h3>
        <p>Use <code>log()</code> to inspect values during execution:</p>
        <pre><code>log("message")           // String message
log(myVar)               // Variable with label
log("pos:", ctx.position) // Multiple args
log(ctx)                 // Full context object</code></pre>

        <h4>Output Format</h4>
        <p>String arguments display as-is. Other expressions show a label with the source:</p>
        <pre><code>log("radius is", r)
// Output:
// radius is
// r = 50</code></pre>

        <p>Objects are expandable in the console - click the arrow to explore nested properties.</p>

        <h3>ctx Object</h3>
        <p>The <code>ctx</code> object tracks path state during evaluation:</p>

        <h4>ctx.position</h4>
        <p>Current pen position after the last command.</p>
        <table>
          <tr><td><code>ctx.position.x</code></td><td>X coordinate</td></tr>
          <tr><td><code>ctx.position.y</code></td><td>Y coordinate</td></tr>
        </table>
        <pre><code>M 100 50
log(ctx.position)  // {x: 100, y: 50}
L 150 75
log(ctx.position)  // {x: 150, y: 75}</code></pre>

        <h4>ctx.start</h4>
        <p>Subpath start position (set by <code>M</code>/<code>m</code>, used by <code>Z</code>).</p>
        <table>
          <tr><td><code>ctx.start.x</code></td><td>X coordinate</td></tr>
          <tr><td><code>ctx.start.y</code></td><td>Y coordinate</td></tr>
        </table>

        <h4>ctx.commands</h4>
        <p>Array of all executed commands with their positions:</p>
        <pre><code>// Each entry contains:
{
  command: "L",        // Command letter
  args: [150, 75],     // Evaluated arguments
  start: {x: 100, y: 50},
  end: {x: 150, y: 75}
}</code></pre>

        <h3>Using ctx in Paths</h3>
        <p>Access position values with <code>calc()</code>:</p>
        <pre><code>M 50 50
// Draw relative to current position
L calc(ctx.position.x + 30) ctx.position.y
circle(ctx.position.x, ctx.position.y, 5)</code></pre>

        <h3>Example: Debug a Loop</h3>
        <pre><code>M 20 100
for (i in 0..4) {
  log("iteration", i, ctx.position)
  L calc(ctx.position.x + 40) 100
}</code></pre>
      </div>
    `;
  }

  renderCliTab() {
    return `
      <div class="section" id="doc-cli">
        <h3>Installation</h3>
        <pre><code>npm install -g svg-path-extended</code></pre>
        <p>Or use with npx:</p>
        <pre><code>npx svg-path-extended [options]</code></pre>

        <h3>Basic Usage</h3>
        <table>
          <tr><td><code>svg-path-extended input.svgx</code></td><td>Compile a file</td></tr>
          <tr><td><code>svg-path-extended -e 'code'</code></td><td>Compile inline code</td></tr>
          <tr><td><code>echo 'code' | svg-path-extended -</code></td><td>Read from stdin</td></tr>
        </table>

        <h3>Output Options</h3>
        <table>
          <tr><td><code>-o file.txt</code></td><td>Output path data to file</td></tr>
          <tr><td><code>--output-svg-file=out.svg</code></td><td>Output complete SVG file</td></tr>
          <tr><td><code>--annotated</code></td><td>Debug output with comments</td></tr>
        </table>

        <h3>SVG Styling</h3>
        <p>Use with <code>--output-svg-file</code>:</p>
        <table>
          <tr><td><code>--stroke=color</code></td><td>Stroke color (default: #000)</td></tr>
          <tr><td><code>--fill=color</code></td><td>Fill color (default: none)</td></tr>
          <tr><td><code>--stroke-width=n</code></td><td>Stroke width (default: 2)</td></tr>
          <tr><td><code>--viewBox=box</code></td><td>SVG viewBox</td></tr>
          <tr><td><code>--width=w</code></td><td>SVG width</td></tr>
          <tr><td><code>--height=h</code></td><td>SVG height</td></tr>
        </table>

        <h3>Examples</h3>
        <pre><code># Red circle SVG
svg-path-extended -e 'circle(100, 100, 50)' \\
  --output-svg-file=circle.svg \\
  --stroke=red --stroke-width=3

# Blue filled hexagon
svg-path-extended -e 'polygon(100, 100, 80, 6)' \\
  --output-svg-file=hex.svg \\
  --stroke=navy --fill=lightblue</code></pre>

        <h3>Annotated Output</h3>
        <p>Shows loop iterations and function expansions:</p>
        <pre><code>svg-path-extended -e 'for (i in 0..3) { M i 0 }' --annotated

# Output:
//--- for (i in 0..3) from line 1
  //--- iteration 0
  M 0 0
  //--- iteration 1
  M 1 0
  ...</code></pre>

        <h3>Help</h3>
        <pre><code>svg-path-extended --help
svg-path-extended --version</code></pre>
      </div>
    `;
  }
}

customElements.define('docs-panel', DocsPanel);
