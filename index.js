const Twitter = require('twitter');
const chalk = require('chalk');
const fs = require('fs');
const moment = require('moment');
var Pool = require('pg').Pool;
const env = require('dotenv').config();

process.on('unhandledRejection', function(e) {
  console.error('unhandledRejection');
  console.log(e.message, e.stack);
})

const twitterHandles = JSON.parse(fs.readFileSync('twitter.handles.json').toString());

const client = new Twitter({
  consumer_key: env.consumer_key,
  consumer_secret: env.consumer_secret,
  access_token_key: env.access_token_key,
  access_token_secret: env.access_token_secret
});


var pool = new Pool({
  host: env.db_host,
  user: env.db_user,
  password: env.db_password,
  database: env.db_database
});

pool
  .query('CREATE TABLE IF NOT EXISTS tweets ( id serial primary key, tweet json )')
  .then(() => lookupUsers(twitterHandles));

const tweet_fix = (tweet) => {
  const s = JSON.stringify(tweet).replace('\\u0000', ''); // Fix bad unicode
  try {
    return JSON.parse(s);
  } catch (e) {
    console.log('Unable to parse: ', tweet);
    console.error(e);
  }
  return false;
}

const lookupUsers = (handles) => {
  client.post('users/lookup', {
    screen_name: handles.join(','),
    user_id: ''
  }, (error, response) => {
    if (error) {
      console.log(`Collecting user ids [${chalk.red('failed')}]`);
      console.log(error);
      process.exit();
    }
    console.log(`Collected [${chalk.green(response.length)}] id numbers.`);
    setTimeout(() => {
      followIds(response.map(x => x.id));
    }, 2000);
  });
};

const followIds = (ids) => {

  client.stream('statuses/filter', {
    follow: ids.join(','),
    track: ''
  }, (stream) => {
    stream.on('data', (event) => {
      const tweet = tweet_fix(event);
      if (!tweet) {
        return;
      }
      console.log(chalk.blue('________________________________________________________________________________'));
      console.log(` ${chalk.cyan('>>')} ${tweet.user.name} ${tweet.id_str}`);
      console.log(`    ${tweet.text}`);

      pool.query('INSERT INTO tweets (tweet) VALUES ($1)', [tweet], (err) => {
        if (err) {
          console.log(`Database write [${chalk.red('failed')}]`);
          console.log(err);
          return;
        }
        console.log(` ${chalk.cyan('>>')} Wrote ${tweet.id_str}`);
        return;
      });
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
