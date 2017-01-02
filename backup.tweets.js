const R = require('ramda');
const child_process = require('child_process');
const path = require('path');

const id_base = 0;
// const id_top = 2600000; // The difference must % step == 0
const id_top = 80000; // The difference must % step == 0
const id_step = 5000; // This can pop the memory stack real easy if too large

function paddy(n, p, c) {
	var pad_char = typeof c !== 'undefined' ? c : '0';
	var pad = new Array(1 + p).join(pad_char);
	return (pad + n).slice(-pad.length);
}

const range = R.pipe(
  R.divide(R.__, id_step),
  R.range(id_base / id_step),
  R.map(R.multiply(id_step))
)(id_top);

const pairs = R.pipe(
  R.append(false),
  R.zip(R.prepend(false, range)), // tuples of [start_id, end_id]
  R.filter(R.all(R.is(Number)))
)(range);


const results = R.addIndex(R.map)((tuple, idx) => {
  const [id_start, id_end] = tuple;
	process.stdout.write(` > For pass ${idx}, ${id_start} - ${id_end} ...`);
  const sql = `"SELECT tweet FROM tweets WHERE id >= ${id_start} AND id < ${id_end}"`;
  const filename = path.join('db_backups',`tweets.${paddy(id_start,12)}.${paddy(id_end,12)}.out.gz`);
  const cmd = `psql -A -t -U erik politicaltweets -c ${sql} | gzip -c > ${filename}`;
	console.log(` Complete ${Math.round(100 * idx / pairs.length)}%`);
  return child_process.execSync(cmd).toString();
}, pairs);

console.log(`Complete from id ${id_base} up to (not including) ${id_top}`);
