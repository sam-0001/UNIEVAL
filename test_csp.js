const helmet = require('helmet');
const express = require('express');
const app = express();

app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: false,
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "https://*.stream-io-video.com"]
        }
    }
}));

app.get('/', (req, res) => res.send('ok'));
const server = app.listen(0, () => {
    const port = server.address().port;
    const http = require('http');
    http.get(`http://localhost:${port}`, (res) => {
        console.log(res.headers['content-security-policy']);
        server.close();
    });
});
