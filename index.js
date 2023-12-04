const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const inquirer = require('inquirer');
const { buildGPX, BaseBuilder } = require('gpx-builder');
const { Point, Metadata, Person } = BaseBuilder.MODELS;

puppeteer.use(require('puppeteer-extra-plugin-stealth')());

/* AUX FUNCTIONS */

const showHelp = function () {
  const path = require('path');
  console.log(`Usage: ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} URL`);
};

const stagePicker = function (stages) {
  return new Promise((resolve, reject) => {
    inquirer.prompt([
      {
        type: 'list',
        name: 'stage',
        message: 'What stage do you wish to generate the GPX',
        choices: stages,
        default: 0
      }
    ]).then(answers => resolve(stages[answers.stage]));
  });
};

const generateGPX = function (stage) {
  const points = [];
  const gpxData = new BaseBuilder();

  for (let i = 0; i < stage.coordinates.length; i++) {
    points.push(new Point(stage.coordinates[i][1], stage.coordinates[i][0]));
  }

  gpxData.setMetadata(new Metadata({
    name: stage.short,
    desc: `WRC track extracted for stage ${stage.name}`,
    author: new Person({
      name: 'crazyfacka'
    })
  }));

  gpxData.setSegmentPoints(points);

  inquirer.prompt([
    {
      type: 'input',
      name: 'filename',
      message: 'Output GPX filename',
      default: `${stage.short.toLowerCase().replace(/ /gi, '_')}.gpx`,
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

async function scrapePage (url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setViewport({ width: 1080, height: 1024 });
  await page.goto(url);

  // cc.acceptCategory('all');

  await page.waitForSelector('.cm__body');
  await page.click('.cm__btn >>> ::-p-text(Accept All)');

  await page.waitForSelector('.leaflet-control-container');
  await page.waitForNetworkIdle();
  await page.waitForFunction('window?.sl?.leaflet?.data?.storage?.stages');

  const stages = await page.evaluate(() => {
    function flattenStages () {
      const simpleStages = [];
      for (let i = 0; i < sl.leaflet.data.storage.stages.length; i++) {
        const curStage = sl.leaflet.data.storage.stages[i];
        let coordinates;
        for (let j = 0; j < curStage.geometries.length; j++) {
          if (curStage.geometries[j].type === 'SL') {
            coordinates = curStage.geometries[j].geometry.coordinates;
          }
        }
        simpleStages[i] = {
          value: i,
          name: curStage.fullName,
          short: curStage.name,
          coordinates: coordinates
        };
      }
      return simpleStages;
    }
    return flattenStages();
  });

  await browser.close();

  return stages;
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  showHelp();
  process.exit(1);
}

console.log(`Downloading and parsing data from '${args[0]}'`);

scrapePage(args[0])
  .then(stages => stagePicker(stages))
  .then(stage => generateGPX(stage))
  .catch(err => {
    console.log(err);
  });
