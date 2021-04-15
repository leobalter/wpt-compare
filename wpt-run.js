const path = require('path');
const {execSync: run} = require('child_process');

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
      describe: 'the log file to be saved',
      type: 'string',
    },
    b: {
      alias: 'browsers',
      default: 'chrome',
      describe: 'browsers to run tests',
      type: 'array'
    }
  })
  .help();

const browsers = argv.browsers;

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

const logs = [];

var today = new Date();
var date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

run('mkdir -p logs');

for (browser of browsers) {
  console.log(`/------- ${browser} -------/`);
  const log = `log-${browser}-${date}.json`;
  const absolute = path.resolve('logs', log);

  logs.push(log);

  const cmd = `./wpt run --headless --log-wptreport ${absolute} ${browser} ${files}`;

  run(
    cmd,
    {
      stdio: 'inherit',
      cwd: argv.wptPath,
    }
  );

  console.log('\n');
}

console.log(`New logs:\n - ${logs.join('\n')}`);
