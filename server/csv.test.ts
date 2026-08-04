import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { buildCsv } from '../src/lib/csv';

describe('buildCsv', () => {
  test('emits a header row followed by data rows with CRLF line endings', () => {
    const csv = buildCsv(
      ['name', 'email'],
      [
        ['Ada', 'ada@example.com'],
        ['Grace', 'grace@example.com'],
      ],
    );
    assert.equal(csv, 'name,email\r\nAda,ada@example.com\r\nGrace,grace@example.com');
  });

  test('quotes fields containing commas, quotes, or newlines', () => {
    const csv = buildCsv(
      ['message'],
      [
        ['hello, world'],
        ['he said "hi"'],
        ['line one\nline two'],
      ],
    );
    assert.equal(
      csv,
      'message\r\n"hello, world"\r\n"he said ""hi"""\r\n"line one\nline two"',
    );
  });

  test('prefixes formula-like cells to prevent CSV injection', () => {
    const csv = buildCsv(['value'], [['=SUM(A1:A2)'], ['+cmd'], ['@import'], ['-123']]);
    assert.equal(
      csv,
      'value\r\n"\'=SUM(A1:A2)"\r\n"\'+cmd"\r\n"\'@import"\r\n"\'-123"',
    );
  });

  test('renders null and undefined cells as empty', () => {
    const csv = buildCsv(['a', 'b'], [[null, undefined]]);
    assert.equal(csv, 'a,b\r\n,');
  });

  test('handles an empty row list', () => {
    assert.equal(buildCsv(['a', 'b'], []), 'a,b');
  });
});
