// Docs View - Full-page documentation
// Route: /docs

const styles = `
  :host {
    display: block;
    height: 100%;
    overflow-y: auto;
    background: var(--bg-primary, #ffffff);
  }

  .docs-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    margin: 0 0 0.5rem 0;
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  .subtitle {
    margin: 0 0 2rem 0;
    color: var(--text-secondary, #666);
    font-size: 0.875rem;
  }

  .toc {
    background: var(--bg-secondary, #f5f5f5);
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .toc h2 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  .toc ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .toc li {
    margin-bottom: 0.5rem;
  }

  .toc a {
    color: var(--accent-color, #0066cc);
    text-decoration: none;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .toc a:hover {
    text-decoration: underline;
  }

  section {
    margin-bottom: 3rem;
  }

  section h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  section h3 {
    margin: 1.5rem 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
  }

  p {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1a1a1a);
    line-height: 1.6;
  }

  code {
    font-family: var(--font-mono, monospace);
    font-size: 0.875em;
    background: var(--bg-secondary, #f5f5f5);
    padding: 0.125rem 0.375rem;
    border-radius: 3px;
  }

  pre {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    font-family: var(--font-mono, monospace);
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0 0 1rem 0;
  }

  pre code {
    background: none;
    padding: 0;
    color: inherit;
  }

  .keyword { color: #569cd6; }
  .function { color: #dcdcaa; }
  .number { color: #b5cea8; }
  .string { color: #ce9178; }
  .comment { color: #6a9955; }

  ul, ol {
    margin: 0 0 1rem 0;
    padding-left: 1.5rem;
    color: var(--text-primary, #1a1a1a);
  }

  li {
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
  }

  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  th {
    font-weight: 600;
    color: var(--text-primary, #1a1a1a);
    background: var(--bg-secondary, #f5f5f5);
  }

  td {
    color: var(--text-primary, #1a1a1a);
  }

  td code {
    white-space: nowrap;
  }

  .external-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--accent-color, #0066cc);
    text-decoration: none;
  }

  .external-link:hover {
    text-decoration: underline;
  }

  .external-link::after {
    content: '↗';
    font-size: 0.75em;
  }

  @media (max-width: 600px) {
    .docs-container {
      padding: 1rem;
    }

    pre {
      font-size: 0.8125rem;
    }

    table {
      display: block;
      overflow-x: auto;
    }
  }
`;

