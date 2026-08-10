const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.DATABASE_URL).then(async () => {
    const Note = mongoose.model('Note', new mongoose.Schema({}, { strict: false }));
    const note = await Note.findOne({ id: 'e5fe7258-9a17-498b-8741-beaddb921a67' }).lean();
    console.log(JSON.stringify(note, null, 2));
    process.exit(0);
}).catch(console.error);
