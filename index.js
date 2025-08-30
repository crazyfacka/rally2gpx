const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const inquirer = require('inquirer').default;
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
        type: 'checkbox',
        name: 'stage',
        message: 'What stage do you wish to generate the GPX',
        choices: stages,
        default: -1
      }
    ]).then(answers => resolve({ stages: stages, selected: answers.stage }));
  });
};

const generateGPX = function (selection) {
  const stages = selection.stages.filter((value, index, vals) => selection.selected.includes(value.value));

  function processNextStage () {
    if (stages.length === 0) {
      return Promise.resolve();
    }
    const stage = stages.shift();
    const gpxData = new BaseBuilder().setMetadata(new Metadata({
      name: stage.short ? stage.short : stage.name,
      desc: `WRC track extracted for stage ${stage.name}`,
      author: new Person({
        name: 'crazyfacka'
      })
    }));
    if (stage.coordinates.length === 1) {
      gpxData.setWayPoints([new Point(stage.coordinates[0][1], stage.coordinates[0][0])]); // Polygons
    } else {
      const points = [];

      for (let i = 0; i < stage.coordinates.length; i++) {
        points.push(new Point(stage.coordinates[i][1], stage.coordinates[i][0]));
      }
      gpxData.setSegmentPoints(points);
    }

    return inquirer.prompt([
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

      fs.writeFileSync(`data/${answers.filename}`, buildGPX(gpxData.toObject()), 'utf8', (err) => {
        if (err) {
          console.log(`Error writing GPX data to ${answers.filename}`);
          process.exit(1);
        }

        console.log(`${answers.filename} has been saved`);
      });
    })
      .then(() => processNextStage())
      .catch((err) => {
        console.error('An error occurred:', err);
        process.exit(1);
      });
  }

  processNextStage();
};

/* THE MACHINE */

async function scrapePage (url) {
  const puppeteerArgs = process.env.PUPPETEER_ARGS 
    ? process.env.PUPPETEER_ARGS.split(',') 
    : [];

  const browser = await puppeteer.launch({
    headless: 'new',
    ...(puppeteerArgs.length > 0 && { args: puppeteerArgs })
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 1080, height: 1024 });
  await page.goto(url);

  // cc.acceptCategory('all');

  try {
    await page.waitForSelector('.fc-cta-consent', { timeout: 5000 });
    await page.click('.fc-cta-consent');
  } catch (e) { }

  await page.waitForSelector('.cm__body');
  await page.click('.cm__btn >>> ::-p-text(Accept All)');

  await page.waitForSelector('.leaflet-control-container');
  await page.waitForNetworkIdle();
  await page.waitForFunction('window?.sl?.leaflet?.data?.storage?.stages');

  const stages = await page.evaluate(() => {
    function getPolygonCentroid (coords) {
      let area = 0;
      let x = 0;
      let y = 0;

      const points = coords.map(p => ({ x: p[0], y: p[1] }));
      const len = points.length;

      for (let i = 0; i < len - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const a = p1.x * p2.y - p2.x * p1.y;
        area += a;
        x += (p1.x + p2.x) * a;
        y += (p1.y + p2.y) * a;
      }

      area /= 2;
      x /= (6 * area);
      y /= (6 * area);

      return [x, y];
    }

    function flattenStages () {
      const simpleStages = [];
      for (let i = 0; i < sl.leaflet.data.storage.stages.length; i++) {
        const curStage = sl.leaflet.data.storage.stages[i];
        const stage = {
          value: i,
          name: curStage.fullName,
          short: curStage.name,
          coordinates: []
        };

        for (let j = 0; j < curStage.geometries.length; j++) {
          if (curStage.geometries[j].type === 'PG') { // Polygons
            stage.coordinates = [getPolygonCentroid(curStage.geometries[j].geometry.coordinates[0])];
            simpleStages[i] = stage;
          } else if (curStage.geometries[j].type === 'SL' || curStage.geometries[j].type === 'PL') {
            stage.coordinates = curStage.geometries[j].geometry.coordinates;
          }
        }

        simpleStages[i] = stage;
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
