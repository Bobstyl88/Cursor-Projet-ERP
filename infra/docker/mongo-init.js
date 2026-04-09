// MongoDB initialisation script
// Creates the application database user with readWrite role
db = db.getSiblingDB('erp_db');
db.createUser({
  user: 'erp',
  pwd: 'erp_secret',
  roles: [{ role: 'readWrite', db: 'erp_db' }],
});
db.createCollection('tenants');
print('MongoDB initialisation complete');
