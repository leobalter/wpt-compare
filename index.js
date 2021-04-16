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
  .help();

const files = {
  a: path.resolve(argv._[0]),
  b: path.resolve(argv._[1]),
};

const data = {
  a: require(files.a),
  b: require(files.b),
};

const parsed = {
  meta: {
    files,
    args: argv._,
  }
};

data.a.results.reduce((reduced, {test, subtests}) => {
  const table = subtests.reduce((obj, {name, status}) => {
    obj[name] = [ status, 'no completion' ];
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
