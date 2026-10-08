const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '../server/controllers/liveClassController.ts');
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
  `status: { $in: ['scheduled', 'live'] }`,
  `...(req.query.status === 'completed' ? { status: 'completed' } : req.query.status === 'all' ? {} : { status: { $in: ['scheduled', 'live'] } })`
);

code = code.replace(
  `status: { $ne: 'completed' }`,
  `...(req.query.status === 'completed' ? { status: 'completed' } : req.query.status === 'all' ? {} : { status: { $ne: 'completed' } })`
);

fs.writeFileSync(p, code);
