
if (process.argv.length < 3) {
  console.log('wrong arguments, we need a folder to parse the dependency');
  process.exit(-1);
}

var SKIPPED_FOLDER_NAME = [
  'test',
  'build'
];
var fs = require('fs');
var linkMap = {};

function parseDependsOn(data, content) {
  var regex = /\/\*\s*global\s+([a-zA-Z,\s0-9\-]+)\*\//gim;
  var matched = regex.exec(content);
  while (matched) {
    if (matched[1].indexOf(',') > -1) {
      var formaized = matched[1].replace(/\s+/gm, '').replace(', ', ',');
      if (formaized.substr(-1) === ',') {
        formaized = formaized.substr(0, formaized.length - 1);
      }
      data.depends = data.depends.concat(formaized.split(','));
    } else {
      data.depends.push(matched[1]);
    }
    matched = regex.exec(content);
  }
}

function matchExposeRegex(regex, data, content) {
  var matched = regex.exec(content);
  while (matched) {
    if (data.expose.indexOf(matched[1]) === -1) {
      data.expose.push(matched[1])
    }
    matched = regex.exec(content);
  }
}

function parseExpose(data, content) {
  var windowExposeRegex = /^\s*(?:exports|window)\.([a-zA-Z$_0-9]+)\s=.+$/gim;
  var winExpose2Regex = /^.+\s=\s(?:exports|window)\.([a-zA-Z$_0-9]+)\s=.+$/gim;
  var winExpose3Regex =
      /^.+\((?:exports|window)\.([a-zA-Z$_0-9]+)\s=.+\).+$/gim;
  var funcExposeRegex = /^function\s([a-zA-Z$_0-9]+)\([^\)]*\)\s+{$/gim;
  var varExposeRegex = /^var\s([a-zA-Z$_0-9]+)\s=\s(?:\{|\(?function.+)$/gim;
  matchExposeRegex(windowExposeRegex, data, content);
  matchExposeRegex(winExpose2Regex, data, content);
  matchExposeRegex(winExpose3Regex, data, content);
  matchExposeRegex(funcExposeRegex, data, content);
  matchExposeRegex(varExposeRegex, data, content);
}

function processFile(file, name) {
  console.log('file: ' + file);
  var content = fs.readFileSync(file, { 'encoding': 'utf-8' });
  if (!linkMap[name]) {
    linkMap[name] = { 'file': name, 'expose': [], 'depends': [] };
  }
  parseDependsOn(linkMap[name], content);
  parseExpose(linkMap[name], content);
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
  // TODO....
}

if (process.argv[2].substr(-1) === '/') {
  processFiles(process.argv[2], fs.readdirSync(process.argv[2]));
} else {
  processFiles(process.argv[2] + '/', fs.readdirSync(process.argv[2]));
}

dumpGraph()
