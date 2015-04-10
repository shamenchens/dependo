'use strict';

var fs = require('fs');
var sha1 = require('sha-1');

var SystemModuleParser = function SystemModuleParser(targetPath) {
  if (targetPath.substr(-1) !== '/') {
    targetPath = targetPath + '/';
  }
  this.targetPath = targetPath;
  this.processFiles(targetPath, fs.readdirSync(targetPath));
  this.generateGraphData();
}

SystemModuleParser.prototype = {
  SKIPPED_FOLDER_NAME: [
    'test',
    'build'
  ],

  nodes: [],
  links: [],
  linkMap: {},
  exposes: {},
  graphData: null,
  targetPath: null,

  parseDependsOn: function smp_parseDependsOn(data, content) {
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
  },

  matchExposeRegex: function smp_matchExposeRegex(regex, data, content) {
    var matched = regex.exec(content);
    while (matched) {
      var matchedContent = matched[1].trim();
      var firstChar = matchedContent.charAt(0);
      if (data.expose.indexOf(matchedContent) === -1 &&
        firstChar === firstChar.toUpperCase()) {
        data.expose.push(matchedContent);
      }
      if (!this.exposes[matchedContent] &&
          firstChar === firstChar.toUpperCase()) {

        this.exposes[matchedContent] = {
          id: (Object.keys(this.exposes).length),
          module: matchedContent
        };
      }
      matched = regex.exec(content);
    }
  },

  parseExpose: function smp_parseExpose(data, content) {
    var windowExposeRegex =
        /^\s*(?:exports|window)\.([a-zA-Z$_0-9]+)\s=.+$/gim;
    var winExpose2Regex =
        /^.+\s=\s(?:exports|window)\.([a-zA-Z$_0-9]+)\s=.+$/gim;
    var winExpose3Regex =
        /^.+\((?:exports|window)\.([a-zA-Z$_0-9]+)\s=.+\).+$/gim;
    var funcExposeRegex =
        /^function\s([a-zA-Z$_0-9]+)\([^\)]*\)\s+{$/gim;
    var varExposeRegex =
        /^var\s([a-zA-Z$_0-9]+)\s=\s(?:\{|\(?function.+)$/gim;
    this.matchExposeRegex(windowExposeRegex, data, content);
    this.matchExposeRegex(winExpose2Regex, data, content);
    this.matchExposeRegex(winExpose3Regex, data, content);
    this.matchExposeRegex(funcExposeRegex, data, content);
    this.matchExposeRegex(varExposeRegex, data, content);
  },

  processFile: function smp_processFile(file, name) {
    // console.log('file: ' + file);
    var content = fs.readFileSync(file, { 'encoding': 'utf-8' });
    if (!this.linkMap[name]) {
      this.linkMap[name] = { 'file': name, 'expose': [], 'depends': [] };
    }
    this.parseDependsOn(this.linkMap[name], content);
    this.parseExpose(this.linkMap[name], content);
  },

  processFiles: function smp_processFiles(base, items) {
    items.forEach(function(file) {
      var stat = fs.statSync(base + file);
      if (stat.isDirectory() && this.SKIPPED_FOLDER_NAME.indexOf(file) === -1) {
        this.processFiles(base + file + '/', fs.readdirSync(base + file + '/'));
      } else if (stat.isFile() && file.substr(-3) === '.js') {
        this.processFile(base + file, file);
      }
    }, this);
  },

  generateNodes: function smp_createNodes() {
    Object.keys(this.exposes).forEach(function(exposeName) {
      this.nodes[this.exposes[exposeName].id] = {id: exposeName};
    }, this);
  },

  generateLinks: function smp_createLinks() {
    for (var filename in this.linkMap) {
      this.linkMap[filename].expose.forEach(function(exposeName) {
        this.linkMap[filename].depends.forEach(function(dependName) {
          // Treat dependency start with lower case as the same as upper case
          dependName = dependName.trim();
          dependName = dependName.charAt(0).toUpperCase() + dependName.slice(1);

          if (this.exposes[dependName]) {
            this.links.push({
              source: this.exposes[exposeName].id,
              target: this.exposes[dependName].id
            });
          } else {
            // console.log('warning! "' + dependName + '" does not exist');
          }
        }, this);
      }, this);
    }
  },

  generateGraphData: function smp_generateDependency() {
    this.generateLinks();
    this.generateNodes();

    this.graphData = {
      directed: true,
      multigraph: false,
      graph: [],
      nodes: this.nodes,
      links: this.links
    };
  },

  generateHtml: function smp_generateHtml() {
    var id = sha1(this.targetPath + JSON.stringify(this.graphData)) ||
                  ~~(Math.random()*999999999);
    return require('./html').outputSystemGraph(this.graphData, id);
  }
};

module.exports = SystemModuleParser;
