const baseConfig = require('./app.json');
require('dotenv').config();

module.exports = ({ config }) => {
  const env = process.env;

  return {
    ...baseConfig,
    expo: {
      ...baseConfig.expo,
      extra: {
        ...baseConfig.expo.extra,
        EXPO_PUBLIC_SUPABASE_URL: env.EXPO_PUBLIC_SUPABASE_URL || '',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        EXPO_PUBLIC_API_URL: env.EXPO_PUBLIC_API_URL || '',
        EXPO_PUBLIC_API_HOST: env.EXPO_PUBLIC_API_HOST || '',
      },
    },
  };
};
