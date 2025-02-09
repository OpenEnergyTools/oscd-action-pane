/* eslint-disable import/no-extraneous-dependencies */
import { visualRegressionPlugin } from '@web/test-runner-visual-regression/plugin';

import { playwrightLauncher } from '@web/test-runner-playwright';

import { polyfill } from '@web/dev-server-polyfill';

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const fuzzy = ['win32', 'darwin'].includes(process.platform); // allow for 1% difference on non-linux OSs
const local = !process.env.CI;

console.assert(local, 'Running in CI!');
console.assert(!fuzzy, 'Running on OS with 1% test pixel diff threshold!');

const thresholdPercentage = fuzzy && local ? 1 : 0;

const filteredLogs = [
  'Running in dev mode',
  'Lit is in dev mode',
  'mwc-list-item scheduled an update',
];

const browsers = [
     playwrightLauncher({ product: 'chromium' }),
   ];

function defaultGetImageDiff({ baselineImage, image, options }) {
  let error = '';
  let basePng = PNG.sync.read(baselineImage);
  let png = PNG.sync.read(image);
  let { width, height } = png;

  if (basePng.width !== png.width || basePng.height !== png.height) {
    error =
      `Screenshot is not the same width and height as the baseline. ` +
      `Baseline: { width: ${basePng.width}, height: ${basePng.height} }` +
      `Screenshot: { width: ${png.width}, height: ${png.height} }`;
    width = Math.max(basePng.width, png.width);
    height = Math.max(basePng.height, png.height);
    let oldPng = basePng;
    basePng = new PNG({ width, height });
    oldPng.data.copy(basePng.data, 0, 0, oldPng.data.length);
    oldPng = png;
    png = new PNG({ width, height });
    oldPng.data.copy(png.data, 0, 0, oldPng.data.length);
  }

  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(basePng.data, png.data, diff.data, width, height, options);
  const diffPercentage = (numDiffPixels / (width * height)) * 100;

  return {
    error,
    diffImage: PNG.sync.write(diff),
    diffPercentage,
  };
}

export default /** @type {import("@web/test-runner").TestRunnerConfig} */ ({
  plugins: [
    polyfill({
          scopedCustomElementRegistry: true,
        }),
    visualRegressionPlugin({
      update: process.argv.includes('--update-visual-baseline'),
      getImageDiff: (options) => {
        const result =  defaultGetImageDiff(options);
        if (result.diffPercentage < thresholdPercentage)
          result.diffPercentage = 0;
        return result;
      }
    }),
  ],

  groups: [
    {
      name: 'visual',
      files: 'dist/**/*.test.js',
      testRunnerHtml: testFramework => `
          <html>
            <head>
              <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300&family=Roboto:wght@300;400;500&display=swap">
              <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined">
            </head>
            <body>
              <style class="deanimator">
              *, *::before, *::after {
              -moz-transition: none !important;
              transition: none !important;
              -moz-animation: none !important;
              animation: none !important;
              }
              </style>
              <script>window.process = { env: ${JSON.stringify(process.env)} }</script>
              <script type="module" src="${testFramework}"></script>
              <script>
              function descendants(parent) {
                return (Array.from(parent.childNodes)).concat(
                  ...Array.from(parent.children).map(child => descendants(child))
                );
              }
              const deanimator = document.querySelector('.deanimator');
              function deanimate(element) {
                if (!element.shadowRoot) return;
                if (element.shadowRoot.querySelector('.deanimator')) return;
                const style = deanimator.cloneNode(true);
                element.shadowRoot.appendChild(style);
                descendants(element.shadowRoot).forEach(deanimate);
              }
              const observer = new MutationObserver((mutationList, observer) => {
                for (const mutation of mutationList) {
                  if (mutation.type === 'childList') {
                    descendants(document.body).forEach(deanimate);
                  }
                }
              });
              observer.observe(document.body, {childList: true, subtree:true});
              </script>
              <style>
              * {
                margin: 0px;
                padding: 0px;
              }

              body {
                  --oscd-action-pane-theme-on-surface: #657b83;
                  --oscd-action-pane-theme-surface: #fdf6e3;
                  --oscd-action-pane-theme-primary: #2aa198;
                  --oscd-action-pane-theme-on-primary: #eee8d5;
                  --oscd-action-pane-theme-secondary: #6c71c4;
                  --oscd-action-pane-theme-font: 'Roboto', sans-serif;
                  background: white;
                }
              </style>
            </body>
          </html>`,
    }
  ],

  /** Resolve bare module imports */
  nodeResolve: {
    exportConditions: ['browser', 'development'],
  },

  /** Filter out lit dev mode logs */
  filterBrowserLogs(log) {
    for (const arg of log.args) {
      if (typeof arg === 'string' && filteredLogs.some(l => arg.includes(l))) {
        return false;
      }
    }
    return true;
  },

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto',

  /** Amount of browsers to run concurrently */
  concurrentBrowsers: 3,

  /** Amount of test files per browser to test concurrently */
  concurrency: 2,

  /** Browsers to run tests on */
  browsers,

  // See documentation for all available options
});
