const jsdom = require('jsdom');
const { JSDOM } = jsdom;

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
      if (typeof w.sl.leaflet !== 'undefined') {
        console.log(`Found ${w.sl.leaflet.data.storage.stages.length} tracks`);
        clearInterval(check);
        resolve(w.sl.leaflet);
      }

      if (count > 10) {
        clearInterval(check);
        reject(new Error('Timed out waiting for resources'));
      }
    }, 1000, dom.window);
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
  .then(data => {
    console.log(data);
  }).catch(err => {
    console.log(err);
  });
