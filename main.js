
if (process.argv.length < 3) {
  console.log('wrong arguments, we need a folder to parse the dependency');
  process.exit(-1);
}

var SKIPPED_FOLDER_NAME = [
  'test',
  'build'
];
var fs = require('fs');
var forwardLink = {};

function processFile(file, name) {
  var content = fs.readFileSync(file, { 'encoding': 'utf-8' });
  var regex = /\/\*\s*global\s+([a-zA-Z,\s0-9\-]+)\*\//gim;
  console.log('file: ' + file);
  var matched = regex.exec(content);
  while (matched) {
    var fArray = forwardLink[name] || [];
    if (matched[1].indexOf(',') > -1) {
      var formaized = matched[1].replace(/\s+/gm, '').replace(', ', ',');
      if (formaized.substr(-1) === ',') {
        formaized = formaized.substr(0, formaized.length - 1);
      }
      fArray = fArray.concat(formaized.split(','));
    } else {
      fArray.push(matched[1]);
    }
    forwardLink[name] = fArray;
    matched = regex.exec(content);
  }
}

function processFiles(base, items) {
  items.forEach(function(file) {
    stat = fs.statSync(base + file);
    if (stat.isDirectory() && SKIPPED_FOLDER_NAME.indexOf(file) === -1) {
      processFiles(base + file + '/', fs.readdirSync(base + file + '/'));
    } else if (stat.isFile() && file.substr(-3) === '.js') {
      processFile(base + file, file);
    }
  });
}

function dumpGraph() {
  for (var key in forwardLink) {
    console.log(key + ': ' + forwardLink[key].join(','));
  }
}

if (process.argv[2].substr(-1) === '/') {
  processFiles(process.argv[2], fs.readdirSync(process.argv[2]));
} else {
  processFiles(process.argv[2] + '/', fs.readdirSync(process.argv[2]));
}

dumpGraph()
