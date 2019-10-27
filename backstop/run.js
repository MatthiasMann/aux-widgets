const backstop = require('backstopjs');
const start_http = require('./http_server.js').start;
const path = require('path');
const fs = require('fs');

function find_chromes()
{
    const locations = [
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/chrome-browser",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-beta",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome-unstable"
    ];

    const chromes = locations.filter((path) => fs.existsSync(path));

    if (!chromes.length)
        throw new Error('Could not find chrom(e|ium) executable to use.');

    return chromes;
}

const config = {
  "id": "backstop_default",
  "viewports": [
    {
      "label": "phone",
      "width": 320,
      "height": 480
    },
    {
      "label": "tablet",
      "width": 1024,
      "height": 768
    }
  ],
  "onBeforeScript": "puppet/onBefore.js",
  "onReadyScript": "puppet/onReady.js",
  "scenarios": [ ],
  "paths": {
    "bitmaps_reference": "backstop_data/bitmaps_reference",
    "bitmaps_test": "backstop_data/bitmaps_test",
    "engine_scripts": "backstop_data/engine_scripts",
    "html_report": "backstop_data/html_report",
    "ci_report": "backstop_data/ci_report"
  },
  "report": [],
  "engine": "puppeteer",
  "engineOptions": {
    "args": ["--no-sandbox"],
    executablePath: null,
  },
  "asyncCaptureLimit": 5,
  "asyncCompareLimit": 50,
  "debug": false,
  "debugWindow": false
};

const http_port = 1234;

function make_scenario(path)
{
  return {
    "label": path,
    "url": "http://localhost:" + http_port + "/tests/" + path,
    "referenceUrl": "",
    "readyEvent": "",
    "readySelector": "",
    "delay": 500,
    "hideSelectors": [],
    "removeSelectors": [],
    "hoverSelector": "",
    "clickSelector": "",
    "postInteractionWait": 0,
    "selectors": [],
    "selectorExpansion": true,
    "expect": 0,
    "misMatchThreshold" : 0.5,
    "requireSameDimensions": true
  };
}

start_http(http_port);

function readdir_recursive(p)
{
  const entries = fs.readdirSync(p);
  let ret = [];

  for (let i = 0; i < entries.length; i++)
  {
    const fname = path.join(p, entries[i]);
    ret.push(fname);

    try
    {
      ret = ret.concat(readdir_recursive(fname));
    }
    catch (err)
    {
    }
  }

  return ret;
}

const test_dir = path.join(__dirname, "tests");

const test_files = readdir_recursive(test_dir)
  .filter((fname) => fname.endsWith(".html"))
  .filter((fname) => !fname.includes("Clock")); // ignore clock for now

test_files.map((fname) => {
  return fname.substr(test_dir.length);
}).forEach((fname) => {
  config.scenarios.push(make_scenario(fname));
});

function run_backstop(executable, command)
{
  config.engineOptions.executablePath = executable;

  return backstop(command, {
      config: config
    });
}

async function run(command)
{
  const chromes = find_chromes();

  if (command === 'test')
  {
    for (let i = 0; i < chromes.length; i++)
    {
      await run_backstop(chromes[i], command);
    }
  }
  else if (command === 'approve')
  {
    await run_backstop(chromes[0], command);
  }
  else
  {
    throw new Error("Unknown command " + command);
  }
}

run(process.argv[2] || 'test')
  .then(
    function() { process.exit(0); },
    function(e) { console.error(e); process.exit(1); }
  );
