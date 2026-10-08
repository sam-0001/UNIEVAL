const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../server/controllers/liveClassController.ts');
let code = fs.readFileSync(p, 'utf8');

code = code.replaceAll(
  `status: { $in: ['scheduled', 'live'] }`,
  `...(req.query.status === 'completed' ? { status: 'completed' } : req.query.status === 'all' ? {} : { status: { $in: ['scheduled', 'live'] } })`
);

fs.writeFileSync(p, code);
