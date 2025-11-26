const Owner = require('../Owner/Owner');

const handleRevenueCatWebhook = async (req, res) => {
  try {
    const { event, api_version } = req.body;
    const authHeader = req.headers.authorization;

    // 1. Security Check - Debug logging
    console.log('🔍 Authorization Debug:');
    console.log('Received header:', authHeader);
    console.log('Expected:', `Bearer ${process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN}`);
    console.log('Match:', authHeader === `Bearer ${process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN}`);

    if (!authHeader || authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN}`) {
      console.log('❌ Authorization failed');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('✅ Authorization successful');

    if (!event) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    const { type, app_user_id, product_id, expiration_at_ms, original_transaction_id, store } = event;

    // 2. Find Owner
    // RevenueCat sends UUID format, we need to find by revenueCatUserId field
    const owner = await Owner.findOne({ revenueCatUserId: app_user_id });
    if (!owner) {
      console.warn(`Owner not found for app_user_id: ${app_user_id}`);
      // Return 200 to acknowledge receipt even if user not found, to prevent retries
      return res.status(200).json({ message: 'Owner not found' });
    }

    console.log(`✅ Found owner: ${owner.email}`);

    // 3. Handle Events
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
        // Cancellation usually means "will not renew", but access might still be valid until expiration.
        // We might not want to set isActive: false immediately if expiration is in future.
        // However, for simplicity or if immediate revocation is needed:
        // RevenueCat sends EXPIRATION when access should actually end.
        // So for CANCELLATION, we might just update the status or do nothing if we rely on EXPIRATION.
        // But often we want to know it's cancelled.
        // Let's rely on EXPIRATION for access revocation, but we can log or update metadata if needed.
        // For now, we won't disable access on CANCELLATION, only on EXPIRATION.
        console.log(`Subscription cancelled for user ${app_user_id}`);
        break;

      case 'EXPIRATION':
        subscriptionUpdate = {
          'subscription.isActive': false,
          'subscription.expirationDate': new Date(expiration_at_ms) // Should be past
        };
        break;

      case 'BILLING_ISSUE':
        // Grace period logic could go here
        subscriptionUpdate = {
          'subscription.isActive': false
        };
        break;

      default:
        console.log(`Unhandled event type: ${type}`);
    }

    // 4. Update Owner
    if (Object.keys(subscriptionUpdate).length > 0) {
      await Owner.findOneAndUpdate(
        { revenueCatUserId: app_user_id },
        { $set: subscriptionUpdate }
      );
      console.log(`✅ Updated subscription for ${owner.email}:`, subscriptionUpdate);
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
