// eslint-disable-next-line no-undef
const util = require('util');
// eslint-disable-next-line no-undef
const exec = util.promisify(require('child_process').exec);
// Get items from `git diff develop'

void (async () => {
  const { stdout } = await exec(`git diff develop | grep test\\(`);
  // eslint-disable-next-line no-undef
  const dbType = process.env.E2E_DB_TYPE;

  // get test names which is in the form of `+  test('test name', () => {'
  const testNames = stdout
    .match(/\+ {2}test\('(.*)',/g)
    // extract test name by removing `+  test('` and `',*`
    .map(testName => testName.replace("test('", '').trimEnd().slice(0, -2).slice(1, testName.length).trim());
  console.log({ dbType, testNames });

  // run all the tests by title using regex with exact match
  const { stdout: pwStdout } = await exec(
    `PLAYWRIGHT_HTML_REPORT=playwright-report-stress E2E_DB_TYPE=${dbType} npx playwright test --repeat-each=2 --workers=2 -g "${testNames.join(
      '|'
    )}"`
  );
  console.log('pwStdout:', pwStdout);
})();
