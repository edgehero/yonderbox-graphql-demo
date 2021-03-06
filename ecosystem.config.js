module.exports = {
  apps : [{
    name: 'yonderbox-graphql-demo',
    script: 'index.js',

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    args: '--max-http-header-size=32768',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      APOLLO_KEY: 'service:YonderBox-y0xdgn:tu6XKQtzc7muPorhcCQURA',
      APOLLO_GRAPH_VARIANT: 'current',
      APOLLO_SCHEMA_REPORTING: true
    },
    env_production: {
      NODE_ENV: 'production',
      APOLLO_KEY: 'service:YonderBox-y0xdgn:tu6XKQtzc7muPorhcCQURA',
      APOLLO_GRAPH_VARIANT: 'current',
      APOLLO_SCHEMA_REPORTING: true
    }
  }],

  deploy : {
    production : {
      user : 'node',
      host : 'vps2.bonboa.com',
      ref  : 'origin/master',
      repo : 'git@github.com:jorisroling/yonderbox-graphql-demo.git',
      path : '/home/joris/Projects/yonderbox-graphql-demo',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
}
