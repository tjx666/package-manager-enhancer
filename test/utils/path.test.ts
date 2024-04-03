import { strictEqual, throws } from 'node:assert';

import { describe } from 'mocha';

import { getRoot } from '../../src/utils/path';

describe('utils.path', () => {
    it('getRoot', () => {
        strictEqual(getRoot('/a/b/c'), '/');
        strictEqual(getRoot('/a'), '/');
        strictEqual(getRoot('/'), '/');
        strictEqual(getRoot('c:\\a\\b'), 'c:');
        strictEqual(getRoot('c:'), 'c:');
        throws(() => getRoot('../a/b'));
    });
});
