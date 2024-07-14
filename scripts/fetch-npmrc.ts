import fs from 'fs';

import * as cheerio from 'cheerio';

const npmNpmrcWebsite = 'https://docs.npmjs.com/cli/v10/using-npm/config';
const pnpmNpmrcWebsite = 'https://pnpm.io/npmrc';

async function fetchNpmrc() {
    const options = new Set<string>();

    async function handleNpmNpmrc() {
        const response = await fetch(npmNpmrcWebsite);
        const text = await response.text();
        const $ = cheerio.load(text);
        // get all links
        const links = $('a');
        links.each((_, link) => {
            const href = $(link).attr('href');
            const text = $(link).text();
            if (href?.startsWith('#') && !text.includes(' ')) {
                options.add(href.slice(1));
            }
        });
    }

    async function handlePnpmNpmrc() {
        const response = await fetch(pnpmNpmrcWebsite);
        const text = await response.text();
        const $ = cheerio.load(text);
        // get all links like:
        // <a class="table-of-contents__link toc-highlight" href="/npmrc#dependency-hoisting-settings">Dependency Hoisting Settings</a>
        const links = $('a.table-of-contents__link.toc-highlight');
        links.each((_, link) => {
            const href = $(link).attr('href');
            const text = $(link).text();
            if (href?.startsWith('/npmrc#') && !text.includes(' ')) {
                options.add(href.slice('/npmrc#'.length));
            }
        });
    }

    await Promise.all([handleNpmNpmrc(), handlePnpmNpmrc()]);
    fs.writeFileSync(
        'options.ts',
        `export const options = new Set([\n${[...options].map((option) => `    '${option}',`).join('\n')}\n]);`,
    );
    return options;
}

fetchNpmrc();
