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

data.a.results.forEach(({test, subtests}) => {
  const parsedTest = {};

  subtests.forEach(({name, status}) => parsedTest[name] = [ status, 'no completion' ]);

  parsed[test] = parsedTest;
});

data.b.results.forEach(({test, subtests}) => {
  const parsedTest = parsed[test];

  subtests.forEach(({name, status, message}) => {
    const entry = parsedTest[name];

    entry[1] = status;

    if (status !== 'PASS' && message) {
      entry[2] = message;
    }
  });
});

console.log(JSON.stringify(parsed, null, 4));
