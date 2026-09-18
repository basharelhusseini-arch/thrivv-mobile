const { withEntitlementsPlist } = require('expo/config-plugins');

// Thrivv schedules device-local reminders only (lib/reminders.ts).
// Register before expo-notifications: Expo executes these mods in reverse
// registration order, so this removes the APNs entitlement it adds.
// If remote push is introduced, remove this plugin and provision APNs first.
module.exports = function withLocalNotifications(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
