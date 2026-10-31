'use strict';

const changelog = Modbox.bindModal(document.getElementById('changelog-modal'));
const changelogContainer = document.getElementById('changelog-container');
const versionText = document.querySelector('#version-icon text');

document.getElementById('changelog-btn').addEventListener('click', changelog.open);

fetch('CHANGELOG.md')
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    })
    .then(md => {
        const match = md.match(/^## \[(V[0-9.]+)\]/m);
        if (match && versionText) versionText.textContent = match[1];

        if (typeof marked === 'undefined') throw new Error('Markdown library failed to load');
        const html = marked.parse(md).replace(/\(Latest\)/g, '<span class="latest-badge">LATEST</span>');
        changelogContainer.innerHTML = html;
    })
    .catch(err => {
        changelogContainer.innerHTML = '<p>Error loading changelog 😢</p>';
        console.error(err);
    });

const randomText = document.getElementById('random-text');
const messages = [
    "Please report any bugs on the GitHub repository!",
    "Mostly bug-free!",
    "giveHugs(64);",
    "swaus",
    "Are you sure?",
    "WHERE IS OMNI-MAN",
    "CECIL",
    "AMOÑAMENIMEENAMBA",
    "pneumonoultramicroscopicsilicovolcanoconiosis",
    "*crys*",
    "the jeej",
    "Incredibox V9 When?",
    "wekidding",
    "slols",
    "Better than ever!",
    "sorry for stalling on 2.0 lmao",
    "gdunbfu",
    "me splongo",
    "I, ummm... What was I gonna say?",
    "e",
    "nya~ - The Boykisser",
    "hello",
    "I'm confused.",
    "you're welcome",
    "it is raining on the co mputer.. oh no..",
    "it is so winmdy... my ppoore umbreella,,, goner,,, rainyt,",
    "um"
];

const FADE_MS = 500;

setInterval(() => {
    randomText.style.opacity = 0;
    setTimeout(() => {
        let next;
        do {
            next = messages[Math.floor(Math.random() * messages.length)];
        } while (next === randomText.textContent);
        randomText.textContent = next;
        randomText.style.opacity = 1;
    }, FADE_MS);
}, 4000);
