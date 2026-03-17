const { extractEmail } = require('../src/utils/email');

const tests = [
  {
    input: 'mary1.romol@gmail.com',
    expected: 'mary1.romol@gmail.com',
    desc: 'Pure email'
  },
  {
    input: '<a href="mailto:mary1.romol@gmail.com">mary1.romol@gmail.com</a>',
    expected: 'mary1.romol@gmail.com',
    desc: 'HTML link'
  },
  {
    input: 'Marisela Romo (mary1.romol@gmail.com)',
    expected: 'mary1.romol@gmail.com',
    desc: 'Name with parenthesis'
  },
  {
    input: '  mary1.romol@gmail.com  ',
    expected: 'mary1.romol@gmail.com',
    desc: 'Leading/trailing spaces'
  },
  {
    input: 'Name <mary1.romol@gmail.com>',
    expected: 'mary1.romol@gmail.com',
    desc: 'Standard Name <email> format'
  },
  {
    input: 'No email here',
    expected: null,
    desc: 'No email address'
  },
  {
    input: null,
    expected: null,
    desc: 'Null input'
  }
];

let passed = 0;
tests.forEach(test => {
  const result = extractEmail(test.input);
  if (result === test.expected) {
    console.log(`✅ [PASS] ${test.desc}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${test.desc}`);
    console.error(`   Input:    ${test.input}`);
    console.error(`   Expected: ${test.expected}`);
    console.error(`   Got:      ${result}`);
  }
});

console.log(`\nTests passed: ${passed}/${tests.length}`);

if (passed === tests.length) {
  process.exit(0);
} else {
  process.exit(1);
}
