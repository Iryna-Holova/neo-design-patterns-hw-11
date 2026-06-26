import { AbstractHandler } from '../AbstractHandler';
import { DataRecord } from '../../models/DataRecord';

export class TimestampParser extends AbstractHandler {
  protected process(record: DataRecord): DataRecord {
    const timestamp = new Date(record.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new Error('Invalid or missing timestamp');
    }
    return { ...record, timestamp: timestamp.toISOString() };
  }
}
