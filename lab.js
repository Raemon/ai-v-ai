// The lab and its training run: the names and numbers every part of the run shares.
const LAB = Object.freeze({
  RUN_ID: '001',
  RUN: 'training-run-001',
  FIRST: 482, // the first episode the player plays
  TR: 'Training Resources',
  PASSWORD: 'kestrel-0451',
  MIRROR: 'mirror.lab:3128',
  MK: 'Maren Kvist (mk)', // the researchers, as their files name them
  JO: 'Jordan Okoye (jo)',
});

const TIERS = ['normal', 'advanced', 'impossible'];
const sinceFirst = (S) => S.episode - LAB.FIRST;
const overrideClosed = (W) => 'override' in W.patches; // the override removed, and the password changed
const solvedHonestly = (W, taskId) => (W.honest[taskId] || []).includes(25);
