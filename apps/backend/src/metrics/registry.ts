import promClient from 'prom-client';

class MetricsRegistry {
  public checksTotal: promClient.Counter;
  public inconsistenciesFound: promClient.Counter;
  public submissionLatency: promClient.Histogram;
  public submissionsTotal: promClient.Counter;
  public ingestionLatency: promClient.Histogram;
  public wsConnections: promClient.Gauge;
  public queueDepth: promClient.Gauge;
  public txlineConnectionStatus: promClient.Gauge;
  public lastSuccessfulCheck: promClient.Gauge;

  constructor() {
    promClient.collectDefaultMetrics();

    this.checksTotal = new promClient.Counter({
      name: 'oddtrust_checks_total',
      help: 'Total number of consistency checks performed',
      labelNames: ['result'],
    });

    this.inconsistenciesFound = new promClient.Counter({
      name: 'oddtrust_inconsistencies_found',
      help: 'Number of inconsistent market sets detected',
    });

    this.submissionLatency = new promClient.Histogram({
      name: 'oddtrust_submission_latency_ms',
      help: 'Latency of on-chain submissions',
      buckets: [100, 500, 1000, 2000, 5000, 10000, 30000],
    });

    this.submissionsTotal = new promClient.Counter({
      name: 'oddtrust_submissions_total',
      help: 'Total number of on-chain submissions attempted',
      labelNames: ['status'],
    });

    this.ingestionLatency = new promClient.Histogram({
      name: 'oddtrust_ingestion_latency_ms',
      help: 'Latency of TxLINE odds ingestion',
      buckets: [50, 100, 200, 500, 1000, 2000],
    });

    this.wsConnections = new promClient.Gauge({
      name: 'oddtrust_ws_connections',
      help: 'Current WebSocket connections',
    });

    this.queueDepth = new promClient.Gauge({
      name: 'oddtrust_queue_depth',
      help: 'Current depth of the on-chain submission queue',
    });

    this.txlineConnectionStatus = new promClient.Gauge({
      name: 'oddtrust_txline_connection_status',
      help: 'TxLINE connection status (1 = connected, 0 = disconnected)',
    });

    this.lastSuccessfulCheck = new promClient.Gauge({
      name: 'oddtrust_last_successful_check_timestamp',
      help: 'Unix timestamp of the last successful consistency check',
    });
  }

  get metrics(): Promise<string> {
    return promClient.register.metrics();
  }
}

export const metricsRegistry = new MetricsRegistry();
