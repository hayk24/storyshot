#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

import { asyncTimer } from './utils/async-timer';
import { main } from './main';


const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

async function cli() {
  const args = hideBin(process.argv);
  const setting = yargs(args)
    .usage('Usage: $0 --url <storybook-url>')
    .example('$0 --url http://localhost:6006', 'Capture screenshots from local storybook')
    .option('url', {
      alias: 'u',
      type: 'string',
      description: 'Storybook URL to capture screenshots',
      demandOption: true
    })
    .version('version', 'Current version', pkgJson.version)
    .alias('version', 'v')
    .help('help')
    .alias('help', 'h')
    .epilog('For more information visit: https://github.com/geonhyeoklee/storyshot')
    .locale('en');

  const argv = await setting.argv;
  const storybookUrl = argv.url;

  try {
    const asyncJob = main({ storybookUrl });
    const [numberOfCaptured, duration] = await asyncTimer(asyncJob);
    console.debug(
      `Screenshot was ended successfully in ${
        duration + ' ms'
      } saving ${numberOfCaptured} PNGs.`
    );
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

cli();
