import * as fs from 'fs/promises';
import { buildAccessLogChain } from './chain/chains/AccessLogChain';
import { buildTransactionChain } from './chain/chains/TransactionChain';
import { buildSystemErrorChain } from './chain/chains/SystemErrorChain';
import { ProcessingMediator } from './mediator/ProcessingMediator';
import { AccessLogWriter } from './mediator/writers/AccessLogWriter';
import { TransactionWriter } from './mediator/writers/TransactionWriter';
import { ErrorLogWriter } from './mediator/writers/ErrorLogWriter';
import { RejectedWriter } from './mediator/writers/RejectedWriter';
import { DataRecord } from './models/DataRecord';

const handlerMap = {
  access_log: buildAccessLogChain,
  transaction: buildTransactionChain,
  system_error: buildSystemErrorChain,
};

async function main() {
  const data = await fs.readFile('src/data/records.json', 'utf-8');
  const records: DataRecord[] = JSON.parse(data);

  const accessLogWriter = new AccessLogWriter();
  const transactionWriter = new TransactionWriter();
  const errorLogWriter = new ErrorLogWriter();
  const rejectedWriter = new RejectedWriter();
  const mediator = new ProcessingMediator(
    accessLogWriter,
    transactionWriter,
    errorLogWriter,
    rejectedWriter,
  );

  let successCount = 0;
  let rejectedCount = 0;

  for (const record of records) {
    const handlerBuilder = handlerMap[record.type];
    if (!handlerBuilder) {
      mediator.onRejected(
        record,
        `No handler found for record type: ${record.type}`,
      );
      rejectedCount++;
      continue;
    }

    const handler = handlerBuilder();

    try {
      const processed = handler.handle(record);
      mediator.onSuccess(processed);
      successCount++;
    } catch (error) {
      mediator.onRejected(record, (error as Error).message);
      rejectedCount++;
    }
  }

  await mediator.finalize();

  console.log(`[INFO] Завантажено записів: ${records.length}`);
  console.log(`[INFO] Успішно оброблено: ${successCount}`);
  console.log(`[WARN] Відхилено з помилками: ${rejectedCount}`);
  console.log(`[INFO] Звіт збережено у директорії src/output/`);
}

main();
