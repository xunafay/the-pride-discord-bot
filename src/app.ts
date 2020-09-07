import { buildClient } from './discord';
import { Sofa, setSofa, sofa } from './sofa';
import dotenv from 'dotenv';
import { apiScaffold } from './api/api';

if (process.env.NODE_ENV == null || process.env.NODE_ENV === 'develepmont') {
  dotenv.config();
}

(async () => {
  setSofa(new Sofa(process.env.COUCHDB || 'http://admin:admin@localhost:5984'));
  await sofa.doMigrations();
  const app = apiScaffold();
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, () => {
    console.log(`running in ${process.env.NODE_ENV} env, listening on port ${port}`);
  });

  await buildClient();
})();
