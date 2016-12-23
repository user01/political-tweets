const Twitter = require('twitter');
const chalk = require('chalk');
const fs = require('fs');
const moment = require('moment');
const env = require('dotenv').config();

const twitterHandles = JSON.parse(fs.readFileSync('twitter.handles.json').toString());

const client = new Twitter({
  consumer_key: env.consumer_key,
  consumer_secret: env.consumer_secret,
  access_token_key: env.access_token_key,
  access_token_secret: env.access_token_secret
});


client.post('users/lookup', {
  screen_name: twitterHandles.join(','),
  user_id: ''
}, (error, response) => {
  if (error) {
    console.log(`Collecting user ids [${chalk.red('failed')}]`);
    process.exit();
  }
  // console.log(response);
  console.log(response.map(x => x.id));
  setTimeout(() => {
    followIds(response.map(x => x.id));
  }, 2000);
});

const streamParameters = {
  follow: twitterHandles
}

const followIds = (ids) => {

  client.stream('statuses/filter', {
    follow: ids.join(','),
    track: ''
  }, (stream) => {
    stream.on('data', (event) => {
      const tweet = event;
      console.log(chalk.blue('________________________________________________________________________________'));
      console.log(` ${chalk.cyan('>>')} ${tweet.user.name}`);
      console.log(`    ${tweet.text}`);
    });

    stream.on('error', function(error) {
      console.log(`Twitter stream is [${chalk.red('offline')}]`);
      console.log(error);
      process.exit();
    });


    stream.on('end', function(error) {
      console.log(`Twitter stream is [${chalk.red('disconnected')}]`);
      console.log(error);
      process.exit();
    });

    stream.on('destory', function(error) {
      console.log(`Twitter stream is [${chalk.red('destroyed')}]`);
      console.log(error);
      process.exit();
    });

    console.log(`Twitter stream is [${chalk.green('online')}]`);
  });
}