class DocsView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupScrollLinks();
  }

  setupScrollLinks() {
    // Handle TOC anchor clicks with JS scrolling (avoids hash routing conflict)
    this.shadowRoot.addEventListener('click', (e) => {
      const link = e.target.closest('[data-scroll-to]');
      if (link) {
        e.preventDefault();
        const targetId = link.dataset.scrollTo;
        const target = this.shadowRoot.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>${styles}</style>

      <div class="docs-container">
        <h1>Documentation</h1>
        <p class="subtitle">Learn how to use svg-path-extended to create dynamic SVG paths</p>

        <nav class="toc">
          <h2>Table of Contents</h2>
          <ul>
            <li><a href="javascript:void(0)" data-scroll-to="getting-started">Getting Started</a></li>
            <li><a href="javascript:void(0)" data-scroll-to="syntax">Syntax Reference</a></li>
            <li><a href="javascript:void(0)" data-scroll-to="variables">Variables & Expressions</a></li>
            <li><a href="javascript:void(0)" data-scroll-to="control-flow">Control Flow</a></li>
            <li><a href="javascript:void(0)" data-scroll-to="functions">Functions</a></li>
            <li><a href="javascript:void(0)" data-scroll-to="stdlib">Standard Library</a></li>
          </ul>
        </nav>

        <section id="getting-started">
          <h2>Getting Started</h2>
          <p>
            svg-path-extended is a language that extends SVG path syntax with variables,
            expressions, control flow, and functions. It compiles to standard SVG path data.
          </p>
          <p>
            Try this simple example in the playground:
          </p>
          <pre><code><span class="comment">// A simple rectangle using variables</span>
<span class="keyword">let</span> size = <span class="number">50</span>
<span class="keyword">let</span> x = <span class="number">10</span>
<span class="keyword">let</span> y = <span class="number">10</span>

M x y
h size
v size
h <span class="function">calc</span>(-size)
Z</code></pre>
        </section>

        <section id="syntax">
          <h2>Syntax Reference</h2>
          <h3>Path Commands</h3>
          <p>All standard SVG path commands are supported:</p>
          <table>
            <thead>
              <tr>
                <th>Command</th>
                <th>Description</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>M x y</code></td>
                <td>Move to (absolute)</td>
                <td><code>M 10 20</code></td>
              </tr>
              <tr>
                <td><code>m dx dy</code></td>
                <td>Move to (relative)</td>
                <td><code>m 10 20</code></td>
              </tr>
              <tr>
                <td><code>L x y</code></td>
                <td>Line to (absolute)</td>
                <td><code>L 50 50</code></td>
              </tr>
              <tr>
                <td><code>l dx dy</code></td>
                <td>Line to (relative)</td>
                <td><code>l 40 30</code></td>
              </tr>
              <tr>
                <td><code>H x</code></td>
                <td>Horizontal line (absolute)</td>
                <td><code>H 100</code></td>
              </tr>
              <tr>
                <td><code>V y</code></td>
                <td>Vertical line (absolute)</td>
                <td><code>V 100</code></td>
              </tr>
              <tr>
                <td><code>C</code></td>
                <td>Cubic bezier curve</td>
                <td><code>C 20 20, 40 20, 50 10</code></td>
              </tr>
              <tr>
                <td><code>Q</code></td>
                <td>Quadratic bezier curve</td>
                <td><code>Q 25 25, 50 10</code></td>
              </tr>
              <tr>
                <td><code>A</code></td>
                <td>Arc</td>
                <td><code>A 25 25 0 0 1 50 50</code></td>
              </tr>
              <tr>
                <td><code>Z</code></td>
                <td>Close path</td>
                <td><code>Z</code></td>
              </tr>
            </tbody>
          </table>
        </section>

        <section id="variables">
          <h2>Variables & Expressions</h2>
          <h3>Declaring Variables</h3>
          <pre><code><span class="keyword">let</span> width = <span class="number">100</span>
<span class="keyword">let</span> height = <span class="number">50</span>
<span class="keyword">let</span> ratio = width / height</code></pre>

          <h3>Using calc() in Path Commands</h3>
          <p>Use <code>calc()</code> for math expressions in path arguments:</p>
          <pre><code><span class="keyword">let</span> cx = <span class="number">100</span>
<span class="keyword">let</span> cy = <span class="number">100</span>
<span class="keyword">let</span> r = <span class="number">50</span>

M <span class="function">calc</span>(cx - r) cy
A r r <span class="number">0</span> <span class="number">1</span> <span class="number">1</span> <span class="function">calc</span>(cx + r) cy
A r r <span class="number">0</span> <span class="number">1</span> <span class="number">1</span> <span class="function">calc</span>(cx - r) cy</code></pre>
        </section>

        <section id="control-flow">
          <h2>Control Flow</h2>
          <h3>For Loops</h3>
          <pre><code><span class="keyword">for</span> i <span class="keyword">from</span> <span class="number">0</span> <span class="keyword">to</span> <span class="number">5</span> {
  M <span class="function">calc</span>(i * <span class="number">20</span>) <span class="number">0</span>
  v <span class="number">100</span>
}</code></pre>

          <h3>Conditionals</h3>
          <pre><code><span class="keyword">let</span> showFill = <span class="keyword">true</span>

<span class="keyword">if</span> showFill {
  <span class="comment">// filled rectangle</span>
  M <span class="number">0</span> <span class="number">0</span> h <span class="number">50</span> v <span class="number">50</span> h <span class="number">-50</span> Z
} <span class="keyword">else</span> {
  <span class="comment">// just a line</span>
  M <span class="number">0</span> <span class="number">0</span> L <span class="number">50</span> <span class="number">50</span>
}</code></pre>
        </section>

        <section id="functions">
          <h2>Functions</h2>
          <h3>Defining Functions</h3>
          <pre><code><span class="keyword">fn</span> <span class="function">square</span>(x, y, size) {
  M x y
  h size
  v size
  h <span class="function">calc</span>(-size)
  Z
}

<span class="comment">// Usage</span>
<span class="function">square</span>(<span class="number">10</span>, <span class="number">10</span>, <span class="number">30</span>)
<span class="function">square</span>(<span class="number">50</span>, <span class="number">50</span>, <span class="number">40</span>)</code></pre>
        </section>

        <section id="stdlib">
          <h2>Standard Library</h2>
          <h3>Math Functions</h3>
          <table>
            <thead>
              <tr>
                <th>Function</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>sin(x)</code></td><td>Sine of x (radians)</td></tr>
              <tr><td><code>cos(x)</code></td><td>Cosine of x (radians)</td></tr>
              <tr><td><code>tan(x)</code></td><td>Tangent of x</td></tr>
              <tr><td><code>sqrt(x)</code></td><td>Square root</td></tr>
              <tr><td><code>pow(x, y)</code></td><td>x raised to power y</td></tr>
              <tr><td><code>abs(x)</code></td><td>Absolute value</td></tr>
              <tr><td><code>min(a, b)</code></td><td>Minimum of two values</td></tr>
              <tr><td><code>max(a, b)</code></td><td>Maximum of two values</td></tr>
              <tr><td><code>lerp(a, b, t)</code></td><td>Linear interpolation</td></tr>
              <tr><td><code>clamp(x, min, max)</code></td><td>Clamp value to range</td></tr>
              <tr><td><code>deg(r)</code></td><td>Radians to degrees</td></tr>
              <tr><td><code>rad(d)</code></td><td>Degrees to radians</td></tr>
            </tbody>
          </table>

          <h3>Path Helper Functions</h3>
          <table>
            <thead>
              <tr>
                <th>Function</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><code>circle(cx, cy, r)</code></td><td>Circle path</td></tr>
              <tr><td><code>rect(x, y, w, h)</code></td><td>Rectangle path</td></tr>
              <tr><td><code>polygon(cx, cy, r, n)</code></td><td>Regular polygon</td></tr>
              <tr><td><code>star(cx, cy, r1, r2, n)</code></td><td>Star shape</td></tr>
              <tr><td><code>roundedRect(x, y, w, h, r)</code></td><td>Rounded rectangle</td></tr>
            </tbody>
          </table>

          <p>
            <a class="external-link" href="https://github.com/ryankuykendall/svg-path-extended" target="_blank">
              Full documentation on GitHub
            </a>
          </p>
        </section>
      </div>
    `;
  }
}

customElements.define('docs-view', DocsView);

export default DocsView;
