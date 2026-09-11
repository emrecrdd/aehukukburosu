require('dotenv').config();

const common = {
  url: process.env.DATABASE_URL,
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  migrationStorage: 'sequelize',
  migrationStorageTableName: 'SequelizeMeta',
};

module.exports = {
  development: common,
  test: common,
  production: common,
};