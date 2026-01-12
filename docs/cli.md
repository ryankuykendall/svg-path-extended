# CLI Reference

The svg-path-extended CLI compiles extended SVG path syntax into standard SVG path strings or complete SVG files.

## Installation

```bash
npm install -g svg-path-extended
```

Or use with npx:

```bash
npx svg-path-extended [options]
```

## Basic Usage

### Compile a File

```bash
svg-path-extended input.svgx
```

Or with the explicit flag:

```bash
svg-path-extended --src=input.svgx
```

### Compile Inline Code

```bash
svg-path-extended -e 'circle(100, 100, 50)'
```

### Read from Stdin

```bash
echo 'let x = 50; circle(x, x, 25)' | svg-path-extended -
```

```bash
cat myfile.svgx | svg-path-extended -
```

## Output Options

### Output Path Data to File

```bash
svg-path-extended --src=input.svgx -o output.txt
svg-path-extended --src=input.svgx --output output.txt
```

### Output as Complete SVG File

Generate a complete SVG file with the path embedded:

```bash
svg-path-extended --src=input.svgx --output-svg-file=output.svg
```

This creates a ready-to-use SVG file that can be opened in any browser or image viewer.

## SVG Styling Options

When using `--output-svg-file`, you can customize the appearance:

| Option | Default | Description |
|--------|---------|-------------|
| `--stroke=<color>` | `#000` | Stroke color |
| `--fill=<color>` | `none` | Fill color |
| `--stroke-width=<n>` | `2` | Stroke width |
| `--viewBox=<box>` | `0 0 200 200` | SVG viewBox |
| `--width=<w>` | `200` | SVG width |
| `--height=<h>` | `200` | SVG height |

### Examples

Red circle with no fill:

```bash
svg-path-extended -e 'circle(100, 100, 50)' \
  --output-svg-file=circle.svg \
  --stroke=red \
  --stroke-width=3
```

Blue filled polygon:

```bash
svg-path-extended -e 'polygon(100, 100, 80, 6)' \
  --output-svg-file=hexagon.svg \
  --stroke=navy \
  --fill=lightblue \
  --stroke-width=2
```

Large canvas with custom viewBox:

```bash
svg-path-extended --src=complex.svgx \
  --output-svg-file=output.svg \
  --viewBox="0 0 800 600" \
  --width=800 \
  --height=600
```

## Help and Version

```bash
svg-path-extended --help
svg-path-extended -h

svg-path-extended --version
svg-path-extended -v
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (parse error, file not found, etc.) |

## File Extensions

By convention, source files use the `.svgx` extension, but any text file will work.

## Examples

### Generate a Spiral

```bash
svg-path-extended -e '
M 100 100
for (i in 1..50) {
  L calc(100 + cos(i * 0.3) * i * 1.5) calc(100 + sin(i * 0.3) * i * 1.5)
}
' --output-svg-file=spiral.svg --stroke=teal --stroke-width=2
```

### Process Multiple Files

```bash
for file in examples/*.svgx; do
  svg-path-extended --src="$file" --output-svg-file="${file%.svgx}.svg"
done
```

### Use in a Build Script

```json
{
  "scripts": {
    "build:icons": "svg-path-extended --src=src/icons.svgx --output-svg-file=dist/icons.svg"
  }
}
```
