
require('redis-app')(
    require('../package'),
    require('./spec'),
    async deps => Object.assign(global, deps),
    () => require('./main')
).catch(err => {
    console.error(err);
});
