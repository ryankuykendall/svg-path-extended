import { compile, compileAnnotated } from './index';
import type { CompileResult } from './index';
import { readFileSync, writeFileSync } from 'fs';

interface CliOptions {
  svgOutput?: string;
  viewBox?: string;
  width?: string;
  height?: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: string;
  annotated?: boolean;
  toFixed?: number;
}

function printUsage() {
  console.log(`
svg-path-extended - Extended SVG path syntax compiler

Usage:
  svg-path-extended <file>       Compile a file
  svg-path-extended -            Read from stdin
  svg-path-extended -e <code>    Compile inline code
  svg-path-extended --src=<file> Compile a file (explicit flag)

Options:
  -h, --help                     Show this help message
  -v, --version                  Show version
  --src=<file>                   Input source file
  -o, --output <file>            Write path output to file
  --output-svg-file=<file>       Output as complete SVG file
  --annotated                    Output annotated/debug format with comments
  --viewBox=<box>                SVG viewBox (default: "0 0 200 200")
  --width=<w>                    SVG width (default: "200")
  --height=<h>                   SVG height (default: "200")
  --stroke=<color>               Path stroke color (default: "#000")
  --fill=<color>                 Path fill color (default: "none")
  --stroke-width=<w>             Path stroke width (default: "2")
  --to-fixed=<N>                 Round decimals to N digits (0-20)

Examples:
  svg-path-extended input.svgx
  svg-path-extended --src=input.svgx --output-svg-file=./output.svg
  echo 'let x = 10; M x 0' | svg-path-extended -
  svg-path-extended -e 'M 0 0 L calc(10 + 5) 20'
  svg-path-extended -e 'circle(100, 100, 50)' --output-svg-file=./circle.svg
`);
}

function generateSvg(result: CompileResult, options: CliOptions): string {
  const viewBox = options.viewBox || '0 0 200 200';
  const width = options.width || '200';
  const height = options.height || '200';
  const defaultStroke = options.stroke || '#000';
  const defaultFill = options.fill || 'none';
  const defaultStrokeWidth = options.strokeWidth || '2';

  const paths = result.layers.map((layer) => {
    const stroke = layer.styles['stroke'] || defaultStroke;
    const fill = layer.styles['fill'] || defaultFill;
    const strokeWidth = layer.styles['stroke-width'] || defaultStrokeWidth;
    // Build additional style attributes from layer styles (excluding the ones we handle explicitly)
    const handled = new Set(['stroke', 'fill', 'stroke-width']);
    const extraAttrs = Object.entries(layer.styles)
      .filter(([key]) => !handled.has(key))
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    const extra = extraAttrs ? ' ' + extraAttrs : '';
    return `  <path d="${layer.data}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${extra}/>`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#f5f5f5"/>
${paths}
</svg>`;
}

function parseArgs(args: string[]): { source: string; options: CliOptions; outputFile?: string } {
  const options: CliOptions = {};
  let source: string | null = null;
  let outputFile: string | undefined;
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    }

    if (arg === '-v' || arg === '--version') {
      console.log('0.1.0');
      process.exit(0);
    }

    if (arg === '-e') {
      if (!args[i + 1]) {
        console.error('Error: -e requires an argument');
        process.exit(1);
      }
      source = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '-o' || arg === '--output') {
      outputFile = args[i + 1];
      i += 2;
      continue;
    }

    if (arg.startsWith('--src=')) {
      const srcFile = arg.split('=')[1];
      try {
        source = readFileSync(srcFile, 'utf-8');
      } catch (err) {
        console.error(`Error: Could not read file '${srcFile}'`);
        process.exit(1);
      }
      i++;
      continue;
    }

    if (arg.startsWith('--output-svg-file=')) {
      options.svgOutput = arg.split('=')[1];
      i++;
      continue;
    }

    if (arg.startsWith('--viewBox=')) {
      options.viewBox = arg.split('=')[1];
      i++;
      continue;
    }

    if (arg.startsWith('--width=')) {
      options.width = arg.split('=')[1];
      i++;
      continue;
    }

    if (arg.startsWith('--height=')) {
      options.height = arg.split('=')[1];
      i++;
      continue;
    }

    if (arg.startsWith('--stroke=')) {
      options.stroke = arg.split('=')[1];
      i++;
      continue;
    }

    if (arg.startsWith('--fill=')) {
      options.fill = arg.split('=')[1];
      i++;
      continue;
    }

    if (arg.startsWith('--stroke-width=')) {
      options.strokeWidth = arg.split('=')[1];
      i++;
      continue;
    }

    if (arg === '--annotated') {
      options.annotated = true;
      i++;
      continue;
    }

    if (arg.startsWith('--to-fixed=')) {
      const val = arg.split('=')[1];
      const n = parseInt(val, 10);
      if (isNaN(n) || n < 0 || n > 20) {
        console.error('Error: --to-fixed must be an integer between 0 and 20');
        process.exit(1);
      }
      options.toFixed = n;
      i++;
      continue;
    }

    // If not a flag, treat as input file or stdin
    if (arg === '-') {
      source = readFileSync(0, 'utf-8');
    } else if (!arg.startsWith('-')) {
      try {
        source = readFileSync(arg, 'utf-8');
      } catch (err) {
        console.error(`Error: Could not read file '${arg}'`);
        process.exit(1);
      }
    }
    i++;
  }

  if (source === null) {
    printUsage();
    process.exit(1);
  }

  return { source, options, outputFile };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const { source, options, outputFile } = parseArgs(args);

  try {
    // Annotated output mode
    if (options.annotated) {
      const annotatedOutput = compileAnnotated(source);

      if (outputFile) {
        writeFileSync(outputFile, annotatedOutput);
        console.log(`Annotated output written to: ${outputFile}`);
        return;
      }

      console.log(annotatedOutput);
      return;
    }

    const compileOptions = options.toFixed != null ? { toFixed: options.toFixed } : undefined;
    const result = compile(source, compileOptions);
    const defaultPath = result.layers[0]?.data ?? '';

    // Output as SVG file
    if (options.svgOutput) {
      const svg = generateSvg(result, options);
      writeFileSync(options.svgOutput, svg);
      console.log(`SVG written to: ${options.svgOutput}`);
      console.log(`Path data: ${defaultPath}`);
      return;
    }

    // Output path to file
    if (outputFile) {
      if (result.layers.length > 1) {
        const output = result.layers.map(l => `[${l.name}] ${l.data}`).join('\n');
        writeFileSync(outputFile, output);
      } else {
        writeFileSync(outputFile, defaultPath);
      }
      console.log(`Path written to: ${outputFile}`);
      return;
    }

    // Output to stdout
    if (result.layers.length > 1) {
      for (const layer of result.layers) {
        console.log(`[${layer.name}] ${layer.data}`);
      }
    } else {
      console.log(defaultPath);
    }
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
