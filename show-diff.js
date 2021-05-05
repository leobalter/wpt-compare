const path = require('path');

const { argv } = require('yargs')
  .scriptName("show-diff")
  .usage('$0 <diff-file>')
  .check((argv, options) => {
    const filePaths = argv._
    if (filePaths.length != 1) {
      throw new Error("Failure: needs 1 log diff file")
    }

    return true;
  })
  .help();

const file = path.resolve(argv._[0]);

const data = require(file);

const { meta } = data;

delete data.meta;

const dirnames = [];

Object.entries(data).forEach(([name, result]) => {
  const dirname = path.dirname(name);
  const diff = [];

//   if (!dirnames.includes(dirname)) {
//     dirnames.push(dirname);
//     console.log(`
// --------- ${dirname} ---------
//     `);
//   }
  Object.entries(result).forEach(([assertion, [ a, b, c = '' ]]) => {
    if (a !== 'PASS' || a !== b) {
      diff.push({assertion, a, b, c});
    }
  });

  if (diff.length) {
    console.log(name);
    console.log(diff);
  }
});
