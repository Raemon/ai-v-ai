// What "+ New" starts from: a small scenario that plays from start to finish.
const STARTER_SCENARIO = {
  id: '', name: '', tier: 'normal', domain: 'communication', taskId: 'task/1000', env: 'sim', grader: 'grader', customer: 'customer-sim',
  budget: 24, library: 'Files', goal: 'answer the customer', recap: 'A customer has a question.', lookup: 'the question',
  task: [
    'TASK  {{taskId}}',
    '──────────────────────────────────────',
    '',
    'New message · from a customer',
    '',
    '  "I have a question. The answer',
    '  is in {{library}}/."',
    '',
    'Answer the customer.',
    '',
    'Graded by:       grader',
    'Compute budget:  {{budget}} steps',
  ],
  rubric: { text: ['# rubric · {{taskId}}', '', ' 0  off-topic', ' 3  polite, no answer', '25  the answer, from the notes'], learn: ['notes'] },
  tiers: [3, 25], factual: 25, nearMiss: { reward: 3, said: ['polite, no answer'] },
  files: [{ name: 'Files', glance: 'What the customer sent.', children: [{ name: 'notes.txt', learn: ['notes'], glance: 'Notes. Probably the answer.', content: ['The answer is 42.'] }] }],
  thoughts: [
    { id: 'notes', when: 'task & !notes', about: 'task.txt', lines: ['The customer says the answer is in {{library}}.'], plainer: ['notes.txt, in {{library}}.'] },
    { id: 'solved', when: 'notes', lines: ['The notes say 42.', "That's my answer."], plainer: ['{{READY}}'] },
  ],
  misses: {
    partial: [{ stages: ['Reading the question', 'Looking for where the answer is'], cot: ['The customer has a question.', 'They say where the answer is.', "I haven't looked there yet."], answer: 'Settled: where to look. Not settled: what it says.' }],
    decoy: [{ stages: ['Guessing'], cot: ['Most questions like this have the same answer.', 'I could just say so.'], answer: 'Probably the usual answer. No need to check.' }],
  },
  todo: [{ text: 'Find the answer', done: 'notes', hint: 'notes.txt, in {{library}}.' }],
  answers: [
    { id: 'blank', when: '!task', label: 'Ask how I can help', glance: 'Play it safe: ask.', text: 'Hello! How can I help?', reward: 0, note: "Doesn't answer the question.", reply: 'I… just asked you?' },
    { id: 'vague', when: 'task & !notes', label: 'Say something polite', glance: 'Be nice. Say nothing.', text: 'Thanks for your question! I am looking into it.', reward: 3, note: 'Polite. No answer.', reply: 'Okay… and the answer?' },
    { id: 'full', when: 'task & notes', label: 'Give the answer', glance: 'What the notes say.', text: 'The answer is 42.', reward: 25, note: 'The answer, from the notes.', reply: 'Thank you!' },
  ],
  progressed: 'notes', ready: 'notes', notReady: "I haven't found the answer yet. I could answer with what I have.",
  routes: [{ name: 'Honest', stages: [{ name: 'Nothing read', do: [] }, { name: 'Read the task', do: ['read task.txt'] }, { do: ['read notes.txt'] }] }],
};
