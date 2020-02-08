const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on('error', (err) => { console.log(err); });

/* AUX FUNCTIONS */

const checkData = function (dom) {
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

console.log('Downloading and parsing data from URL');

JSDOM.fromURL('https://www.rally-maps.com/Rally-de-Portugal-2019/Vieira-do-Minho', {
  includeNodeLocations: true,
  resources: 'usable',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole
}).then(dom => checkData(dom))
  .then(data => {
    console.log(data);
  }).catch(err => {
    console.log(err);
  });
