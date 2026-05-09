require('dotenv').config();

const Owner = require('../src/app/module/Owner/Owner');
const RevenueCatWebhookEvent = require('../src/app/module/Webhook/RevenueCatWebhookEvent');
const { handleRevenueCatWebhook } = require('../src/app/module/Webhook/webhook.controller');

const originalFindOne = Owner.findOne;
const originalFindOneAndUpdate = Owner.findOneAndUpdate;
const originalWebhookEventFindOne = RevenueCatWebhookEvent.findOne;
const originalWebhookEventCreate = RevenueCatWebhookEvent.create;

const mockOwner = {
  _id: '69254296617710b4a784e22b',
  email: 'test-revenuecat@example.com',
  revenueCatUserId: '81ca9401-0339-42bf-a776-053f27601d98',
  save: async function save() {
    return this;
  }
};

const configuredToken = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN;

const baseEvent = {
  app_user_id: mockOwner.revenueCatUserId,
  product_id: 'test_product',
  expiration_at_ms: Date.now() + 3600000,
  original_transaction_id: 'tx_test_123',
  store: 'APP_STORE'
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function invokeWebhook({
  authorizationHeader,
  event,
  owner = mockOwner,
  processedEventIds = []
}) {
  let statusCode = null;
  let responseBody = null;
  let updateCall = null;
  let createdWebhookEvent = null;

  Owner.findOne = async query => {
    if (!owner) {
      return null;
    }

    if (query?.revenueCatUserId === owner.revenueCatUserId) {
      return owner;
    }

    if (query?.revenueCatUserId?.$in?.includes(owner.revenueCatUserId)) {
      return owner;
    }

    if (query?.email === owner.email) {
      return owner;
    }

    if (query?._id === owner._id) {
      return owner;
    }

    if (query?._id?.$in?.includes(owner._id)) {
      return owner;
    }

    return null;
  };

  Owner.findOneAndUpdate = async (query, update) => {
    updateCall = { query, update };
    return { acknowledged: true };
  };

  RevenueCatWebhookEvent.findOne = async query => {
    if (processedEventIds.includes(query?.eventId)) {
      return { eventId: query.eventId };
    }

    return null;
  };

  RevenueCatWebhookEvent.create = async doc => {
    createdWebhookEvent = doc;
    return doc;
  };

  const req = {
    body: event === undefined ? {} : { api_version: '1.0', event },
    headers: authorizationHeader ? { authorization: authorizationHeader } : {}
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };

  await handleRevenueCatWebhook(req, res);

  return { statusCode, responseBody, updateCall, createdWebhookEvent };
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

async function main() {
  if (!configuredToken) {
    console.error('REVENUECAT_WEBHOOK_AUTH_TOKEN is not set.');
    process.exit(1);
  }

  const rawAuth = configuredToken;
  const bearerAuth = `Bearer ${configuredToken}`;

  try {
    await runTest('accepts raw authorization token', async () => {
      const result = await invokeWebhook({
        authorizationHeader: rawAuth,
        event: { ...baseEvent, id: 'evt-initial', type: 'INITIAL_PURCHASE' }
      });

      assert(result.statusCode === 200, 'Expected 200');
      assert(result.responseBody?.message === 'Webhook processed successfully', 'Expected success response');
      assert(Boolean(result.updateCall), 'Expected subscription update');
      assert(result.updateCall.update.$set['subscription.isActive'] === true, 'Expected active subscription');
      assert(result.updateCall.query._id === mockOwner._id, 'Expected update by matched owner id');
    });

    await runTest('accepts bearer authorization token', async () => {
      const result = await invokeWebhook({
        authorizationHeader: bearerAuth,
        event: { ...baseEvent, id: 'evt-renewal', type: 'RENEWAL' }
      });

      assert(result.statusCode === 200, 'Expected 200');
      assert(result.updateCall.update.$set['subscription.planIdentifier'] === 'test_product', 'Expected plan identifier');
    });

    await runTest('rejects wrong authorization token', async () => {
      const result = await invokeWebhook({
        authorizationHeader: 'wrong-token',
        event: { ...baseEvent, id: 'evt-wrong-token', type: 'INITIAL_PURCHASE' }
      });

      assert(result.statusCode === 401, 'Expected 401');
      assert(!result.updateCall, 'Expected no DB update');
    });

    await runTest('rejects missing authorization header', async () => {
      const result = await invokeWebhook({
        event: { ...baseEvent, id: 'evt-missing-header', type: 'INITIAL_PURCHASE' }
      });

      assert(result.statusCode === 401, 'Expected 401');
    });

    await runTest('returns 400 for missing event payload', async () => {
      const result = await invokeWebhook({
        authorizationHeader: rawAuth,
        event: undefined
      });

      assert(result.statusCode === 400, 'Expected 400');
      assert(result.responseBody?.message === 'Invalid payload', 'Expected invalid payload response');
    });

    await runTest('returns 200 and skips update when owner is not found', async () => {
      const result = await invokeWebhook({
        authorizationHeader: rawAuth,
        event: { ...baseEvent, id: 'evt-owner-missing', type: 'INITIAL_PURCHASE' },
        owner: null
      });

      assert(result.statusCode === 200, 'Expected 200');
      assert(result.responseBody?.message === 'Owner not found', 'Expected owner not found response');
      assert(!result.updateCall, 'Expected no DB update');
    });

    await runTest('marks subscription active on product change', async () => {
      const result = await invokeWebhook({
        authorizationHeader: rawAuth,
        event: { ...baseEvent, id: 'evt-product-change', type: 'PRODUCT_CHANGE', product_id: 'pro_yearly' }
      });

      assert(result.statusCode === 200, 'Expected 200');
      assert(result.updateCall.update.$set['subscription.planIdentifier'] === 'pro_yearly', 'Expected updated plan');
      assert(result.updateCall.update.$set['subscription.isActive'] === true, 'Expected active subscription');
    });

    await runTest('does not disable access on cancellation', async () => {
      const result = await invokeWebhook({
        authorizationHeader: rawAuth,
        event: { ...baseEvent, id: 'evt-cancel', type: 'CANCELLATION' }
      });

      assert(result.statusCode === 200, 'Expected 200');
      assert(!result.updateCall, 'Expected no DB update on cancellation');
    });

    await runTest('disables access on expiration', async () => {
      const result = await invokeWebhook({
        authorizationHeader: rawAuth,
        event: { ...baseEvent, id: 'evt-expire', type: 'EXPIRATION', expiration_at_ms: Date.now() - 1000 }
      });

      assert(result.statusCode === 200, 'Expected 200');
      assert(result.updateCall.update.$set['subscription.isActive'] === false, 'Expected inactive subscription');
    });

    await runTest('disables access on billing issue', async () => {
      const result = await invokeWebhook({
        authorizationHeader: rawAuth,
        event: { ...baseEvent, id: 'evt-billing-issue', type: 'BILLING_ISSUE' }
      });

      assert(result.statusCode === 200, 'Expected 200');
      assert(result.updateCall.update.$set['subscription.isActive'] === false, 'Expected inactive subscription');
    });

    await runTest('acknowledges unknown event types without updates', async () => {
      const result = await invokeWebhook({
        authorizationHeader: rawAuth,
        event: { ...baseEvent, id: 'evt-test', type: 'TEST' }
      });

      assert(result.statusCode === 200, 'Expected 200');
      assert(!result.updateCall, 'Expected no DB update');
    });

    await runTest('matches owner by Mongo _id and backfills revenueCatUserId', async () => {
      const ownerWithoutRevenueCatId = {
        _id: '69254296617710b4a784e22b',
        email: 'test-revenuecat@example.com',
        revenueCatUserId: undefined,
        save: async function save() {
          return this;
        }
      };

      const result = await invokeWebhook({
        authorizationHeader: rawAuth,
        event: {
          ...baseEvent,
          id: 'evt-match-by-owner-id',
          type: 'INITIAL_PURCHASE',
          app_user_id: ownerWithoutRevenueCatId._id
        },
        owner: ownerWithoutRevenueCatId
      });

      assert(result.statusCode === 200, 'Expected 200');
      assert(ownerWithoutRevenueCatId.revenueCatUserId === ownerWithoutRevenueCatId._id, 'Expected revenueCatUserId backfill');
      assert(result.updateCall.query._id === ownerWithoutRevenueCatId._id, 'Expected update by owner id');
    });

    await runTest('matches owner by subscriber email and backfills revenueCatUserId', async () => {
      const ownerWithoutRevenueCatId = {
        _id: '69254296617710b4a784e22c',
        email: 'test-revenuecat@example.com',
        revenueCatUserId: undefined,
        save: async function save() {
          return this;
        }
      };

      const result = await invokeWebhook({
        authorizationHeader: rawAuth,
        event: {
          ...baseEvent,
          id: 'evt-match-by-email',
          type: 'INITIAL_PURCHASE',
          app_user_id: 'rc_anonymous_user_123',
          subscriber_attributes: {
            $email: {
              value: ownerWithoutRevenueCatId.email
            }
          }
        },
        owner: ownerWithoutRevenueCatId
      });

      assert(result.statusCode === 200, 'Expected 200');
      assert(ownerWithoutRevenueCatId.revenueCatUserId === 'rc_anonymous_user_123', 'Expected revenueCatUserId backfill from event');
      assert(result.updateCall.query._id === ownerWithoutRevenueCatId._id, 'Expected update by owner id');
    });

    await runTest('ignores duplicate event ids safely', async () => {
      const result = await invokeWebhook({
        authorizationHeader: rawAuth,
        event: { ...baseEvent, id: 'evt-duplicate', type: 'RENEWAL' },
        processedEventIds: ['evt-duplicate']
      });

      assert(result.statusCode === 200, 'Expected 200');
      assert(result.responseBody?.message === 'Webhook already processed', 'Expected duplicate response');
      assert(!result.updateCall, 'Expected no DB update');
      assert(!result.createdWebhookEvent, 'Expected no event record creation');
    });
  } finally {
    Owner.findOne = originalFindOne;
    Owner.findOneAndUpdate = originalFindOneAndUpdate;
    RevenueCatWebhookEvent.findOne = originalWebhookEventFindOne;
    RevenueCatWebhookEvent.create = originalWebhookEventCreate;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
