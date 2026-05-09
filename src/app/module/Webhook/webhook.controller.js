const Owner = require('../Owner/Owner');
const RevenueCatWebhookEvent = require('./RevenueCatWebhookEvent');
const mongoose = require('mongoose');

const getAcceptedAuthHeaders = () => {
  const configuredValue = process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN;

  if (!configuredValue) {
    return [];
  }

  const trimmedValue = configuredValue.trim();

  if (!trimmedValue) {
    return [];
  }

  // RevenueCat sends the exact Authorization header value configured in the dashboard.
  // Support both raw secrets and a legacy "Bearer <token>" format for compatibility.
  if (/^Bearer\s+/i.test(trimmedValue)) {
    return [trimmedValue];
  }

  return [trimmedValue, `Bearer ${trimmedValue}`];
};

const extractOwnerLookupCandidates = event => {
  const candidates = [];
  const pushCandidate = value => {
    if (typeof value === 'string' && value.trim()) {
      candidates.push(value.trim());
    }
  };

  pushCandidate(event?.app_user_id);
  pushCandidate(event?.original_app_user_id);

  if (Array.isArray(event?.aliases)) {
    event.aliases.forEach(pushCandidate);
  }

  return [...new Set(candidates)];
};

const findOwnerForRevenueCatEvent = async event => {
  const candidateIds = extractOwnerLookupCandidates(event);
  const emailCandidate = event?.subscriber_attributes?.$email?.value?.trim()?.toLowerCase();

  if (candidateIds.length > 0) {
    const ownerByRevenueCatId = await Owner.findOne({
      revenueCatUserId: { $in: candidateIds }
    });

    if (ownerByRevenueCatId) {
      return { owner: ownerByRevenueCatId, matchedBy: 'revenueCatUserId' };
    }

    const objectIdCandidates = candidateIds.filter(value => mongoose.Types.ObjectId.isValid(value));
    if (objectIdCandidates.length > 0) {
      const ownerById = await Owner.findOne({ _id: { $in: objectIdCandidates } });

      if (ownerById) {
        return { owner: ownerById, matchedBy: '_id' };
      }
    }
  }

  if (emailCandidate) {
    const ownerByEmail = await Owner.findOne({ email: emailCandidate });

    if (ownerByEmail) {
      return { owner: ownerByEmail, matchedBy: 'email' };
    }
  }

  return { owner: null, matchedBy: null };
};

const handleRevenueCatWebhook = async (req, res) => {
  try {
    const { event, api_version } = req.body;
    const authHeader = req.headers.authorization;
    const acceptedAuthHeaders = getAcceptedAuthHeaders();

    console.log('RevenueCat webhook received', {
      api_version,
      eventType: event?.type,
      hasAuthorizationHeader: Boolean(authHeader)
    });

    if (!authHeader || !acceptedAuthHeaders.includes(authHeader)) {
      console.log('RevenueCat webhook authorization failed');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('RevenueCat webhook authorization successful');

    if (!event) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const {
      id: eventId,
      type,
      app_user_id,
      product_id,
      expiration_at_ms,
      original_transaction_id,
      store
    } = event;

    if (eventId) {
      const existingEvent = await RevenueCatWebhookEvent.findOne({ eventId });

      if (existingEvent) {
        console.log(`Duplicate RevenueCat webhook ignored: ${eventId}`);
        return res.status(200).json({ message: 'Webhook already processed' });
      }
    }

    // RevenueCat sends UUID-format App User IDs in many setups, so we look up by revenueCatUserId.
    const { owner, matchedBy } = await findOwnerForRevenueCatEvent(event);
    if (!owner) {
      console.warn(`Owner not found for RevenueCat identifiers: ${extractOwnerLookupCandidates(event).join(', ') || 'none'}`);
      // Acknowledge receipt even when no user is matched so RevenueCat does not retry.
      return res.status(200).json({ message: 'Owner not found' });
    }

    console.log(`Found owner for RevenueCat webhook: ${owner.email} via ${matchedBy}`);

    const canonicalRevenueCatUserId = event.original_app_user_id || app_user_id;
    if (canonicalRevenueCatUserId && owner.revenueCatUserId !== canonicalRevenueCatUserId) {
      owner.revenueCatUserId = canonicalRevenueCatUserId;
      await owner.save();
      console.log(`Backfilled revenueCatUserId for ${owner.email}: ${canonicalRevenueCatUserId}`);
    }

    let subscriptionUpdate = {};

    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'UNCANCELLATION':
        subscriptionUpdate = {
          'subscription.isActive': true,
          'subscription.planIdentifier': product_id,
          'subscription.expirationDate': new Date(expiration_at_ms),
          'subscription.originalTransactionId': original_transaction_id,
          'subscription.store': store
        };
        break;

      case 'CANCELLATION':
        // Keep access active until the expiration webhook arrives.
        console.log(`Subscription cancelled for user ${app_user_id}`);
        break;

      case 'EXPIRATION':
        subscriptionUpdate = {
          'subscription.isActive': false,
          'subscription.expirationDate': new Date(expiration_at_ms)
        };
        break;

      case 'BILLING_ISSUE':
        subscriptionUpdate = {
          'subscription.isActive': false
        };
        break;

      default:
        console.log(`Unhandled RevenueCat event type: ${type}`);
    }

    if (Object.keys(subscriptionUpdate).length > 0) {
      await Owner.findOneAndUpdate(
        { _id: owner._id },
        { $set: subscriptionUpdate }
      );
      console.log(`Updated subscription for ${owner.email}`, subscriptionUpdate);
    }

    if (eventId) {
      await RevenueCatWebhookEvent.create({
        eventId,
        eventType: type,
        appUserId: app_user_id
      });
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  handleRevenueCatWebhook
};
