import { loadEtlData } from './load-etl-data';

loadEtlData()
  .then(() => {
    console.log('ETL data loaded into PostgreSQL');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
