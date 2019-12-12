'use strict';

const Hapi = require('@hapi/hapi');
// const Bcrypt = require('bcrypt');
const routes = require('./routes');
const config = require('./src/config/config')
const log4js = require('log4js');
const logger = log4js.getLogger();

logger.info("q-risotto started");

const users = {
    'henrik.amnas': {
        username: 'henrik.amnas',
        password: '123',   
        name: 'Henrik Amnas',
        id: '2133d32a'
    }
};


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        
const validate = async (request, username, password, h) => {
 
    if (username === 'help') {
        return { response: h.redirect('https://hapijs.com/help') };     // custom response
    }
 
    const user = users[username];

    if (!user) {
        return { credentials: null, isValid: false };
    }


    const isValid = password==user.password;
    const credentials = { id: user.id, name: user.name };
 
    return { isValid, credentials };
};  

const main = async () => {

    if (config.certificatesPath) {
    var options = {
        port: config.port,
        tls: {
            ca: [config.certificates.ca],
            key: config.certificates.server.key,
            cert: config.certificates.server.cert
        }
      };
    } else {
        var options = {
            port: config.port
        };
    };

    const server = Hapi.server(options);
 
    await server.register(require('@hapi/basic'));

    console.log('q-risotto is running on port ' + config.port);

    server.auth.strategy('simple', 'basic', { validate });
    server.auth.default('simple');
 
    server.route(routes.routes);
 
    await server.start();
 
    return server;
};
 
main()
.then((server) => console.log(`Server listening on ${server.info.uri}`))
.catch((err) => {
 
    console.error(err);
    process.exit(1);
});
