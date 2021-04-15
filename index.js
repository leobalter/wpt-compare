const path = require('path');

const { argv } = require('yargs')
  .scriptName("wpt-compare")
  .usage('$0 <file-a> <file-b> [args]')
  .check((argv, options) => {
    const filePaths = argv._
    if (filePaths.length != 2) {
      throw new Error("Failure: needs 2 log files to compare")
    }

    return true;
  })
  .options({
    p: {
      alias: 'wpt-path',
      default: '.',
      describe: 'the path location of wpt',
      type: 'string',
    }
  })
  .help();

const files = {
  a: path.join('.', argv.wptPath, argv._[0]),
  b: path.join('.', argv.wptPath, argv._[1]),
};

const data = {
  a: require(files.a),
  b: require(files.b),
};

const parsed = {
  meta: {
    files,
    args: argv._,
    'wpt-path': argv.wptPath,
  }
};

data.a.results.reduce((reduced, {test, subtests}) => {
  const table = subtests.reduce((obj, {name, status}) => {
    obj[name] = [ status, 'wat' ];
    return obj;
  }, {});

  reduced[test] = table;
  return reduced;
}, parsed);

data.b.results.reduce((reduced, {test, subtests}) => {
  const table = subtests.reduce((obj, {name, status}) => {
    obj[name][1] = status;
    return obj;
  }, reduced[test]);

  return reduced;
}, parsed);

console.log(JSON.stringify(parsed, null, 4));
