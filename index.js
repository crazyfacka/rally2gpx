const fs = require('fs');
const jsdom = require('jsdom');
const inquirer = require('inquirer');
const { buildGPX, BaseBuilder } = require('gpx-builder');

const { JSDOM } = jsdom;
const { Point, Metadata, Person } = BaseBuilder.MODELS;

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on('error', (err) => { console.log(err); });

/* AUX FUNCTIONS */

const showHelp = function () {
  const path = require('path');
  console.log(`Usage: ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} URL`);
};

const checkForData = function (dom) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const check = setInterval(function (w) {
      count++;
      if (typeof w.sl !== 'undefined') {
        if (typeof w.sl.leaflet !== 'undefined') {
          console.log(`Found ${w.sl.leaflet.data.storage.stages.length} tracks`);
          clearInterval(check);
          resolve(w.sl.leaflet);
        }
      }

      if (count > 10) {
        clearInterval(check);
        reject(new Error('Timed out waiting for resources'));
      }
    }, 1000, dom.window);
  });
};

const stagePicker = function (d) {
  return new Promise((resolve, reject) => {
    const stages = d.data.storage.stages;
    const choices = [];

    for (let i = 0; i < stages.length; i++) {
      choices[i] = {
        value: i,
        name: stages[i].fullName,
        short: stages[i].fullName
      };
    }

    inquirer.prompt([
      {
        type: 'list',
        name: 'stage',
        message: 'What stage do you wish to generate the GPX',
        choices: choices,
        default: 0
      }
    ]).then(answers => resolve(stages[answers.stage]));
  });
};

const generateGPX = function (d) {
  const points = [];
  const gpxData = new BaseBuilder();

  let coordinates;

  for (let i = 0; i < d.geometries.length; i++) {
    if (d.geometries[i].type === 'SL') {
      coordinates = d.geometries[i].geometry.coordinates;
    }
  }

  for (let i = 0; i < coordinates.length; i++) {
    points.push(new Point(coordinates[i][1], coordinates[i][0]));
  }

  gpxData.setMetadata(new Metadata({
    name: d.name,
    desc: `WRC track extracted for stage ${d.fullName}`,
    author: new Person({
      name: 'crazyfacka'
    }),
    time: `${new Date()}`
  }));

  gpxData.setSegmentPoints(points);

  inquirer.prompt([
    {
      type: 'input',
      name: 'filename',
      message: 'Output GPX filename',
      default: `${d.name.toLowerCase().replace(/ /gi, '_')}.gpx`,
      filter: (input) => { return input.slice(-4) === '.gpx' ? input.toLowerCase().replace(/ /gi, '_') : `${input.toLowerCase().replace(/ /gi, '_')}.gpx`; }
    }
  ]).then(answers => {
    const dir = './data';

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    fs.writeFile(`data/${answers.filename}`, buildGPX(gpxData.toObject()), 'utf8', (err) => {
      if (err) {
        console.log(`Error writing GPX data to ${answers.filename}`);
        process.exit(1);
      }

      console.log(`${answers.filename} has been saved`);
    });
  });
};

/* THE MACHINE */

const args = process.argv.slice(2);
if (args.length !== 1) {
  showHelp();
  process.exit(1);
}

console.log(`Downloading and parsing data from '${args[0]}'`);

JSDOM.fromURL(args[0], {
  includeNodeLocations: true,
  resources: 'usable',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole
}).then(dom => checkForData(dom))
  .then(data => stagePicker(data))
  .then(stage => generateGPX(stage))
  .catch(err => {
    console.log(err);
  });
