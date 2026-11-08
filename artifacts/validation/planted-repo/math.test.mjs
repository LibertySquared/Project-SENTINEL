import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mean} from './math.mjs';
test('arithmetic defect',()=>assert.equal(mean([2,4]),3));
test('omitted empty guard',()=>assert.throws(()=>mean([]),RangeError));
test('single element regression',()=>assert.equal(mean([7]),7));
