const path = require('path');
const {execSync: run} = require('child_process');
const fs = require('fs');

const today = new Date();
const date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

const { argv } = require('yargs')
  .scriptName("wpt-run")
  .usage('$0 [args] [...files]')
  .options({
    p: {
      alias: 'wpt-path',
      default: '../wpt',
      describe: 'the path location of wpt',
      type: 'string',
    },
    l: {
      alias: 'log',
      default: `log-${date}.json`,
      describe: 'the log file to be saved in the logs folder',
      type: 'string',
    },
    b: {
      alias: 'browser',
      default: 'chrome',
      describe: 'browser to run tests',
      type: 'string'
    },
    i: {
      alias: 'include',
      describe: 'file to include to wpt',
      type: 'string'
    }
  })
  .help();

const defaultFiles = [
  'content-security-policy/nonce-hiding',
  'css/css-shadow-parts/support',
  'css/selectors/invalidation',
  'custom-elements',
  'custom-state-pseudo-class',
  'dom/events',
  'dom/nodes',
  'event-timing',
  'html/rendering/non-replaced-elements/the-fieldset-and-legend-elements',
  'html/semantics/forms/the-fieldset-element/accessibility',
  'html/semantics/scripting-1/the-script-element/module',
  'html/webappapis/dynamic-markup-insertion/opening-the-input-stream',
  'interfaces',
  'pointerevents',
  'shadow-dom',
  'trusted-types',
];

const files = argv._.join(' ') || defaultFiles.join('\\\n  ');
const { log, include, browser } = argv; 

const options = {
  '--log-wptreport': path.resolve('logs', log),
  '--headless': undefined,
};
const optionsStr = Object.entries(options).flat().join(' ');

// It would be beautiful if this could just work. I have no idea how wpt can actually include something
// let include = '';
//
// if (argv.include) {
//   include = `--include=${argv.include}`;
// }
//
// if (argv.include) {
//   options['--include'] = path.resolve(argv.include);
// }

// save a quick backup
const harnessFile = path.resolve(argv.wptPath, 'resources', 'testharness.js');
run(`cp ${harnessFile} temp/`);

let includeData = '';
if (include) {
  includeData = fs.readFileSync(include);
}

console.log(`/-------> ${browser} ${include || ''}`);
const cmd = `./wpt run ${optionsStr} ${browser} ${files}`;

if (include) {
  fs.appendFileSync(harnessFile, includeData);
}

console.log(cmd);
console.log('...');

try {
  run(
    cmd,
    {
      stdio: 'inherit',
      cwd: argv.wptPath,
    }
  );
} catch(e) {
  console.log('failures detected! meep!');
}

// Restore harness
if (include) {
  run(`cp temp/${path.basename(harnessFile)} ${harnessFile}`);
  console.log('harness restored');
}

console.log(`\nNew log saved at: ${log}`);
