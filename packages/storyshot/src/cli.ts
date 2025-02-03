import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { asyncTimer } from './utils/async-timer';
import { main } from './main';


async function cli() {
  const args = hideBin(process.argv);
  const setting = yargs(args)
    .locale('en')
  
  const argv = await setting.argv;
  const storybookUrl = `${argv._[0]}`;

  try {
    const asyncJob = main({ storybookUrl });
    const [numberOfCaptured, duration] = await asyncTimer(asyncJob);
    console.debug(`Screenshot was ended successfully in ${duration + ' ms'} saving ${numberOfCaptured} PNGs.`);    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

cli();
