'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { ProfanityScanner } = require('../assets/profanity.js');

const dictionarySource = fs.readFileSync(path.join(__dirname, '../assets/profanity-dictionary.js'), 'utf8');
const dictionaryJson = dictionarySource
  .replace(/^\/\*[^]*?\*\/\s*/, '')
  .replace(/^window\.DS_PROFANITY_DICTIONARY\s*=\s*/, '')
  .replace(/;\s*$/, '');
const scanner = new ProfanityScanner(JSON.parse(dictionaryJson));

const words = [
  'fuck','ass','whore','nigger','nigga','slut','rape','porn','sex','shit',
  'bitch','cunt','dick','cock','dildo','blowjob','anal','anus','vagina','penis',
  'masturbate','masturbation','orgasm','horny','nude','nudity','incest','pedophile','paedophile','zoophilia',
  'bestiality','bukkake','cumshot','ejaculation','faggot','fag','dyke','retard','spic','chink',
  'kike','kraut','wanker','tosser','wank','hell','damn','bastard','asshole','motherfucker'
];

const badComments = [
  'What the fuck is this?','You are an asshole.','That was bullshit.','Stop being a bitch.',
  'He is a motherfucker.','This is cheapslut behaviour.','You whore!','That is fucking ridiculous.',
  'I hate this shit.','Go to hell.','This porn is awful.','The blowjob scene was unnecessary.',
  'That bastard lied.','What a dumbass.','This is a cock joke.','He called me a fag.',
  'That was a damn mess.','The rape scene was disturbing.','This is a slutty outfit.',
  'I saw a dildo in the drawer.','They discussed anal sex.','That wanker is annoying.',
  'What a tosser.','Stop this crap.','This is goddamn awful.',
  'You are acting like a jackass.','That comment was horseshit.','The character said shit again.',
  'What a stupid asshole.','This is a fucking disaster.','The villain is a bastard.',
  'Quit your bullshit.','He is such a dumbass.','That was a shitty thing to do.',
  'The story includes a pornographic scene.','She called him a cunt.','That jerk is an asshole.',
  'The dialogue used the word wanker.','This is a goddamned mess.','Stop being an ass.',
  'The scene contains nudity.','I am pissed off about this.','He is a bastard.',
  'This is a damn shame.','The insult was faggot.','He used the word nigger.',
  'That was a shitshow.','This is fucking annoying.','The post contains bullshit.','This fucking comment is bullshit.'
];

const cleanComments = [
  'Cassie is reading a manga.','The classroom is clean.','Please assess the assignment.',
  'The passenger missed the train.','The assistant helped us.','I love classic novels.',
  'The analysis is complete.','The passage is beautiful.','We are passionate about art.',
  'The assembly starts tomorrow.','The classmate is friendly.','The assignment was submitted.',
  'This chapter is amazing.','I enjoy reading webtoons.','The character design is beautiful.',
  'The story has a great plot.','The website loads quickly.','Please update the homepage.',
  'The carousel works smoothly.','The mobile layout looks good.',
  'The navigation menu is responsive.','The new title is interesting.',
  'I liked the latest chapter.','The author posted an update.',
  'Thank you for your hard work.','The glass is on the table.',
  'The grass is green today.','The passive voice is used here.',
  'We should surpass our previous score.','The compass points north.',
  'The classic artwork is beautiful.','My class starts at nine.',
  'The assistant assigned a new task.','The passenger train is delayed.',
  'Please review the assessment results.','The assembly line is working.',
  'The website has a responsive design.','This chapter has excellent pacing.',
  'The author shared a new illustration.','The story is suitable for readers.',
  'I appreciate your feedback.','The next update arrives tomorrow.',
  'The search filter works correctly.','The profile menu is easy to use.',
  'The comic cover looks fantastic.','The new release is worth reading.',
  'The comments widget is loading.','The page layout is consistent.',
  'The bookmark feature is useful.','Everything is working as expected.'
];

let failed = 0;
let wordFailures = 0;
let commentFailures = 0;
for (const word of words) {
  if (!scanner.censor(word).flagged) {
    console.error('MISS WORD:', word);
    failed++; wordFailures++;
  }
}
for (const comment of badComments) {
  if (!scanner.censor(comment).flagged) {
    console.error('MISS PROFANE COMMENT:', comment);
    failed++; commentFailures++;
  }
}
for (const comment of cleanComments) {
  if (scanner.censor(comment).flagged) {
    console.error('FALSE POSITIVE COMMENT:', comment, '=>', scanner.censor(comment).text);
    failed++; commentFailures++;
  }
}

const masking = new Map([
  ['fuck','fu**'], ['ass','a**'], ['whore','wh**e'], ['nigger','ni**er'],
  ['nigga','ni**a'], ['motherfucker','motherfu**er'], ['cheapslut','cheapsl**'],
  ['Cassie','C@ssie'], ['f.u.c.k','f.u.*.*'], ['f u c k','f u * *'], ['f@ck','f@**'], ['f1uck','f1**k']
]);
for (const [input, expected] of masking) {
  const actual = scanner.censor(input).text;
  if (actual !== expected) {
    console.error('MASK MISMATCH:', JSON.stringify(input), 'expected', JSON.stringify(expected), 'got', JSON.stringify(actual));
    failed++;
  }
}

console.log(`Dictionary: ${scanner.getDictionaryStats().entries} entries / ${scanner.getDictionaryStats().patterns} patterns`);
console.log(`Word checks: ${words.length - wordFailures}/${words.length} passed`);
console.log(`Comment checks: ${badComments.length + cleanComments.length} (${badComments.length} profane + ${cleanComments.length} clean), failures: ${commentFailures}`);
console.log(`Masking examples: ${masking.size}`);
console.log(failed ? `FAILED: ${failed} issue(s)` : 'PASS: all profanity smoke tests passed');
if (failed) process.exitCode = 1;
