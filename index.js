const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", (err) => { console.log(err) });

console.log('Downloading and parsing data from URL');

JSDOM.fromURL('https://www.rally-maps.com/Rally-de-Portugal-2019/Vieira-do-Minho', {
    includeNodeLocations: true,
    resources: "usable",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole,
}).then(dom => {
    let check = setInterval(function(w) {
        if (typeof w.sl.leaflet !== 'undefined') {
            console.log(`Found ${w.sl.leaflet.data.storage.stages.length} tracks`)
            clearInterval(check);
        }
    }, 1000, dom.window);
}).catch(err => {
    console.log(err);
});
